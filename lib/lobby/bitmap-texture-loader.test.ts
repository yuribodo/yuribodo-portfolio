import assert from 'node:assert/strict';
import test from 'node:test';
import { LoadingManager, Texture, TextureLoader, type WebGLRenderer } from 'three';
import { releaseLobbyAssets } from './release-assets';
import { releaseUploadedBitmaps, uploadTextures } from './texture-upload-queue';
import { BITMAP_TEXTURES } from './upload-flags';
import { closeBitmapTextures, installBitmapTextureLoader, isBitmapTextureUrl, isLoaderBitmap, supportsBitmapTextures, uninstallBitmapTextureLoader } from './bitmap-texture-loader';

class FakeBitmap {
  closed = false;
  constructor(public width = 4, public height = 2) {}
  close() { this.closed = true; this.width = this.height = 0; }
}

type Options = { imageOrientation: string; premultiplyAlpha: string; colorSpaceConversion: string };
const globals = globalThis as Record<string, unknown>;
/** With BITMAP_TEXTURES off the installer is a no-op, so there is nothing to exercise. */
const whenOn = { skip: !BITMAP_TEXTURES };

/** Browser stand-ins: the page is http://lobby.test/, fetch answers from `files`, createImageBitmap records its options. */
async function withBrowser(files: Record<string, boolean>, run: (env: { decoded: Options[]; fetched: string[]; bitmaps: FakeBitmap[] }) => Promise<void>) {
  const saved = ['window', 'location', 'fetch', 'createImageBitmap', 'ImageBitmap'].map(key => [key, globals[key]] as const);
  const env = { decoded: [] as Options[], fetched: [] as string[], bitmaps: [] as FakeBitmap[] };
  globals.window = globals;
  globals.location = { href: 'http://lobby.test/' };
  globals.ImageBitmap = FakeBitmap;
  globals.fetch = async (url: string) => { env.fetched.push(url); return { ok: files[url] === true, status: files[url] === undefined ? 404 : 200, blob: async () => ({}) }; };
  globals.createImageBitmap = async (_blob: unknown, options: Options) => { env.decoded.push(options); const bitmap = new FakeBitmap(); env.bitmaps.push(bitmap); return bitmap; };
  try { await run(env); }
  finally { for (const [key, value] of saved) { if (value === undefined) delete globals[key]; else globals[key] = value; } }
}

const loadWith = (loader: TextureLoader, url: string) => new Promise<Texture>((resolve, reject) => { loader.load(url, resolve, undefined, reject); });

test('engines that ignore imageOrientation keep the stock loader', () => {
  const chrome = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
  const safari = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
  const withBitmap = globals.createImageBitmap;
  globals.createImageBitmap = () => undefined;
  try {
    assert.equal(supportsBitmapTextures(chrome), true);
    assert.equal(supportsBitmapTextures(safari), false);
    assert.equal(supportsBitmapTextures('Mozilla/5.0 (X11; Linux x86_64; rv:97.0) Gecko/20100101 Firefox/97.0'), false);
    assert.equal(supportsBitmapTextures('Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0'), true);
    delete globals.createImageBitmap;
    assert.equal(supportsBitmapTextures(chrome), false);
  } finally { if (withBitmap) globals.createImageBitmap = withBitmap; }
});

test('only same-origin still images are decoded as bitmaps', () => {
  const page = 'http://lobby.test/';
  assert.equal(isBitmapTextureUrl('/lobby/world/limestone.webp?v=0123456789abcdef', page), true);
  assert.equal(isBitmapTextureUrl('http://lobby.test/a.JPG', page), true);
  assert.equal(isBitmapTextureUrl('https://cdn.test/a.webp', page), false);
  assert.equal(isBitmapTextureUrl('data:image/png;base64,AAAA', page), false);
  assert.equal(isBitmapTextureUrl('blob:http://lobby.test/1', page), false);
  assert.equal(isBitmapTextureUrl('/lobby/baked/terrain.bin', page), false);
  assert.equal(isBitmapTextureUrl('/lobby/world/env.exr', page), false);
});

test('install is idempotent, uninstall restores the stock loader', whenOn, async () => {
  await withBrowser({}, async () => {
    const stock = TextureLoader.prototype.load;
    assert.equal(installBitmapTextureLoader(), true);
    const patched = TextureLoader.prototype.load;
    assert.notEqual(patched, stock);
    assert.equal(installBitmapTextureLoader(), true);
    assert.equal(TextureLoader.prototype.load, patched, 'a second install does not wrap again');
    uninstallBitmapTextureLoader();
    assert.equal(TextureLoader.prototype.load, stock);
  });
});

