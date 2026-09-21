import assert from 'node:assert/strict';
import test from 'node:test';
import { hasRecentLowFps, lobbyBlockReasonFor, LOW_FPS_TTL_MS, type DeviceSignals } from './gpu-detect';

const capableDesktop: DeviceSignals = {
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/128 Safari/537.36',
  touchOnly: false, reducedMotion: false, saveData: false,
  effectiveType: '4g', deviceMemory: 8, hardwareConcurrency: 8, hadLowFps: false,
};

test('a capable desktop gets the desk; Firefox/Safari without Chromium-only signals too', () => {
  assert.equal(lobbyBlockReasonFor(capableDesktop), null);
  assert.equal(lobbyBlockReasonFor({ ...capableDesktop, effectiveType: undefined, deviceMemory: undefined }), null);
});

test('a low-fps record expires after the TTL and ignores garbage', () => {
  const now = 1_800_000_000_000;
  assert.equal(hasRecentLowFps(String(now - 60_000), now), true);
  assert.equal(hasRecentLowFps(String(now - LOW_FPS_TTL_MS - 1), now), false);
  for (const stale of [null, '', 'true', 'NaN', '0']) assert.equal(hasRecentLowFps(stale, now), false, String(stale));
});

test('each weak-device signal lands on the portfolio directly', () => {
  const cases: [Partial<DeviceSignals>, string][] = [
    [{ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1' }, 'mobile'],
    [{ userAgent: 'Mozilla/5.0 (iPad; CPU OS 12_0 like Mac OS X) Safari/604.1' }, 'mobile'],
    [{ touchOnly: true }, 'touch-only'],
    [{ reducedMotion: true }, 'reduced-motion'],
    [{ saveData: true }, 'save-data'],
    [{ effectiveType: '3g' }, 'slow-network'],
    [{ deviceMemory: 2 }, 'low-memory'],
    [{ hardwareConcurrency: 2 }, 'low-cpu'],
    [{ hadLowFps: true }, 'previous-low-fps'],
  ];
  for (const [override, expected] of cases) {
    assert.equal(lobbyBlockReasonFor({ ...capableDesktop, ...override }), expected, JSON.stringify(override));
  }
});
