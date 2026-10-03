import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { useGLTF, useTexture } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import { FileLoader, Texture, TextureLoader, type WebGLRenderer } from 'three';
import { GROUND_TEXTURES } from '@/components/lobby/world/ground-textures';
import { CloudVolumeLoader, CLOUD_VOLUMES } from './cloud-volume-loader';
import { CARD_TEXTURE_PAIRS, isLobbyReleased, LOBBY_GLTF_URLS, LOBBY_TEXTURE_KEYS, onLobbyRelease, rearmLobbyAssets, releaseLobbyAssets } from './release-assets';
import { releaseUploadedBitmaps, uploadTextures } from './texture-upload-queue';
import { TerrainDataLoader } from './terrain-data-loader';
import { TERRAIN_DATA_URL } from './terrain-data-manifest';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [path] : [];
  });
}

test('every lobby asset literal in the source has a cache key to clear', () => {
  const cleared = new Set<string>([...LOBBY_GLTF_URLS, ...LOBBY_TEXTURE_KEYS.flat(), ...GROUND_TEXTURES]);
  const skip = /asset-versions\.ts|release-assets\.ts|ground-preview-manifest\.ts/;
  const missing: string[] = [];
  for (const file of [...sourceFiles('components/lobby'), ...sourceFiles('lib/lobby')]) {
    if (skip.test(file)) continue;
    for (const [url] of readFileSync(file, 'utf8').matchAll(/\/lobby\/(?:models|world|textures)\/[\w./-]+\.(?:glb|webp|jpg)/g)) {
      if (!cleared.has(url)) missing.push(`${file}: ${url}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('the card pairs match the decks that read them', () => {
  for (const [deck, [front, back]] of [['pokemon', CARD_TEXTURE_PAIRS[0]], ['yugioh', CARD_TEXTURE_PAIRS[1]]] as const) {
    const source = readFileSync(`components/lobby/objects/${deck}-deck.tsx`, 'utf8');
    assert.ok(source.includes(`heroFront: "${front}"`) && source.includes(`back: "${back}"`), deck);
  }
});

test('release clears exactly the entries the loaders created, and a replay reloads them', () => {
  const loads: string[] = [];
  const fileLoad = FileLoader.prototype.load;
  const textureLoad = TextureLoader.prototype.load;
  FileLoader.prototype.load = function (url: string) { loads.push(url); return undefined as never; };
  TextureLoader.prototype.load = function (url: string) { loads.push(url); return undefined as never; };
  const preloadAll = () => {
    for (const url of LOBBY_GLTF_URLS) useGLTF.preload(url);
    for (const key of LOBBY_TEXTURE_KEYS) useTexture.preload(key as string | string[]);
    useLoader.preload(TerrainDataLoader, TERRAIN_DATA_URL);
    useLoader.preload(CloudVolumeLoader, CLOUD_VOLUMES);
  };
  try {
    preloadAll();
    const first = loads.length;
    assert.ok(first > LOBBY_GLTF_URLS.length);
    preloadAll();
    assert.equal(loads.length, first, 'entries are cached before the release');

    let notified = 0;
    const off = onLobbyRelease(() => { notified++; });
    assert.equal(isLobbyReleased(), false);
    releaseLobbyAssets();
    releaseLobbyAssets();
    assert.equal(notified, 2);
    off();
    assert.equal(isLobbyReleased(), true);

    preloadAll();
    assert.equal(loads.length, first * 2, 'every entry was gone, so each reloads');
    rearmLobbyAssets();
    assert.equal(isLobbyReleased(), false);
  } finally {
    FileLoader.prototype.load = fileLoad;
    TextureLoader.prototype.load = textureLoad;
    releaseLobbyAssets();
  }
});

test('a replay that cancelled the release still clears scenes whose bitmaps were closed', async () => {
  const frames: FrameRequestCallback[] = [], previous = globalThis.requestAnimationFrame;
  class Bitmap { width = 2; height = 2; close() { this.width = this.height = 0; } }
  (globalThis as { ImageBitmap?: unknown }).ImageBitmap = Bitmap;
  globalThis.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
  try {
    let cleared = 0;
    const off = onLobbyRelease(() => { cleared++; });
    rearmLobbyAssets();
    assert.equal(cleared, 0, 'nothing closed: a replay keeps its warm caches');
    const renderer = { initTexture: () => {} } as unknown as WebGLRenderer, texture = new Texture(new Bitmap() as unknown as ImageBitmap);
    const job = uploadTextures(renderer, [texture], 0, () => false);
    while (frames.length) frames.shift()!(0);
    await job;
    releaseUploadedBitmaps(renderer, [texture], [texture]);
    rearmLobbyAssets();
    assert.equal(cleared, 1);
    rearmLobbyAssets();
    assert.equal(cleared, 1, 'cleared once, then warm again');
    assert.equal(isLobbyReleased(), false);
    off();
  } finally {
    globalThis.requestAnimationFrame = previous;
    delete (globalThis as { ImageBitmap?: unknown }).ImageBitmap;
  }
});
