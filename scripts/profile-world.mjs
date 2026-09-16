/** Cold browser load + warm-frame diagnostic; not a universal FPS benchmark or VRAM test.
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
    const started = Date.now();
    const responses = [];
    page.on('response', response => { if(response.url().includes('/lobby/')) responses.push({url: new URL(response.url()).pathname, bytes: Number(response.headers()['content-length'] || 0)}); });
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      window.loadStats = {longTasks: []};
      new PerformanceObserver(list => list.getEntries().forEach(e => window.loadStats.longTasks.push({start: e.startTime, duration: e.duration}))).observe({type: 'longtask', buffered: true});
      const observer = new MutationObserver(() => { if (!window.loadStats.idleMs && document.querySelector('[data-lobby-state=idle]')) window.loadStats.idleMs = performance.now(); });
      observer.observe(document, {subtree:true, childList:true, attributes:true, attributeFilter:['data-lobby-state']});
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
    const session = process.env.WORLD_CPU_PROFILE || process.env.WORLD_NETWORK_MBPS ? await page.context().newCDPSession(page) : null;
    if (process.env.WORLD_NETWORK_MBPS) {
      await session.send('Network.enable');
      await session.send('Network.emulateNetworkConditions', {offline:false, latency:40, downloadThroughput:Number(process.env.WORLD_NETWORK_MBPS)*1e6/8, uploadThroughput:1e6/8});
    }
    if (process.env.WORLD_CPU_PROFILE) { await session.send('Profiler.enable'); await session.send('Profiler.start'); }
    await page.goto(process.env.WORLD_PROFILE_URL || 'http://localhost:3000', { waitUntil: 'networkidle', timeout: 120000 });
    await page.locator('[data-lobby-state=idle]').waitFor({ timeout: 90000 });
    if (process.env.WORLD_CPU_PROFILE) {
      const {profile} = await session.send('Profiler.stop');
      await fs.writeFile(process.env.WORLD_CPU_PROFILE, JSON.stringify(profile));
    }
    await page.waitForTimeout(20000);
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
    const loading = await page.evaluate(() => ({...window.loadStats, heapUsedBytes: performance.memory?.usedJSHeapSize, resources: performance.getEntriesByType('resource').filter(r=>r.name.includes('/lobby/')).map(r=>({url: new URL(r.name).pathname, bytes: r.decodedBodySize, durationMs:r.duration, startMs:r.startTime, endMs:r.responseEnd}))}));
    const screenshot = process.env.WORLD_PROFILE_SCREENSHOT;
    if (screenshot) await page.screenshot({path:screenshot});
    const result = { capturedAt: new Date().toISOString(), url: page.url(), renderer, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, networkMbps: Number(process.env.WORLD_NETWORK_MBPS) || null,
      caveat: 'Warm requestAnimationFrame cadence in a headless browser, 180 frames/view. Includes shadow-pass submissions; not GPU timer-query timings, VRAM measurement or a universal FPS guarantee. Cold load uses a fresh browser context; OS and GPU-driver caches may be warm. Heap is a browser estimate. Other desktop applications may be running.', desk, loading, responses, elapsedMs: Date.now()-started, errors };
    await fs.writeFile(process.env.WORLD_PROFILE_OUTPUT || 'docs/design/isekai-world/implementation/frame-profile.json', JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
    if (errors.length) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