test('a bitmap texture is pre-flipped, unflipped on upload, and balances the loading manager', whenOn, async () => {
  await withBrowser({ '/lobby/a.webp?v=1': true }, async ({ decoded, fetched, bitmaps }) => {
    installBitmapTextureLoader();
    try {
      const manager = new LoadingManager(), events: string[] = [];
      manager.onStart = () => events.push('start'); manager.onLoad = () => events.push('load');
      manager.setURLModifier(url => `${url}?v=1`);
      const texture = await loadWith(new TextureLoader(manager), '/lobby/a.webp');
      assert.deepEqual(fetched, ['/lobby/a.webp?v=1'], 'the versioned URL the browser already caches');
      assert.deepEqual(decoded, [{ imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' }]);
      assert.equal(texture.image, bitmaps[0]);
      assert.equal(texture.flipY, false);
      assert.ok(texture.version > 0, 'queued for upload');
      assert.equal(isLoaderBitmap(bitmaps[0] as unknown as ImageBitmap), true);
      assert.deepEqual(events, ['start', 'load']);
    } finally { uninstallBitmapTextureLoader(); closeBitmapTextures(); }
  });
});

test('a texture that opted out of flipping or asked for premultiplied alpha is decoded accordingly', whenOn, async () => {
  await withBrowser({ '/lobby/a.webp': true }, async ({ decoded }) => {
    installBitmapTextureLoader();
    try {
      // load() returns the Texture synchronously, so a caller can still set options on it before the decode.
      const texture = await new Promise<Texture>(resolve => {
        const returned = new TextureLoader().load('/lobby/a.webp', resolve);
        returned.flipY = false; returned.premultiplyAlpha = true;
      });
      assert.deepEqual(decoded, [{ imageOrientation: 'none', premultiplyAlpha: 'premultiply', colorSpaceConversion: 'none' }]);
      assert.equal(texture.flipY, false);
    } finally { uninstallBitmapTextureLoader(); closeBitmapTextures(); }
  });
});

test('any failure falls back to the stock loader into the same Texture', whenOn, async () => {
  await withBrowser({}, async ({ bitmaps }) => {
    const stock = TextureLoader.prototype.load, image = { width: 3, height: 3 } as unknown as HTMLImageElement;
    const stockCalls: string[] = [];
    TextureLoader.prototype.load = function (this: TextureLoader, url: string, onLoad?: (texture: Texture) => void) {
      stockCalls.push(url);
      const texture = new Texture(); texture.image = image; onLoad?.(texture); return texture;
    } as typeof TextureLoader.prototype.load;
    installBitmapTextureLoader();
    try {
      const manager = new LoadingManager(), events: string[] = [];
      manager.onLoad = () => events.push('load');
      const returned = new TextureLoader(manager).load('/lobby/missing.webp', texture => { assert.equal(texture, returned); });
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.deepEqual(stockCalls, ['/lobby/missing.webp']);
      assert.equal(returned.image, image);
      assert.equal(returned.flipY, true, 'the stock path still flips on upload');
      assert.equal(bitmaps.length, 0);
      // data: URLs never leave the stock path
      new TextureLoader().load('data:image/png;base64,AAAA');
      assert.equal(stockCalls.length, 2);
    } finally { uninstallBitmapTextureLoader(); TextureLoader.prototype.load = stock; }
  });
});

test('closeBitmapTextures closes what the loader decoded, once', whenOn, async () => {
  await withBrowser({ '/lobby/a.webp': true, '/lobby/b.webp': true }, async ({ bitmaps }) => {
    installBitmapTextureLoader();
    try {
      await Promise.all([loadWith(new TextureLoader(), '/lobby/a.webp'), loadWith(new TextureLoader(), '/lobby/b.webp')]);
      assert.equal(bitmaps.length, 2);
      closeBitmapTextures();
      assert.deepEqual(bitmaps.map(bitmap => bitmap.closed), [true, true]);
      assert.equal(isLoaderBitmap(bitmaps[0] as unknown as ImageBitmap), false);
    } finally { uninstallBitmapTextureLoader(); }
  });
});

test('loose bitmaps survive their upload (later consumers still clone the shared Source) and close with the lobby', whenOn, async () => {
  await withBrowser({ '/lobby/a.webp': true }, async ({ bitmaps }) => {
    installBitmapTextureLoader();
    const frames: FrameRequestCallback[] = [], raf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
    try {
      const source = await loadWith(new TextureLoader(), '/lobby/a.webp'), clone = source.clone();
      const renderer = { initTexture: () => {} } as unknown as WebGLRenderer;
      const job = uploadTextures(renderer, [clone], 0, () => false);
      while (frames.length) frames.shift()!(0);
      await job;
      assert.equal(releaseUploadedBitmaps(renderer, [clone], [source, clone]), 0);
      assert.equal(bitmaps[0].closed, false);
      const again = source.clone();
      assert.equal(again.image, bitmaps[0], 'a consumer that mounts later still gets pixels');
      releaseLobbyAssets();
      assert.equal(bitmaps[0].closed, true);
    } finally { globalThis.requestAnimationFrame = raf; uninstallBitmapTextureLoader(); closeBitmapTextures(); }
  });
});
