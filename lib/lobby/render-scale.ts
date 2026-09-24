const MIN_SCALE = 0.75;
const SLOW_MS = 22;
const FAST_MS = 14;
const SLOW_FRAMES = 12;
const FAST_FRAMES = 45;
export const RENDER_SCALE_WARMUP_MS = 4000;

/** Fortnite-style screen percentage: drop after a run of slow frames, climb back when there's headroom.
 * Streaming spikes during warmup must not pull the scale down. */
export function nextRenderScale(current: number, max: number, frameMs: number, slow: number, fast: number, warming = false) {
  if (warming) return { scale: current, slow: 0, fast: 0 };
  let nextSlow = 0;
  let nextFast = 0;
  if (frameMs > SLOW_MS) nextSlow = slow + 1;
  else if (frameMs < FAST_MS) nextFast = fast + 1;
  let scale = current;
  if (nextSlow >= SLOW_FRAMES) {
    scale = Math.max(MIN_SCALE, Math.round((current - 0.15) * 20) / 20);
    nextSlow = 0;
  } else if (nextFast >= FAST_FRAMES) {
    scale = Math.min(max, Math.round((current + 0.1) * 20) / 20);
    nextFast = 0;
  }
  return { scale, slow: nextSlow, fast: nextFast };
}
