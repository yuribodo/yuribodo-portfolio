import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BAYER_4X4,
  DITHER_SPACE_FROM,
  DITHER_SPACE_TO,
  SCREEN_CANVAS_WIDTH,
  SCREEN_FRAGMENT,
  ditherPixelWeight,
  ditherStrengthFor,
  textAlphaFor,
  texelsPerPixel,
} from './screen-paint';

test('the Bayer table is a permutation of 0..15', () => {
  assert.deepEqual([...BAYER_4X4].sort((a, b) => a - b), Array.from({ length: 16 }, (_, i) => i));
});

test('the shader is generated from the same table and blend edges', () => {
  assert.ok(SCREEN_FRAGMENT.includes(`float[16](${BAYER_4X4.map(v => `${v}.0`).join(', ')})`));
  assert.ok(SCREEN_FRAGMENT.includes(`smoothstep(${DITHER_SPACE_FROM.toFixed(1)}, ${DITHER_SPACE_TO.toFixed(1)}, texelsPerPixel)`));
});

test('texels per pixel falls as the screen grows on the display', () => {
  assert.equal(texelsPerPixel(SCREEN_CANVAS_WIDTH), 1);
  assert.equal(texelsPerPixel(SCREEN_CANVAS_WIDTH / 4), 4);
  assert.ok(texelsPerPixel(1440) < 1);
});

test('grain follows canvas texels when magnified and render pixels when minified', () => {
  assert.equal(ditherPixelWeight(0.2), 0);
  assert.equal(ditherPixelWeight(DITHER_SPACE_FROM), 0);
  assert.equal(ditherPixelWeight(DITHER_SPACE_TO), 1);
  assert.equal(ditherPixelWeight(8), 1);
});

test('the grain handoff is monotonic across the dive', () => {
  let previous = -1;
  for (let ratio = 0.5; ratio <= 2; ratio += 0.05) {
    const weight = ditherPixelWeight(ratio);
    assert.ok(weight >= previous, `weight dropped at ${ratio}`);
    previous = weight;
  }
});

test('the monitor at rest on common displays uses render-pixel grain', () => {
  // ~232 css px wide at DPR 1, the render ceiling is 1.5 so up to ~348 px.
  for (const pixelWidth of [232, 348, 464]) assert.equal(ditherPixelWeight(texelsPerPixel(pixelWidth)) > 0.5, true, `${pixelWidth}px`);
});

test('dither resolves toward Hero and the preview text dissolves late in the dive', () => {
  assert.equal(ditherStrengthFor('idle', 0.9), ditherStrengthFor('idle', 0));
  assert.ok(ditherStrengthFor('diving', 1) < ditherStrengthFor('diving', 0));
  assert.equal(textAlphaFor('idle', 0.9), 1);
  assert.equal(textAlphaFor('diving', 0.5), 1);
  assert.equal(textAlphaFor('diving', 1), 0);
});
