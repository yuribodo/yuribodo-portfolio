import assert from 'node:assert/strict';
import test from 'node:test';
import { CONTEXT_GRACE_MS, contextLossDelay } from './context-loss';

test('a lost context gets the grace period while every bitmap is still open', () => {
  assert.equal(contextLossDelay(false), CONTEXT_GRACE_MS);
});

test('a lost context skips at once after bitmaps were closed', () => {
  assert.equal(contextLossDelay(true), 0);
});
