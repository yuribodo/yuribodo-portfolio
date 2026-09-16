import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { generateTerrainData } from './terrain-bake';
import { packTerrainData, unpackTerrainData } from './terrain-data-format';
import { TERRAIN_DATA_URL } from './terrain-data-manifest';

test('shipped terrain preserves every authored Float32 height and mask byte', () => {
  const expected = packTerrainData(generateTerrainData());
  const shipped = gunzipSync(readFileSync(`public${TERRAIN_DATA_URL}`));
  assert.deepEqual(new Uint8Array(shipped), expected);
  const decoded = unpackTerrainData(expected.buffer as ArrayBuffer);
  assert.deepEqual(packTerrainData(decoded), expected);
});

test('terrain loader rejects truncated and incompatible payloads', () => {
  assert.throws(() => unpackTerrainData(new ArrayBuffer(4)), /Truncated/);
  assert.throws(() => unpackTerrainData(new ArrayBuffer(20)), /Invalid/);
  const data = packTerrainData({ near: new Float32Array([1]), far: new Float32Array([2]), canopy: new Uint8Array(4), trails: new Uint8Array(4) });
  assert.throws(() => unpackTerrainData(data.buffer.slice(0, data.byteLength - 1) as ArrayBuffer), /Invalid/);
});
