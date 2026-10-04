import assert from 'node:assert/strict';
import test from 'node:test';
import { pulseArrival, registerPulseTarget, unregisterPulseTarget } from './pulse-registry';

test('arrival pulse walks the desk queue and skips anything not mounted', () => {
  const hit: string[] = [];
  for (const id of ['nintendo-ds', 'beyblade-pegasus', 'minato']) {
    registerPulseTarget(id, () => hit.push(id));
  }
  pulseArrival(0);
  pulseArrival(1);
  pulseArrival(2);
  pulseArrival(3);
  assert.deepEqual(hit, ['nintendo-ds', 'beyblade-pegasus', 'minato', 'nintendo-ds']);
  for (const id of ['nintendo-ds', 'beyblade-pegasus', 'minato']) unregisterPulseTarget(id);
});
