import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createGovernor,
  nativeCeiling,
  resetGovernor,
  snapRefreshMs,
  stepGovernor,
  type Governor,
  type GovernorHold,
} from './render-scale';

const WINDOW = 60;

/** Feed frames until `ms` of frame time has elapsed; returns every scale change in order. */
function run(governor: Governor, frameMs: number, seconds: number, hold: GovernorHold = 'none'): number[] {
  const changes: number[] = [];
  for (let elapsed = 0; elapsed < seconds * 1000; elapsed += frameMs) {
    const next = stepGovernor(governor, frameMs, hold);
    if (next !== null) changes.push(next);
  }
  return changes;
}

/** Feed an exact number of frames. */
function frames(governor: Governor, frameMs: number, count: number, hold: GovernorHold = 'none'): number[] {
  const changes: number[] = [];
  for (let frame = 0; frame < count; frame++) {
    const next = stepGovernor(governor, frameMs, hold);
    if (next !== null) changes.push(next);
  }
  return changes;
}

/** One whole window of 25 ms frames, after discarding any partial window left by the previous stream. */
function slowWindow(governor: Governor): number[] {
  stepGovernor(governor, 16.7, 'hard');
  return frames(governor, 25, WINDOW);
}

/** A GPU-bound vsync stream: mostly one interval with a missed vsync every `period` frames. */
function runMissing(governor: Governor, intervalMs: number, period: number, seconds: number): number[] {
  const changes: number[] = [];
  let frame = 0;
  for (let elapsed = 0; elapsed < seconds * 1000; frame++) {
    const ms = frame % period === 0 ? intervalMs * 2 : intervalMs;
    elapsed += ms;
    const next = stepGovernor(governor, ms, 'none');
    if (next !== null) changes.push(next);
  }
  return changes;
}

test('a sustained 25 ms stream steps down from 1.5 to the 0.75 floor and stops', () => {
  const governor = createGovernor(1.5);
  const changes = run(governor, 25, 20);
  assert.deepEqual(changes, [1.35, 1.2, 1.05, 0.9, 0.75]);
  assert.equal(governor.scale, 0.75);
});

test('a single drop needs a whole window, not a short streak', () => {
  const governor = createGovernor(1.5);
  assert.deepEqual(run(governor, 25, (WINDOW - 1) * 0.025), []);
  assert.deepEqual(run(governor, 25, 0.025), [1.35]);
});

test('one hitch inside an otherwise smooth window does not demote', () => {
  const governor = createGovernor(1.5);
  const changes: number[] = [];
  for (let frame = 0; frame < WINDOW * 5; frame++) {
    const next = stepGovernor(governor, frame % 30 === 0 ? 80 : 16.7, 'none');
    if (next !== null) changes.push(next);
  }
  assert.deepEqual(changes, []);
});

test('the floor stays 0.75 on HIGH, and a 1.0 ceiling descends 1 -> 0.85 -> 0.75', () => {
  assert.equal(createGovernor(1.5).floor, 0.75);
  assert.deepEqual(run(createGovernor(1), 28, 20), [0.85, 0.75]);
});

test('16.7 ms frames can climb back after a drop on a 60 Hz display', () => {
  const governor = createGovernor(1.5);
  assert.deepEqual(frames(governor, 25, WINDOW), [1.35]);
  assert.deepEqual(run(governor, 16.7, 12), [1.45]);
});

test('a vsync-locked 60 Hz stream at max never changes', () => {
  assert.deepEqual(run(createGovernor(1.5), 16.7, 60), []);
});

test('the climb waits at least 8 s of clean frames after any change', () => {
  const governor = createGovernor(1.5);
  frames(governor, 28, WINDOW);
  assert.equal(governor.scale, 1.35);
  assert.deepEqual(run(governor, 16.7, 7), []);
  assert.deepEqual(run(governor, 16.7, 2), [1.45]);
});

test('an unclean window resets the clean timer', () => {
  const governor = createGovernor(1.5);
  frames(governor, 28, WINDOW);
  run(governor, 16.7, 6);
  run(governor, 21, 2);
  assert.deepEqual(run(governor, 16.7, 7), []);
  assert.deepEqual(run(governor, 16.7, 3), [1.45]);
});

test('a missed vsync every 5th frame (about 20 ms mean) neither drops nor climbs', () => {
  const governor = createGovernor(1.5);
  governor.scale = 1.2;
  assert.deepEqual(runMissing(governor, 16.7, 5, 40), []);
  assert.equal(governor.scale, 1.2);
});

test('a 16.7/33.3 ms alternating stream drops', () => {
  const governor = createGovernor(1.5);
  assert.deepEqual(runMissing(governor, 16.7, 2, 3), [1.35]);
});

test('120 Hz: 8.3 ms frames climb, 25 ms frames drop, 12 ms frames (83 fps) hold', () => {
  const climbing = createGovernor(1.5);
  climbing.scale = 1.2;
  assert.deepEqual(run(climbing, 8.33, 10), [1.3]);
  assert.equal(climbing.refreshMs, 1000 / 120);
  assert.deepEqual(run(createGovernor(1.5), 25, 3), [1.35]);
  const holding = createGovernor(1.5);
  holding.scale = 1.2;
  holding.refreshMs = 1000 / 120;
  assert.deepEqual(run(holding, 12, 30), []);
});

test('144 Hz: 6.9 ms frames climb, and 100 fps does not read as slow', () => {
  const governor = createGovernor(1.5);
  governor.scale = 1.2;
  assert.deepEqual(run(governor, 6.94, 10), [1.3]);
  assert.equal(governor.refreshMs, 1000 / 144);
  assert.deepEqual(run(governor, 10, 10), []);
});

