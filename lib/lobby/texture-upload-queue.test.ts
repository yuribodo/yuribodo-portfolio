import assert from 'node:assert/strict';
import test from 'node:test';
import { Texture, type WebGLRenderer } from 'three';
import { uploadTextures } from './texture-upload-queue';

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
