/** Loading investigation, not a benchmark of GPU execution time.
 * AUDIT_URL=http://localhost:3004 AUDIT_OUTPUT=/tmp/loading-audit node scripts/audit-lobby-loading.mjs
 * AUDIT_CASES=cold,repeat,cold-2,world-held,network-20,network-20-world-held
 * Optional AUDIT_CPU_PROFILE=1 captures V8 samples (adds measurement overhead).
 * World-held cases are isolation experiments: they deliberately omit scenery
 * until desk readiness, then release every request. They are not a proposed UX.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const output = process.env.AUDIT_OUTPUT || '/tmp/loading-audit';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args: ['--use-angle=gl', '--enable-gpu'],
});
const cases = (process.env.AUDIT_CASES || 'cold,repeat,cold-2,world-held,network-20,network-20-world-held').split(',');
let context;
try {
  for (const name of cases) {
    if (name !== 'repeat' || !context) {
      await context?.close();
      context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    }
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    const requests = new Map(), errors = [], held = new Set();
    let releaseWorld = false;
    await session.send('Network.enable');
    session.on('Network.requestWillBeSent', e => requests.set(e.requestId, {
      url: e.request.url, type: e.type, priority: e.request.initialPriority,
      initiator: e.initiator.type, initiatorUrl: e.initiator.stack?.callFrames?.[0]?.url,
      timestamp: e.timestamp,
    }));
    session.on('Network.responseReceived', e => Object.assign(requests.get(e.requestId) || {}, {
      status: e.response.status, fromDiskCache: e.response.fromDiskCache,
      protocol: e.response.protocol, mimeType: e.response.mimeType,
      cacheControl: e.response.headers['Cache-Control'] || e.response.headers['cache-control'],
      timing: e.response.timing,
    }));
    session.on('Network.responseReceivedExtraInfo', e => {
      const request = requests.get(e.requestId);
      if (request) request.wireStatus = e.statusCode;
    });
    session.on('Network.requestServedFromCache', e => { const r = requests.get(e.requestId); if (r) r.servedFromCache = true; });
    session.on('Network.loadingFinished', e => Object.assign(requests.get(e.requestId) || {}, {
      encodedDataLength: e.encodedDataLength, endTimestamp: e.timestamp,
    }));
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
    if (name.includes('network-20')) await session.send('Network.emulateNetworkConditions', {
      offline: false, latency: 40, downloadThroughput: 20e6 / 8, uploadThroughput: 1e6 / 8,
    });
    if (name.includes('cpu-4')) await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    if (name.includes('world-held')) {
      await session.send('Fetch.enable', { patterns: [{ urlPattern: '*/lobby/world/*', requestStage: 'Request' }] });
      session.on('Fetch.requestPaused', async e => {
        if (!releaseWorld) held.add(e.requestId);
        else await session.send('Fetch.continueRequest', { requestId: e.requestId }).catch(() => {});
      });
    }
    await page.addInitScript(() => {
      performance.setResourceTimingBufferSize(2000);
      const a = window.__loadingAudit = { marks: {}, longTasks: [], gl: {}, bitmaps: [], contexts: [] };
      const observer = new MutationObserver(() => {
        const lobby = document.querySelector('[data-lobby-state]');
        if (lobby && !a.marks.sceneMounted) a.marks.sceneMounted = performance.now();
        if (lobby?.dataset.lobbyState === 'idle' && !a.marks.idle) a.marks.idle = performance.now();
        if (document.querySelector('[data-lobby-loading]') && !a.marks.loader) a.marks.loader = performance.now();
      });
      observer.observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-lobby-state'] });
      new PerformanceObserver(list => {
        for (const e of list.getEntries()) a.longTasks.push({ start: e.startTime, duration: e.duration });
      }).observe({ type: 'longtask', buffered: true });
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (...args) {
        const start = performance.now(), result = getContext.apply(this, args);
        if (String(args[0]).startsWith('webgl')) a.contexts.push({ start, duration: performance.now() - start, type: args[0] });
        return result;
      };
      const createBitmap = window.createImageBitmap;
      window.createImageBitmap = async function (...args) {
        const start = performance.now(), result = await createBitmap.apply(this, args);
        a.bitmaps.push({ start, end: performance.now(), width: result.width, height: result.height });
        return result;
      };
      // CPU wall time inside API calls; never equate this with GPU duration.
      for (const Context of [WebGLRenderingContext, WebGL2RenderingContext]) {
        for (const method of ['texImage2D', 'texSubImage2D', 'texImage3D', 'texSubImage3D', 'generateMipmap',
          'bufferData', 'compileShader', 'linkProgram', 'getProgramParameter', 'getProgramInfoLog', 'getShaderInfoLog']) {
          const original = Context.prototype[method];
          if (!original) continue;
          Context.prototype[method] = function (...args) {
            if (a.marks.idle) return original.apply(this, args);
            const start = performance.now();
            const result = original.apply(this, args);
            const elapsed = performance.now() - start;
            const stat = a.gl[method] ||= { count: 0, totalMs: 0, maxMs: 0 };
            stat.count++; stat.totalMs += elapsed; stat.maxMs = Math.max(stat.maxMs, elapsed);
            return result;
          };
        }
      }
    });
    if (process.env.AUDIT_CPU_PROFILE) {
      await session.send('Profiler.enable');
      await session.send('Profiler.start');
    }
    let outcome = 'ready';
    try {
      await page.goto(process.env.AUDIT_URL || 'http://localhost:3004', { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.locator('[data-lobby-state=idle]').waitFor({ timeout: 35000 });
      if (process.env.AUDIT_SCREENSHOTS) await page.screenshot({ path: path.join(output, `${name}-ready.png`) });
    } catch (e) { outcome = `not ready: ${e.message.split('\n')[0]}`; }
    if (process.env.AUDIT_CPU_PROFILE) {
      const { profile } = await session.send('Profiler.stop');
      await fs.writeFile(path.join(output, `${name}.cpuprofile`), JSON.stringify(profile));
    }
    const heldCount = held.size;
    releaseWorld = true;
    await Promise.all([...held].map(requestId => session.send('Fetch.continueRequest', { requestId })));
    await page.waitForTimeout(6000);
    if (process.env.AUDIT_SCREENSHOTS) await page.screenshot({ path: path.join(output, `${name}-settled.png`) });
    const result = await page.evaluate(() => {
      const data = window.__loadingAudit;
      const gl = document.querySelector('[data-lobby-active] canvas')?.getContext('webgl2');
      const ext = gl?.getExtension('WEBGL_debug_renderer_info');
      return { ...data, observedAtMs: performance.now(),
        finalLobbyState: document.querySelector('[data-lobby-state]')?.dataset.lobbyState ?? 'absent',
        renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null,
        parallelShaderCompile: !!gl?.getExtension('KHR_parallel_shader_compile'),
        navigation: performance.getEntriesByType('navigation').map(e => e.toJSON()),
        paints: performance.getEntriesByType('paint').map(e => e.toJSON()),
        resources: performance.getEntriesByType('resource').filter(e => e.name.startsWith(location.origin)).map(e => e.toJSON()),
      };
    });
    const documentRequest = [...requests.values()].find(r => r.type === 'Document');
    const network = [...requests.values()].filter(r => /^https?:/.test(r.url)).map(r => ({ ...r,
      startMs: (r.timestamp - documentRequest.timestamp) * 1000,
      endMs: r.endTimestamp ? (r.endTimestamp - documentRequest.timestamp) * 1000 : null,
    }));
    const report = { name, capturedAt: new Date().toISOString(), outcome, heldCount,
      cpuProfile: !!process.env.AUDIT_CPU_PROFILE, ...result, network, errors };
    await fs.writeFile(path.join(output, `${name}.json`), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ name, outcome, marks: report.marks,
      longTaskMsBeforeIdle: report.marks.idle ? report.longTasks.filter(t => t.start < report.marks.idle).reduce((n, t) => n + t.duration, 0) : null,
      heldCount, errors }));
    await page.close();
  }
} finally { await context?.close(); await browser.close(); }
