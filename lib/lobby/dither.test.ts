import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createDither } from './dither';

test('lookup dithering matches the original Canvas byte output at every input value', () => {
  const dither = createDither();
  const bayer = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  for (const strength of [.4, .55, .78, 1, 0, .5537, .55]) {
    const data = new Uint8ClampedArray(256 * 4 * 4);
    const expected = new Uint8ClampedArray(data.length);
    const divisor = Math.max(2, Math.round(2 + (1 - strength) * 14)) - 1;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 256; x++) {
      const i = (y * 256 + x) * 4;
      for (let c = 0; c < 3; c++) {
        data[i+c] = (x + c * 37) % 256;
        expected[i+c] = Math.floor(data[i+c] / 255 * divisor + bayer[y*4+x%4] / 16 * strength) / divisor * 255;
      }
      data[i+3] = expected[i+3] = x;
    }
    dither(data, 256, 4, strength);
    assert.deepEqual(data, expected);
  }
});