test('a drop right after a climb backs the next climb off, doubling each time', () => {
  const governor = createGovernor(1.5);
  governor.scale = 1.2;
  assert.deepEqual(run(governor, 16.7, 9), [1.3]);
  // The climb cost frames: quick revert, failure recorded.
  assert.deepEqual(slowWindow(governor), [1.15]);
  assert.equal(governor.failures, 1);
  assert.deepEqual(run(governor, 16.7, 15), []);
  assert.deepEqual(run(governor, 16.7, 2), [1.25]);
  assert.deepEqual(slowWindow(governor), [1.1]);
  assert.equal(governor.failures, 2);
  assert.deepEqual(run(governor, 16.7, 30), []);
  assert.deepEqual(run(governor, 16.7, 4), [1.2]);
});

test('probation: a climb that leaves one frame in four missing is reverted', () => {
  const governor = createGovernor(1.5);
  governor.scale = 1.2;
  run(governor, 16.7, 9);
  assert.equal(governor.scale, 1.3);
  assert.deepEqual(runMissing(governor, 16.7, 4, 3), [1.15]);
});

test('a drop long after a climb is not counted as a failed climb', () => {
  const governor = createGovernor(1.5);
  governor.scale = 1.2;
  assert.deepEqual(run(governor, 16.7, 9), [1.3]);
  // 12% missed vsyncs: not clean enough to climb, not slow enough to demote.
  assert.deepEqual(runMissing(governor, 16.7, 8, 25), []);
  assert.deepEqual(slowWindow(governor), [1.15]);
  assert.equal(governor.failures, 0);
});

test('reaching the ceiling clears the back-off', () => {
  const governor = createGovernor(1.5);
  governor.scale = 1.4;
  governor.failures = 2;
  governor.lastChange = 'down';
  assert.deepEqual(run(governor, 16.7, 40), [1.5]);
  assert.equal(governor.failures, 0);
});

test('never climbs past the ceiling', () => {
  const governor = createGovernor(1);
  assert.deepEqual(run(governor, 8, 40), []);
});

test('hard hold discards frames and never samples, even for a long run', () => {
  const governor = createGovernor(1.5);
  assert.deepEqual(run(governor, 40, 60, 'hard'), []);
  assert.equal(governor.scale, 1.5);
});

test('soft hold suppresses sampling until its max-wait, then a slow device is judged', () => {
  const governor = createGovernor(1.5);
  assert.deepEqual(run(governor, 28, 9.5, 'soft'), []);
  assert.deepEqual(frames(governor, 28, WINDOW + 22, 'soft'), [1.35]);
});

test('the soft hold budget restarts after a clear stretch', () => {
  const governor = createGovernor(1.5);
  run(governor, 28, 9, 'soft');
  run(governor, 16.7, 1, 'none');
  assert.deepEqual(run(governor, 28, 9, 'soft'), []);
});

test('a hold clears a partial window so streaming frames never leak into the verdict', () => {
  const governor = createGovernor(1.5);
  run(governor, 40, 1.5);
  run(governor, 16.7, 0.2, 'hard');
  assert.deepEqual(run(governor, 16.7, 5), []);
  assert.equal(governor.scale, 1.5);
});

test('the frames right after a step are ignored while the buffer settles', () => {
  const governor = createGovernor(1.5);
  run(governor, 25, 1.6);
  assert.equal(governor.scale, 1.35);
  // 400 ms of settle swallows ~16 frames, so 44 more slow frames cannot complete a window.
  assert.deepEqual(run(governor, 25, 44 * 0.025), []);
});

test('an absurd frame time is clamped, so a tab resume spike is one slow frame', () => {
  const governor = createGovernor(1.5);
  const changes: number[] = [];
  for (let frame = 0; frame < WINDOW * 3; frame++) {
    const next = stepGovernor(governor, frame === 10 ? 60000 : 16.7, 'none');
    if (next !== null) changes.push(next);
  }
  assert.deepEqual(changes, []);
});

test('resetGovernor restores the ceiling and keeps the learned refresh interval', () => {
  const governor = createGovernor(1.5);
  run(governor, 8.33, 3);
  run(governor, 25, 3);
  resetGovernor(governor, 1);
  assert.equal(governor.scale, 1);
  assert.equal(governor.max, 1);
  assert.equal(governor.failures, 0);
  assert.equal(governor.refreshMs, 1000 / 120);
});

test('refresh snapping accepts known rates with jitter and rejects everything else', () => {
  assert.equal(snapRefreshMs(16.6), 1000 / 60);
  assert.equal(snapRefreshMs(16.9), 1000 / 60);
  assert.equal(snapRefreshMs(8.4), 1000 / 120);
  assert.equal(snapRefreshMs(6.9), 1000 / 144);
  assert.equal(snapRefreshMs(25), null);
  assert.equal(snapRefreshMs(33.3), null);
  assert.equal(snapRefreshMs(20), null);
});

test('native ceiling: DPR-1 displays render native, Retina keeps the tier cap, bad values fall back to 1', () => {
  assert.equal(nativeCeiling(1.5, 1), 1);
  assert.equal(nativeCeiling(1.5, 2), 1.5);
  assert.equal(nativeCeiling(1.5, 1.25), 1.25);
  assert.equal(nativeCeiling(1, 2), 1);
  assert.equal(nativeCeiling(1.5, 0.75), 0.75);
  assert.equal(nativeCeiling(1.5, 0), 1);
  assert.equal(nativeCeiling(1.5, Number.NaN), 1);
});

test('a ceiling below the floor (zoomed-out page) never steps below the ceiling', () => {
  const governor = createGovernor(0.6);
  assert.equal(governor.floor, 0.6);
  assert.deepEqual(run(governor, 30, 10), []);
});
