import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GROUND_MAPS, GROUND_MAPS_1K, halve, linearToSrgb8 } from '../../scripts/shrink-ground-maps.mjs';

/** 2x2 pixels, 3 channels, row-major. */
const quad = (...px: number[][]) => Buffer.from(px.flat());

describe('shrink-ground-maps', () => {
  it('ships the 1K maps by default and keeps the sRGB flag aligned with ground-textures (even slots)', () => {
    assert.equal(GROUND_MAPS_1K, true);
    assert.deepEqual(GROUND_MAPS.map(row => row.slice(0, 2)), [['rock-face-detail', true], ['rock-face-normal', false]]);
  });

  it('averages colour data in linear light, not in sRGB', () => {
    const { data, width, height } = halve(quad([0, 0, 0], [255, 255, 255], [0, 0, 0], [255, 255, 255]), 2, 2, 3, true);
    assert.equal(width, 1);
    assert.equal(height, 1);
    assert.equal(data[0], linearToSrgb8(0.5));
    assert.equal(data[0], 188);
    assert.notEqual(data[0], 128);
  });

  it('averages data maps plainly, per channel, without renormalising', () => {
    const { data } = halve(quad([128, 128, 255], [255, 128, 255], [1, 128, 255], [128, 128, 253]), 2, 2, 3, false);
    assert.deepEqual([...data], [128, 128, 255]);
  });

  it('keeps flat colour exact through the linear round trip', () => {
    for (const v of [0, 1, 7, 64, 127, 128, 200, 255]) assert.equal(halve(quad([v, v, v], [v, v, v], [v, v, v], [v, v, v]), 2, 2, 3, true).data[1], v);
  });

  it('leaves a fourth alpha channel on the plain average', () => {
    const px = [[10, 10, 10, 0], [10, 10, 10, 255], [10, 10, 10, 0], [10, 10, 10, 255]];
    const { data } = halve(Buffer.from(px.flat()), 2, 2, 4, true);
    assert.equal(data[3], 128);
    assert.equal(data[0], 10);
  });

  it('halves each 2x2 block of a larger image independently', () => {
    const src = Buffer.from([0, 0, 100, 100, 4, 4, 8, 8].flatMap(v => [v, v, v]));
    const { data, width, height } = halve(src, 4, 2, 3, false);
    assert.deepEqual([width, height], [2, 1]);
    assert.deepEqual([...data], [2, 2, 2, 54, 54, 54]);
  });

  it('rejects odd sizes instead of silently dropping a texel row', () => {
    assert.throws(() => halve(Buffer.alloc(9), 3, 1, 3, false), /even/);
  });
});
