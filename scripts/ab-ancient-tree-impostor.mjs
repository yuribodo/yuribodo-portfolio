/** Measures the ancient-tree impostor against the full mesh, trees alone, same frame, pointer and clock, and prints the colorGain to set.
 *
 * Needs two builds of the lobby: MESH_URL with ANCIENT_TREE_IMPOSTOR = false and CARD_URL with it true.
 *   MESH_URL=http://localhost:3108/ CARD_URL=http://localhost:3109/ node scripts/ab-ancient-tree-impostor.mjs
 * The valley behind the trees, the buttress roots and the fog are left out, so the numbers are the crowns' own: coverage (sum of alpha),
 * alpha-weighted mean colour, silhouette overlap. AB_WRITE=1 multiplies each tree's colorGain in lib/lobby/ancient-tree-impostor.json by
 * the mesh/card colour ratio (re-run until the ratios read 1.000), AB_TIME is the frozen world clock (default 37, full sun on both crowns),
 * AB_OUT keeps the isolated frames as PNGs, AB_MESH_INIT is a script run before the mesh page loads (one build with a runtime switch can serve both).
 */
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');
const sharp = createRequire(require.resolve('next/package.json'))('sharp');
const META = 'lib/lobby/ancient-tree-impostor.json';
const TIME = Number(process.env.AB_TIME || 37);
const W = 1440, H = 900;

async function isolate(url, init) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable', args: ['--use-angle=gl', '--enable-gpu'] });
    try {
      const page = await (await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage();
      await page.addInitScript(() => {
        window.__renderers = []; window.__scenes = [];
        const t = new EventTarget(); t.addEventListener('observe', e => { const d = e.detail; if (d && d.isScene) window.__scenes.push(d); else if (d && d.info && d.render) window.__renderers.push(d); }); window.__THREE_DEVTOOLS__ = t;
      });
      if (init) await page.addInitScript(init);
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-lobby-state=idle]').waitFor({ timeout: 90000 });
      await page.waitForTimeout(18000);
      const boxes = await page.evaluate(time => {
        const R = window.__renderers[0];
        if (R.getContext().isContextLost()) return null;
        const S = window.__scenes.map(s => { let n = 0; s.traverse(() => n++); return [n, s]; }).sort((a, b) => b[0] - a[0])[0][1];
        R.setPixelRatio(1); R.setPixelRatio = () => {};
        const seen = new Set(); S.traverse(o => { if (!o.isMesh) return; for (const m of [].concat(o.material)) { const u = R.properties.get(m).uniforms; const t = u && u.outdoorTime; if (t && !seen.has(t)) { seen.add(t); Object.defineProperty(t, 'value', { get: () => time, set() {} }); } } });
        const grove = S.getObjectByName('ancient-jura-grove'), keep = new Set(); grove.traverse(o => keep.add(o));
        S.traverse(o => { if ((o.isMesh || o.isPoints || o.isLine || o.isSprite) && (!keep.has(o) || (!o.isInstancedMesh && o.name !== 'ancient-tree-impostor'))) o.visible = false; });
        S.fog = null; window.__S = S;
        // Where each tree sits on screen, from the card or the crown's own bounds.
        const cam = S.getObjectByProperty('isPerspectiveCamera', true); cam.updateMatrixWorld(true);
        const V3 = cam.position.constructor, out = [];
        const leaves = []; grove.traverse(o => { if (o.isInstancedMesh && /leaves/.test(o.material.name)) leaves.push(o); });
        const mesh = leaves[0];
        const origins = mesh ? Array.from({ length: mesh.count }, (_, i) => { const m = new cam.matrixWorld.constructor(); mesh.getMatrixAt(i, m); return new V3().setFromMatrixPosition(m); }) : [];
        for (const o of origins) { const q = o.clone().project(cam); out.push([q.x * 720 + 720, 450 - q.y * 450]); }
        return out;
      }, TIME);
      if (!boxes) throw new Error('context lost');
      await page.mouse.move(720, 450); await page.waitForTimeout(2500);
      const shots = {};
      for (const [name, color] of [['black', '#000000'], ['white', '#ffffff']]) {
        await page.evaluate(c => { const S = window.__S; window.__bg ??= S.background; S.background = new window.__bg.constructor(c); }, color);
        await page.waitForTimeout(800);
        shots[name] = await sharp(await page.screenshot()).removeAlpha().raw().toBuffer();
      }
      await browser.close();
      return { shots, origins: boxes };
    } catch (e) { console.error('attempt failed:', String(e).slice(0, 100)); await browser.close().catch(() => {}); }
  }
  throw new Error(`no healthy scene at ${url}`);
}

