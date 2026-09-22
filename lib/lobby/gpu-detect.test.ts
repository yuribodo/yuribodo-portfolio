import assert from 'node:assert/strict';
import test from 'node:test';
import { lobbyBlockReasonFor, lobbyScaleForRenderer, type DeviceSignals } from './gpu-detect';

const capableDesktop: DeviceSignals = {
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/128 Safari/537.36',
  touchOnly: false, reducedMotion: false, saveData: false,
  effectiveType: '4g', deviceMemory: 8, hardwareConcurrency: 8,
};

test('a capable desktop gets the desk; Firefox/Safari without Chromium-only signals too', () => {
  assert.equal(lobbyBlockReasonFor(capableDesktop), null);
  assert.equal(lobbyBlockReasonFor({ ...capableDesktop, effectiveType: undefined, deviceMemory: undefined }), null);
});

test('integrated gpus keep the world and spend less on pixels and shadows', () => {
  assert.deepEqual(lobbyScaleForRenderer('angle (nvidia, nvidia geforce rtx 3050 laptop gpu direct3d11 vs_5_0 ps_5_0, d3d11)'), { maxDpr: 1.5, shadow: 2048 });
  assert.deepEqual(lobbyScaleForRenderer('angle (amd, amd radeon rx 6700 xt direct3d11 vs_5_0 ps_5_0, d3d11)'), { maxDpr: 1.5, shadow: 2048 });
  assert.deepEqual(lobbyScaleForRenderer('apple gpu'), { maxDpr: 1.5, shadow: 2048 });
  assert.deepEqual(lobbyScaleForRenderer('browser integration test'), { maxDpr: 1.5, shadow: 2048 });
  assert.deepEqual(lobbyScaleForRenderer('angle (intel, intel(r) iris(r) xe graphics direct3d11 vs_5_0 ps_5_0, d3d11)'), { maxDpr: 1, shadow: 1024 });
  assert.deepEqual(lobbyScaleForRenderer('angle (intel, intel(r) uhd graphics 620 direct3d11 vs_5_0 ps_5_0, d3d11)'), { maxDpr: 1, shadow: 1024 });
  assert.deepEqual(lobbyScaleForRenderer('angle (amd, amd radeon(tm) graphics direct3d11 vs_5_0 ps_5_0, d3d11)'), { maxDpr: 1, shadow: 1024 });
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
  ];
  for (const [override, expected] of cases) {
    assert.equal(lobbyBlockReasonFor({ ...capableDesktop, ...override }), expected, JSON.stringify(override));
  }
});
