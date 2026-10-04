const MIN_SCALE = 0.75;
const STEP_DOWN = 0.15;
const STEP_UP = 0.1;
const WINDOW_FRAMES = 60;
/** Fraction of slow frames in one window that demotes. A 16.7/33.3 ms vsync mix is 50% slow. */
const DROP_RATIO = 0.5;
/** Right after a climb the bar is lower, so a climb that cost frames is undone quickly. */
const PROBATION_DROP_RATIO = 0.2;
const PROBATION_MS = 6000;
const BACKOFF_WINDOW_MS = 20000;
const CLEAN_RATIO = 0.95;
const CLIMB_AFTER_MS = 8000;
const MAX_BACKOFF_STEPS = 3;
/** The drawing buffer was just reallocated; its first frames say nothing about the new load. */
const SETTLE_MS = 400;
const MAX_FRAME_MS = 250;
/** How long one streaming episode may suppress sampling before a steady 17-20 ms device is judged anyway. */
const MAX_SOFT_HOLD_MS = 10000;
const SLOW_FACTOR = 1.35;
const FAST_FACTOR = 1.15;
const SNAP_TOLERANCE = 0.06;
/** Frame deltas quantise to whole vsyncs, so the interval is snapped, never taken as a raw minimum. */
const REFRESH_HZ = [240, 165, 144, 120, 90, 75, 60] as const;
const BASE_REFRESH_MS = 1000 / 60;
export const RENDER_SCALE_WARMUP_MS = 4000;

/** `hard` never samples. `soft` (the valley still streaming in) stops sampling only up to MAX_SOFT_HOLD_MS. */
export type GovernorHold = "none" | "soft" | "hard";

export interface Governor {
  max: number;
  floor: number;
  scale: number;
  refreshMs: number;
  frames: number[];
  heldMs: number;
  settleMs: number;
  sinceChangeMs: number;
  cleanMs: number;
  lastChange: "none" | "up" | "down";
  failures: number;
}

const roundScale = (value: number) => Math.round(value * 20) / 20;

export function createGovernor(max: number): Governor {
  return {
    max,
    floor: Math.min(MIN_SCALE, max),
    scale: max,
    refreshMs: BASE_REFRESH_MS,
    frames: [],
    heldMs: 0,
    settleMs: 0,
    sinceChangeMs: 0,
    cleanMs: 0,
    lastChange: "none",
    failures: 0,
  };
}

/** The drawing buffer is rebuilt at the ceiling (resize, DPR change); sampling starts over. */
export function resetGovernor(governor: Governor, max: number): void {
  Object.assign(governor, createGovernor(max), { refreshMs: governor.refreshMs });
}

/** Native pixels, never more than the tier allows. A DPR-1 display does not pay for a 1.5x supersample. */
export function nativeCeiling(maxDpr: number, devicePixelRatio: number): number {
  const native = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.min(native, maxDpr);
}

/** Snap the fast end of a window to a known refresh interval; null when it matches none (GPU-bound or odd rate). */
export function snapRefreshMs(sampleMs: number): number | null {
  for (const hz of REFRESH_HZ) {
    const interval = 1000 / hz;
    if (Math.abs(sampleMs - interval) <= interval * SNAP_TOLERANCE) return interval;
  }
  return null;
}

function climbAfterMs(governor: Governor): number {
  return CLIMB_AFTER_MS * 2 ** Math.min(governor.failures, MAX_BACKOFF_STEPS);
}

function applyChange(governor: Governor, scale: number, direction: "up" | "down"): number {
  governor.scale = scale;
  governor.lastChange = direction;
  governor.sinceChangeMs = 0;
  governor.cleanMs = 0;
  governor.settleMs = SETTLE_MS;
  return scale;
}

function judgeWindow(governor: Governor): number | null {
  const frames = governor.frames;
  const sorted = [...frames].sort((a, b) => a - b);
  const snapped = snapRefreshMs(sorted[Math.floor(sorted.length * 0.1)]);
  if (snapped !== null) governor.refreshMs = snapped;
  // High refresh rates do not raise the demotion bar: 100 fps on a 144 Hz panel is healthy.
  const slowMs = SLOW_FACTOR * Math.max(governor.refreshMs, BASE_REFRESH_MS);
  const fastMs = FAST_FACTOR * governor.refreshMs;
  let slow = 0;
  let fast = 0;
  let windowMs = 0;
  for (const ms of frames) {
    windowMs += ms;
    if (ms > slowMs) slow++;
    else if (ms <= fastMs) fast++;
  }
  frames.length = 0;
  governor.sinceChangeMs += windowMs;
  const probation = governor.lastChange === "up" && governor.sinceChangeMs < PROBATION_MS;
  const dropRatio = probation ? PROBATION_DROP_RATIO : DROP_RATIO;
  if (slow / WINDOW_FRAMES >= dropRatio) {
    governor.cleanMs = 0;
    if (governor.scale <= governor.floor) return null;
    if (governor.lastChange === "up" && governor.sinceChangeMs < BACKOFF_WINDOW_MS) {
      governor.failures = Math.min(governor.failures + 1, MAX_BACKOFF_STEPS);
    }
    return applyChange(governor, Math.max(governor.floor, roundScale(governor.scale - STEP_DOWN)), "down");
  }
  if (fast / WINDOW_FRAMES < CLEAN_RATIO) {
    governor.cleanMs = 0;
    return null;
  }
  governor.cleanMs += windowMs;
  if (governor.scale >= governor.max || governor.cleanMs < climbAfterMs(governor)) return null;
  const climbed = applyChange(governor, Math.min(governor.max, roundScale(governor.scale + STEP_UP)), "up");
  if (climbed >= governor.max) governor.failures = 0;
  return climbed;
}

/** Feed one frame. Returns the new scale when it should be applied, otherwise null.
 * Windowed rather than consecutive-frame counting (vsync quantisation breaks streaks), with a refresh-relative
 * "clean" bar so a locked 60 Hz can climb, an 8 s climb cooldown that doubles after each climb that had to be undone,
 * and a settle gap after every step because each one reallocates the MSAA buffer. */
export function stepGovernor(governor: Governor, frameMs: number, hold: GovernorHold): number | null {
  const ms = Math.min(frameMs, MAX_FRAME_MS);
  if (hold === "none") governor.heldMs = 0;
  else {
    if (hold === "soft") governor.heldMs += ms;
    if (hold === "hard" || governor.heldMs < MAX_SOFT_HOLD_MS) {
      governor.frames.length = 0;
      return null;
    }
  }
  if (governor.settleMs > 0) {
    governor.settleMs -= ms;
    return null;
  }
  governor.frames.push(ms);
  if (governor.frames.length < WINDOW_FRAMES) return null;
  return judgeWindow(governor);
}
