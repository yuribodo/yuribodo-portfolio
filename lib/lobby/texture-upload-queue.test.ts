import assert from 'node:assert/strict';
import test from 'node:test';
import { Texture, type WebGLRenderer } from 'three';
import { FAST_PRIORITY0_UPLOADS } from './upload-flags';
import { DESK_UPLOAD_BUDGET_MS, SCENERY_UPLOAD_BUDGET_MS, forgetClosedBitmaps, haveClosedBitmaps, releaseUploadedBitmaps, uploadTextures } from './texture-upload-queue';

test('shared upload queue prioritizes the desk and ignores cancelled mounts', async () => {
  const frames: FrameRequestCallback[] = [];
  const previous = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
  try {
    const seen: Texture[] = [], world = new Texture(), desk = new Texture(), stale = new Texture();
    const renderer = { initTexture: (texture: Texture) => seen.push(texture) } as unknown as WebGLRenderer;
    const jobs = [uploadTextures(renderer, [world], 1, () => false),
      uploadTextures(renderer, [stale], 0, () => true), uploadTextures(renderer, [desk], 0, () => false)];
    assert.equal(frames.length, 1, 'all groups share one scheduled frame');
    while (frames.length) frames.shift()!(0);
    await Promise.all(jobs);
    assert.deepEqual(seen, [desk, world]);
  } finally { globalThis.requestAnimationFrame = previous; }
});

test('one failed texture rejects its job without blocking other groups', async () => {
  const frames: FrameRequestCallback[] = [], previous = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
  try {
    const broken = new Texture(), good = new Texture(), seen: Texture[] = [];
    const renderer = { initTexture: (texture: Texture) => {
      if (texture === broken) throw new Error('upload failed');
      seen.push(texture);
    } } as unknown as WebGLRenderer;
    const failed = assert.rejects(uploadTextures(renderer, [broken], 0, () => false), /upload failed/);
    const completed = uploadTextures(renderer, [good], 1, () => false);
    while (frames.length) frames.shift()!(0);
    await Promise.all([failed, completed]);
    assert.deepEqual(seen, [good]);
  } finally { globalThis.requestAnimationFrame = previous; }
});

/** Stand-in for the browser's ImageBitmap: close() zeroes the size like the real one. */
class FakeBitmap {
  constructor(public width = 4, public height = 2) {}
  close() { this.width = this.height = 0; }
}

async function withBitmaps(run: (drain: () => void) => Promise<void>) {
  const frames: FrameRequestCallback[] = [], previous = globalThis.requestAnimationFrame;
  const hadBitmap = 'ImageBitmap' in globalThis;
  (globalThis as { ImageBitmap?: unknown }).ImageBitmap = FakeBitmap;
  globalThis.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
  try { await run(() => { while (frames.length) frames.shift()!(0); }); }
  finally {
    globalThis.requestAnimationFrame = previous;
    if (!hadBitmap) delete (globalThis as { ImageBitmap?: unknown }).ImageBitmap;
  }
}

const fakeRenderer = () => ({ initTexture: () => {} }) as unknown as WebGLRenderer;

test('a bitmap closes only after every Texture sharing its Source has uploaded', async () => {
  await withBitmaps(async drain => {
    const bitmap = new FakeBitmap(), renderer = fakeRenderer();
    const first = new Texture(bitmap as unknown as ImageBitmap), second = first.clone();
    assert.equal(second.source, first.source);
    const job = uploadTextures(renderer, [first], 0, () => false);
    drain(); await job;
    assert.equal(releaseUploadedBitmaps(renderer, [first], [first, second]), 0, 'the clone is still on the CPU side');
    assert.equal(bitmap.width, 4);
    const rest = uploadTextures(renderer, [second], 0, () => false);
    drain(); await rest;
    assert.equal(releaseUploadedBitmaps(renderer, [second], [first, second]), 4 * 2 * 4);
    assert.equal(bitmap.width, 0);
    assert.equal(haveClosedBitmaps(), true);
    assert.equal(releaseUploadedBitmaps(renderer, [first], [first, second]), 0, 'closing is not repeated');
    forgetClosedBitmaps();
  });
});

test('textures that are not decoded bitmaps are never touched', async () => {
  await withBitmaps(async drain => {
    const renderer = fakeRenderer(), canvas = { width: 8, height: 8, close() { throw new Error('closed'); } };
    const screen = new Texture(canvas as unknown as HTMLCanvasElement), loose = new Texture({ width: 4, height: 4 } as unknown as HTMLImageElement);
    const job = uploadTextures(renderer, [screen, loose], 0, () => false);
    drain(); await job;
    assert.equal(releaseUploadedBitmaps(renderer, [screen, loose], [screen, loose]), 0);
  });
});