function matte({ shots }) {
  const n = W * H, alpha = new Float32Array(n), colour = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const o = i * 3, a = 1 - ((shots.white[o] - shots.black[o]) + (shots.white[o + 1] - shots.black[o + 1]) + (shots.white[o + 2] - shots.black[o + 2])) / 765;
    alpha[i] = Math.max(0, Math.min(1, a)); for (let c = 0; c < 3; c++) colour[o + c] = shots.black[o + c];
  }
  return { alpha, colour };
}

const mesh = await isolate(process.env.MESH_URL || 'http://localhost:3108/', process.env.AB_MESH_INIT), card = await isolate(process.env.CARD_URL || 'http://localhost:3109/');
if (process.env.AB_OUT) { await fs.mkdir(process.env.AB_OUT, { recursive: true }); for (const [name, r] of [['mesh', mesh], ['card', card]]) for (const bg of ['black', 'white']) await sharp(r.shots[bg], { raw: { width: W, height: H, channels: 3 } }).png().toFile(`${process.env.AB_OUT}/${name}-${bg}.png`); }
const A = matte(mesh), B = matte(card), meta = JSON.parse(await fs.readFile(META, 'utf8'));
// Each tree owns the pixels within 180 px of its root and nearer to it than to the other's (the page's own overlays sit farther out).
const owner = (x, y) => mesh.origins.reduce((best, [ox, oy], k) => (Math.hypot(x - ox, y - oy) < best[0] ? [Math.hypot(x - ox, y - oy), k] : best), [180, -1])[1];
const rows = mesh.origins.map(() => ({ aA: 0, aB: 0, inter: 0, union: 0, cA: [0, 0, 0], cB: [0, 0, 0], wA: 0, wB: 0 }));
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x, a = A.alpha[i], b = B.alpha[i]; if (a < 0.02 && b < 0.02) continue;
  const who = owner(x, y); if (who < 0) continue;
  const r = rows[who]; r.aA += a; r.aB += b; r.inter += Math.min(a, b); r.union += Math.max(a, b);
  if (a > 0.05) { r.wA += a; for (let c = 0; c < 3; c++) r.cA[c] += A.colour[i * 3 + c]; }
  if (b > 0.05) { r.wB += b; for (let c = 0; c < 3; c++) r.cB[c] += B.colour[i * 3 + c]; }
}
rows.forEach((r, k) => {
  const mA = r.cA.map(v => v / r.wA), mB = r.cB.map(v => v / r.wB), ratio = mA.map((v, c) => v / mB[c]);
  console.log(`tree ${k}: coverage mesh ${r.aA.toFixed(0)} card ${r.aB.toFixed(0)} (${(100 * (r.aB / r.aA - 1)).toFixed(2)}%)  silhouette IoU ${(r.inter / r.union).toFixed(4)}  mean colour mesh ${mA.map(v => v.toFixed(1))} card ${mB.map(v => v.toFixed(1))}  mesh/card ${ratio.map(v => v.toFixed(3))}`);
  const next = meta.trees[k].colorGain.map((g, c) => +(g * ratio[c]).toFixed(3));
  console.log(`        colorGain ${meta.trees[k].colorGain} -> ${next}`);
  if (process.env.AB_WRITE) meta.trees[k].colorGain = next;
});
if (process.env.AB_WRITE) { await fs.writeFile(META, JSON.stringify(meta, null, 1) + '\n'); console.log(`wrote ${META}`); }
