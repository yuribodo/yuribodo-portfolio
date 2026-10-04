/** Bakes the two ancient-tree crowns into view-exact impostor images, from the live lobby scene.
 *
 * The images are rendered by the real AncientTrees meshes, materials and lights (leaf pigment, wind, sun, environment) through the seated
 * desk camera's own pinhole onto the vertical plane square to each tree's line of sight, so the baked pixels are what the full geometry draws
 * from there. The camera moves 6 cm against 550-760 m, so one view per tree is exact. Fog is left to the card shader. Three passes per tree:
 *   sun    cloudVisibility forced to 1; straight-alpha coverage from a black/white matte
 *   shade  cloudVisibility forced to 0.38 (full cloud); its alpha channel carries the depth pass instead of coverage
 *   depth  each pixel's distance behind the card plane, so the card's cloud lookup and fog see the crown's real shape
 * Pixels stay display-encoded (post tone mapping) and are sampled raw by the card.
 *
 * Needs a build whose ancient trees are still the full mesh (ANCIENT_TREE_IMPOSTOR = false in lib/lobby/fantasy-landmarks.ts):
 *   pnpm exec next build && pnpm exec next start -p 3108
 *   BAKE_URL=http://localhost:3108/ node scripts/bake-ancient-tree-impostor.mjs
 * A blank bake (the GPU lost its context) is refused: run it again. It writes
 * public/lobby/world/ancient-tree-<n>-{sun,shade}.webp and lib/lobby/ancient-tree-impostor.json with colorGain reset to 1; then
 *   pnpm assets:version
 *   node scripts/ab-ancient-tree-impostor.mjs     (measures the card against the mesh and prints the colorGain to set)
 */
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');
const sharp = createRequire(require.resolve('next/package.json'))('sharp');
const URL_ = process.env.BAKE_URL || 'http://localhost:3108/';
const OUT = process.env.BAKE_OUT || 'public/lobby/world';
const META = process.env.BAKE_META || 'lib/lobby/ancient-tree-impostor.json';
const RAW = process.env.BAKE_RAW; // optional dir to keep the straight-alpha PNGs
const SS = Number(process.env.BAKE_SS || 1), DENSITY = Number(process.env.BAKE_DENSITY || 3.5), QUALITY = Number(process.env.BAKE_QUALITY || 90);
const CLOUDS = { sun: 1, shade: 0.38 };
const WIND_TIME = Number(process.env.BAKE_TIME || 37);

const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable', args: ['--use-angle=gl', '--enable-gpu'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.addInitScript(() => {
  window.__renderers = []; window.__scenes = [];
  const t = new EventTarget(); t.addEventListener('observe', e => { const d = e.detail; if (d && d.isScene) window.__scenes.push(d); else if (d && d.info && d.render) window.__renderers.push(d); }); window.__THREE_DEVTOOLS__ = t;
});
page.on('console', m => { if (m.type() === 'error' || /Context Lost|Shader Error/.test(m.text())) console.error('page:', m.text().slice(0, 400)); });
await page.goto(URL_, { waitUntil: 'domcontentloaded' });
await page.locator('[data-lobby-state=idle]').waitFor({ timeout: 120000 });
await page.waitForFunction(() => window.__scenes.some(s => { const g = s.getObjectByName('ancient-jura-grove'); let n = 0; g?.traverse(o => { if (o.isInstancedMesh && o.count === 2) n++; }); return n === 3; }), null, { timeout: 120000, polling: 500 });
await page.waitForTimeout(6000);

