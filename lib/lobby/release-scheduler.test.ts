import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { Texture, type WebGLRenderer } from 'three';
import { createReleaseScheduler, type ReleaseApi } from './release-scheduler';
import { forgetClosedBitmaps, haveClosedBitmaps, releaseUploadedBitmaps, uploadTextures } from './texture-upload-queue';

const DELAY = 1500;
const flush = () => new Promise<void>(resolve => setImmediate(resolve));

function fakeApi() {
  const calls: string[] = [];
  const api: ReleaseApi = { releaseLobbyAssets: () => { calls.push('release'); }, rearmLobbyAssets: () => { calls.push('rearm'); } };
  let loads = 0;
  return { api, calls, load: () => { loads++; return Promise.resolve(api); }, loads: () => loads };
}

/** Closes one bitmap the way PreparedGroup does, so haveClosedBitmaps() turns true. */
async function closeABitmap() {
  const frames: FrameRequestCallback[] = [], previous = globalThis.requestAnimationFrame;
  class Bitmap { width = 2; height = 2; close() { this.width = this.height = 0; } }
  (globalThis as { ImageBitmap?: unknown }).ImageBitmap = Bitmap;
  globalThis.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
  try {
    const renderer = { initTexture: () => {} } as unknown as WebGLRenderer, texture = new Texture(new Bitmap() as unknown as ImageBitmap);
    const job = uploadTextures(renderer, [texture], 0, () => false);
    while (frames.length) frames.shift()!(0);
    await job;
    releaseUploadedBitmaps(renderer, [texture], [texture]);
  } finally {
    globalThis.requestAnimationFrame = previous;
    delete (globalThis as { ImageBitmap?: unknown }).ImageBitmap;
  }
}

test('the release lands only after the teardown delay', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const { calls, load, loads } = fakeApi();
    createReleaseScheduler(load, DELAY).schedule();
    mock.timers.tick(DELAY - 1);
    await flush();
    assert.equal(loads(), 0, 'nothing is imported before the timer');
    mock.timers.tick(1);
    await flush();
    assert.deepEqual(calls, ['release']);
  } finally { mock.timers.reset(); }
});

test('a replay inside the delay cancels the release, and rearms at once when bitmaps are closed', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  forgetClosedBitmaps();
  try {
    const { calls, load, loads } = fakeApi();
    const scheduler = createReleaseScheduler(load, DELAY);
    scheduler.schedule();
    scheduler.cancel();
    await flush();
    assert.equal(loads(), 0, 'warm caches: a replay with nothing closed loads nothing');
    scheduler.schedule();
    await closeABitmap();
    assert.equal(haveClosedBitmaps(), true);
    mock.timers.tick(DELAY - 10);
    scheduler.cancel();
    await flush();
    assert.deepEqual(calls, ['rearm'], 'the module was never loaded by the timer, yet the closed scenes are cleared');
    mock.timers.tick(DELAY * 2);
    await flush();
    assert.deepEqual(calls, ['rearm'], 'the cancelled release never fires');
  } finally { mock.timers.reset(); forgetClosedBitmaps(); }
});

test('once the module is loaded a replay rearms synchronously, and a stale load cannot release', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const { calls, load } = fakeApi();
    const scheduler = createReleaseScheduler(load, DELAY);
    scheduler.schedule();
    mock.timers.tick(DELAY);
    await flush();
    assert.deepEqual(calls, ['release']);
    scheduler.cancel();
    assert.deepEqual(calls, ['release', 'rearm'], 'no await between cancel and the rearm');

    let resolveLoad: (api: ReleaseApi) => void = () => {};
    const slow = fakeApi();
    const late = createReleaseScheduler(() => new Promise<ReleaseApi>(resolve => { resolveLoad = resolve; }), DELAY);
    late.schedule();
    mock.timers.tick(DELAY);
    late.cancel();
    resolveLoad(slow.api);
    await flush();
    assert.deepEqual(slow.calls, [], 'the load that was in flight when the replay arrived is dropped');
  } finally { mock.timers.reset(); }
});