test('a closed bitmap this renderer never uploaded rejects instead of rendering black', async () => {
  await withBitmaps(async drain => {
    const bitmap = new FakeBitmap(), texture = new Texture(bitmap as unknown as ImageBitmap);
    const old = fakeRenderer(), next = fakeRenderer();
    const first = uploadTextures(old, [texture], 0, () => false);
    drain(); await first;
    releaseUploadedBitmaps(old, [texture], [texture]);
    const again = uploadTextures(old, [texture], 0, () => false);
    drain(); await again;
    const replay = assert.rejects(uploadTextures(next, [texture], 0, () => false), /released before this renderer/);
    drain(); await replay;
    forgetClosedBitmaps();
  });
});

/** A clock where every upload costs `cost` ms; ticks are driven by hand so the scheduler used shows in `frames` / `timers`. */
async function withClock(cost: number, run: (clock: { frames: FrameRequestCallback[]; timers: (() => void)[]; renderer: WebGLRenderer; seen: Texture[]; now: () => number }) => Promise<void>) {
  const frames: FrameRequestCallback[] = [], timers: (() => void)[] = [], seen: Texture[] = [];
  const raf = globalThis.requestAnimationFrame, timeout = globalThis.setTimeout, now = performance.now;
  let time = 0;
  globalThis.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
  globalThis.setTimeout = ((callback: () => void) => { timers.push(callback); return timers.length; }) as unknown as typeof setTimeout;
  performance.now = () => time;
  const renderer = { initTexture: (texture: Texture) => { time += cost; seen.push(texture); } } as unknown as WebGLRenderer;
  try { await run({ frames, timers, renderer, seen, now: () => time }); }
  finally { globalThis.requestAnimationFrame = raf; globalThis.setTimeout = timeout; performance.now = now; }
}

/** The budgets and macrotask continuation only exist while FAST_PRIORITY0_UPLOADS is on. */
const whenFast = { skip: !FAST_PRIORITY0_UPLOADS };
const textures = (count: number) => Array.from({ length: count }, () => new Texture());

test('desk uploads fill a long budget per tick and continue on a macrotask, not the next frame', whenFast, async () => {
  await withClock(10, async ({ frames, timers, renderer, seen }) => {
    const desk = textures(7), job = uploadTextures(renderer, desk, 0, () => false);
    frames.shift()!(0);
    assert.equal(seen.length, Math.ceil(DESK_UPLOAD_BUDGET_MS / 10), 'a whole budget of uploads in one tick');
    assert.equal(frames.length, 0, 'no animation frame is waited for');
    assert.equal(timers.length, 1);
    while (timers.length) timers.shift()!();
    await job;
    assert.deepEqual(seen, desk, 'in order');
  });
});

test('scenery uploads keep a slice of a frame and wait for the next frame', whenFast, async () => {
  await withClock(10, async ({ frames, timers, renderer, seen }) => {
    const job = uploadTextures(renderer, textures(3), 1, () => false);
    frames.shift()!(0);
    assert.equal(seen.length, 1, 'one upload already exceeds the budget');
    assert.ok(SCENERY_UPLOAD_BUDGET_MS < 10);
    assert.equal(timers.length, 0);
    assert.equal(frames.length, 1);
    while (frames.length) frames.shift()!(0);
    await job;
    assert.equal(seen.length, 3);
  });
});

test('the desk drains first, then the scenery drops back to the small budget and the frame clock', whenFast, async () => {
  await withClock(5, async ({ frames, timers, renderer, seen }) => {
    const [desk, world] = [textures(2), textures(4)];
    const jobs = [uploadTextures(renderer, world, 1, () => false), uploadTextures(renderer, desk, 0, () => false)];
    frames.shift()!(0);
    assert.deepEqual(seen.slice(0, 2), desk);
    assert.equal(seen.length, 3, 'the desk, then one scenery upload that already exceeds the 6 ms slice');
    assert.equal(timers.length, 0, 'the head of the queue is scenery now');
    assert.equal(frames.length, 1);
    while (frames.length) frames.shift()!(0);
    await Promise.all(jobs);
    assert.deepEqual(seen.slice(2), world);
  });
});

test('scenery never overtakes a desk job that arrives later, and a cancelled desk job uploads nothing', whenFast, async () => {
  await withClock(10, async ({ frames, timers, renderer, seen }) => {
    const world = textures(2), late = textures(1), dropped = textures(1);
    const jobs = [uploadTextures(renderer, world, 1, () => false)];
    frames.shift()!(0);
    assert.equal(seen.length, 1);
    jobs.push(uploadTextures(renderer, late, 0, () => false), uploadTextures(renderer, dropped, 0, () => true));
    assert.equal(frames.length, 1, 'still the one scheduled frame');
    frames.shift()!(0);
    assert.deepEqual(seen.slice(1), [late[0], world[1]]);
    while (frames.length || timers.length) { frames.shift()?.(0); timers.shift()?.(); }
    await Promise.all(jobs);
    assert.equal(seen.includes(dropped[0]), false);
  });
});