const jobs = await page.evaluate(async ({ SS, DENSITY, CLOUDS, WIND_TIME }) => {
  const R = window.__renderers[0];
  const S = window.__scenes.map(s => { let n = 0; s.traverse(() => n++); return [n, s]; }).sort((a, b) => b[0] - a[0])[0][1];
  const grove = S.getObjectByName('ancient-jura-grove');
  const live = S.getObjectByProperty('isPerspectiveCamera', true); live.updateMatrixWorld(true);
  const Cam = live.constructor, M4 = live.matrixWorld.constructor, V3 = live.position.constructor;
  const parts = []; grove.traverse(o => { if (o.isInstancedMesh) parts.push(o); });
  const leaves = parts.find(m => /leaves/.test(m.material.name));
  const trees = Array.from({ length: leaves.count }, (_, i) => { const m = new M4(); leaves.getMatrixAt(i, m); return m.clone(); });
  // Freeze the world clock so wind is the same across every baked image.
  const seen = new Set(); S.traverse(o => { if (!o.isMesh) return; for (const m of [].concat(o.material)) { const u = R.properties.get(m).uniforms; const t = u && u.outdoorTime; if (t && !seen.has(t)) { seen.add(t); Object.defineProperty(t, 'value', { get: () => WIND_TIME, set() {} }); } } });
  // Everything but the grove's instanced crowns is hidden; the buttress roots stay real geometry.
  const keep = new Set(parts); const hidden = [];
  S.traverse(o => { if ((o.isMesh || o.isPoints || o.isLine || o.isSprite) && !keep.has(o) && o.visible) { o.visible = false; hidden.push(o); } });
  const fog = S.fog, bg = S.background; S.fog = null; S.background = null;
  const camPos = live.getWorldPosition(new V3());
  const saved = parts.map(m => ({ m, count: m.count, matrices: trees.map((_, i) => { const t = new M4(); m.getMatrixAt(i, t); return t; }) }));
  const prev = parts.map(m => ({ m, key: m.material.customProgramCacheKey, before: m.material.onBeforeCompile }));
  // Depth pass: the crown's own shader writes how far each pixel's surface sits behind the card plane (view-axis metres, 8 bits over +-range).
  const forceDepth = (Dh, range) => { for (const { m, key, before } of prev) { const mat = m.material; mat.onBeforeCompile = (sh, r) => { before.call(mat, sh, r); sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>\n gl_FragColor.rgb=vec3(clamp((vViewPosition.z-${Dh.toFixed(3)})/${range.toFixed(3)}*.5+.5,0.,1.));`); }; mat.customProgramCacheKey = () => key.call(mat) + '-baked-depth' + Dh; mat.needsUpdate = true; } };
  const forceCloud = value => { for (const { m, key, before } of prev) { const mat = m.material; mat.onBeforeCompile = (sh, r) => { before.call(mat, sh, r); sh.fragmentShader = sh.fragmentShader.replace('float cloudVisibility(vec3 world) {', `float cloudVisibility(vec3 world) {\n return ${value.toFixed(4)};`); }; mat.customProgramCacheKey = () => key.call(mat) + '-bake' + value; mat.needsUpdate = true; } };
  const frames = [];
  for (const [k, matrix] of trees.entries()) {
    const origin = new V3().setFromMatrixPosition(matrix);
    const d = new V3(origin.x - camPos.x, 0, origin.z - camPos.z); const Dh = d.length(); d.normalize();
    const right = new V3(-d.z, 0, d.x);
    let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
    for (const m of parts) { m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox;
      for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) {
        const q = new V3(x, y, z).applyMatrix4(matrix).sub(camPos); const depth = q.dot(d); const f = Dh / depth;
        const u = q.dot(right) * f, v = (camPos.y - origin.y) + q.y * f;
        u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
      } }
    const mu = (u1 - u0) * 0.015, mv = (v1 - v0) * 0.015; u0 -= mu; u1 += mu; v0 -= mv; v1 += mv;
    let dmin = 1e9, dmax = -1e9;
    for (const m of parts) { const bb = m.geometry.boundingBox; for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) { const depth = new V3(x, y, z).applyMatrix4(matrix).sub(camPos).dot(d); dmin = Math.min(dmin, depth - Dh); dmax = Math.max(dmax, depth - Dh); } }
    const range = Math.ceil(Math.max(-dmin, dmax) * 1.3 / 5) * 5; // keeps the 8-bit code well inside 1..254, away from alpha values a decoder may premultiply away
    const pixel = 2 * Math.tan(25 * Math.PI / 180) * Dh / 900; // metres per 1440x900 css pixel at the card
    const tw = Math.round((u1 - u0) / pixel * DENSITY), th = Math.round((v1 - v0) / pixel * DENSITY);
    frames.push({ k, origin: origin.toArray(), Dh, d: d.toArray(), u0, u1, v0, v1, tw, th, pixel, range });
  }
  const shots = [];
  for (const [state, cloud] of [...Object.entries(CLOUDS), ['depth', -1]]) {
    if (state !== 'depth') forceCloud(cloud);
    for (const f of frames) {
      if (state === 'depth') forceDepth(f.Dh, f.range);
      for (const { m, matrices } of saved) { m.setMatrixAt(0, matrices[f.k]); m.count = 1; m.instanceMatrix.needsUpdate = true; }
      const W = f.tw * SS, H = f.th * SS;
      const cam = new Cam(); cam.position.copy(camPos); cam.lookAt(camPos.x + f.d[0], camPos.y, camPos.z + f.d[2]); cam.updateMatrixWorld(true);
      const near = f.Dh - 250, far = f.Dh + 250, s = near / f.Dh;
      cam.projectionMatrix.makePerspective(f.u0 * s, f.u1 * s, (f.v1 + f.origin[1] - camPos.y) * s, (f.v0 + f.origin[1] - camPos.y) * s, near, far); cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
      R.setPixelRatio(1); R.setSize(W, H, false);
      const out = {};
      for (const [bgName, color] of [['black', 0x000000], ['white', 0xffffff]]) {
        R.setClearColor(color, 1); R.clear(); R.render(S, cam);
        out[bgName] = R.domElement.toDataURL('image/png');
      }
      shots.push({ state, cloud, k: f.k, W, H, black: out.black, white: out.white });
    }
  }
  // restore
  for (const { m, count, matrices } of saved) { matrices.forEach((t, i) => m.setMatrixAt(i, t)); m.count = count; m.instanceMatrix.needsUpdate = true; }
  for (const { m, key, before } of prev) { m.material.onBeforeCompile = before; m.material.customProgramCacheKey = key; m.material.needsUpdate = true; }
  hidden.forEach(o => { o.visible = true; }); S.fog = fog; S.background = bg;
  return { frames, shots };
}, { SS, DENSITY, CLOUDS, WIND_TIME });
await browser.close();

// Matte from black/white renders, then supersample down in premultiplied space (what MSAA resolve does).
const dataUrl = s => Buffer.from(s.slice(s.indexOf(',') + 1), 'base64');
const images = {};
for (const shot of jobs.shots) {
  const [b, w] = await Promise.all([shot.black, shot.white].map(async u => (await sharp(dataUrl(u)).removeAlpha().raw().toBuffer())));
  const f = jobs.frames[shot.k], tw = f.tw, th = f.th, n = tw * th;
  const premult = new Float32Array(n * 3), alpha = new Float32Array(n);
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    let r = 0, g = 0, bl = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const o = ((y * SS + sy) * tw * SS + x * SS + sx) * 3;
      const al = 1 - ((w[o] - b[o]) + (w[o + 1] - b[o + 1]) + (w[o + 2] - b[o + 2])) / (3 * 255);
      a += al; r += b[o]; g += b[o + 1]; bl += b[o + 2];
    }
    const i = y * tw + x, k = SS * SS;
    alpha[i] = Math.min(1, Math.max(0, a / k)); premult[i * 3] = r / k; premult[i * 3 + 1] = g / k; premult[i * 3 + 2] = bl / k;
  }
  const covered = alpha.reduce((t, a) => t + (a > 0.5 ? 1 : 0), 0) / n;
  if (covered < 0.03) throw new Error(`bake ${shot.k}/${shot.state} is blank (${(covered * 100).toFixed(2)}% covered): the GPU context was probably lost, run it again`);
  images[`${shot.k}-${shot.state}`] = { tw, th, premult, alpha };
}
function finish({ tw, th, premult, alpha }) {
  const rgba = Buffer.alloc(tw * th * 4), known = new Uint8Array(tw * th);
  for (let i = 0; i < tw * th; i++) {
    const a = alpha[i];
    if (a > 0.04) { known[i] = 1; for (let c = 0; c < 3; c++) rgba[i * 4 + c] = Math.min(255, Math.round(premult[i * 3 + c] / a)); }
    rgba[i * 4 + 3] = Math.round(a * 255);
  }
  // Colour bleed into empty texels so mip levels and bilinear taps never pull in black.
  for (let pass = 0; pass < 24; pass++) {
    const add = [];
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
      const i = y * tw + x; if (known[i]) continue;
      let r = 0, g = 0, b = 0, c = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= tw || yy >= th) continue; const j = yy * tw + xx; if (known[j]) { r += rgba[j * 4]; g += rgba[j * 4 + 1]; b += rgba[j * 4 + 2]; c++; } }
      if (c) add.push([i, r / c, g / c, b / c]);
    }
    if (!add.length) break;
    for (const [i, r, g, b] of add) { rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; known[i] = 1; }
  }
  return rgba;
}
const meta = { time: WIND_TIME, camera: [0, 0.4, 1.9], clouds: CLOUDS, trees: [] };
for (const f of jobs.frames) {
  meta.trees.push({ u0: +f.u0.toFixed(3), u1: +f.u1.toFixed(3), v0: +f.v0.toFixed(3), v1: +f.v1.toFixed(3), width: f.tw, height: f.th, distance: +f.Dh.toFixed(3), depthRange: f.range, colorGain: [1, 1, 1], origin: f.origin.map(v => +v.toFixed(3)) });
  const depth = finish(images[`${f.k}-depth`]);
  for (const state of Object.keys(CLOUDS)) {
    const rgba = finish(images[`${f.k}-${state}`]);
    // The shade image has no coverage of its own (the sun image's is used), so its alpha carries the surface depth behind the card plane.
    if (state !== 'sun') for (let i = 0; i < f.tw * f.th; i++) rgba[i * 4 + 3] = depth[i * 4] || 128;
    const img = sharp(rgba, { raw: { width: f.tw, height: f.th, channels: 4 } });
    if (RAW) { await fs.mkdir(RAW, { recursive: true }); await img.clone().png().toFile(`${RAW}/tree${f.k}-${state}.png`); }
    const file = `${OUT}/ancient-tree-${f.k}-${state}.webp`;
    // The shade pass shares the sun pass's coverage, so only the sun image carries alpha.
    if (state === 'sun') await img.webp({ quality: QUALITY, alphaQuality: 100, effort: 6 }).toFile(file);
    else await img.webp({ quality: QUALITY, alphaQuality: 100, effort: 6, exact: true }).toFile(file);
  }
}
await fs.writeFile(META, JSON.stringify(meta, null, 1) + '\n');
console.log(JSON.stringify(meta));
