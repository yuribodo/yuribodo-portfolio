import assert from 'node:assert/strict';
import test from 'node:test';
import { nextRenderScale } from './render-scale';

test('a run of slow frames steps the scale down and resets the counter', () => {
  const stepped = nextRenderScale(1.5, 1.5, 28, 11, 0);
  assert.equal(stepped.scale, 1.35);
  assert.equal(stepped.slow, 0);
});

test('headroom climbs back toward the cap and never past it', () => {
  const climbed = nextRenderScale(1.4, 1.5, 10, 0, 44);
  assert.equal(climbed.scale, 1.5);
  const capped = nextRenderScale(1.5, 1.5, 10, 0, 44);
  assert.equal(capped.scale, 1.5);
});

test('one hitch does not change the scale, and the floor is 0.75', () => {
  assert.equal(nextRenderScale(1.5, 1.5, 40, 0, 0).scale, 1.5);
  assert.equal(nextRenderScale(0.8, 1.5, 30, 11, 0).scale, 0.75);
});

test('warmup holds the scale through a run of slow frames', () => {
  const held = nextRenderScale(1.5, 1.5, 40, 11, 0, true);
  assert.equal(held.scale, 1.5);
  assert.equal(held.slow, 0);
});
