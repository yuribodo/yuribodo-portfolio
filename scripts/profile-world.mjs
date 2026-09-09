/** Local warm-frame diagnostic; not a universal FPS benchmark or GPU-memory test.
 * Run with the app serving and PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH if needed.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    args: ['--use-angle=gl', '--enable-gpu'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      const stats = { draws: 0, triangles: 0 };
      window.worldFrameStats = stats;
      for (const Context of [WebGLRenderingContext, WebGL2RenderingContext]) {
        for (const method of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
          const original = Context.prototype[method];
          if (!original) continue;
          Context.prototype[method] = function (...args) {
            stats.draws++;
            const indexed = method.includes('Elements'), instanced = method.includes('Instanced');
            const count = args[indexed ? 1 : 2], instances = instanced ? args[indexed ? 4 : 3] : 1;
            if (args[0] === this.TRIANGLES) stats.triangles += count / 3 * instances;
            return original.apply(this, args);
          };
        }
      }
    });
    await page.goto(process.env.WORLD_PROFILE_URL || 'http://localhost:3000', { waitUntil: 'networkidle', timeout: 120000 });
    await page.locator('[data-lobby-state=idle]').waitFor({ timeout: 90000 });
    await page.waitForTimeout(5000);
    const renderer = await page.evaluate(() => {
      const gl = document.querySelector('canvas').getContext('webgl2');
      const extension = gl.getExtension('WEBGL_debug_renderer_info');
      return extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : 'unavailable';
    });
    async function sample() {
      return page.evaluate(() => new Promise((resolve) => {
        const times = [], draws = [], triangles = [];
        let previous;
        function frame(time) {
          if (previous !== undefined) {
            times.push(time - previous);
            draws.push(window.worldFrameStats.draws);
            triangles.push(window.worldFrameStats.triangles);
          }
          previous = time;
          window.worldFrameStats.draws = window.worldFrameStats.triangles = 0;
          if (times.length < 180) return requestAnimationFrame(frame);
          const sorted = [...times].sort((a, b) => a - b);
          const mean = times.reduce((sum, value) => sum + value, 0) / times.length;
          resolve({ samples: times.length, meanFrameMs: mean, medianFrameMs: sorted[90], p95FrameMs: sorted[171],
            approximateRafFps: 1000 / mean,
            meanDrawCallsPerFrame: draws.reduce((a, b) => a + b, 0) / draws.length,
            meanSubmittedTrianglesPerFrame: triangles.reduce((a, b) => a + b, 0) / triangles.length });
        }
        requestAnimationFrame(frame);
      }));
    }
    const desk = await sample();
    await page.getByRole('button', { name: 'Look around', exact: true }).click();
    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Look right', exact: true }).click();
    await page.waitForTimeout(1500);
    const rear = await sample();
    const result = { capturedAt: new Date().toISOString(), url: page.url(), renderer, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1,
      caveat: 'Warm requestAnimationFrame cadence in a headless browser, 180 frames/view. Includes shadow-pass submissions; not GPU timer-query timings, VRAM measurement, cold-load or a universal FPS guarantee. Other desktop applications may be running.', desk, rear, errors };
    await fs.writeFile('docs/design/isekai-world/implementation/frame-profile.json', JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
    if (errors.length) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
