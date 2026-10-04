/** Lossy texture caps for the three desk props (keyboard, mouse + pad, Nintendo DS), sized to what the seated
 * camera resolves. Same byte-level repack as scripts/cap-texture-sizes.mjs (its helpers are imported): only the
 * image bufferViews are replaced, meshopt streams, quantization, node names and every accessor are copied byte
 * for byte (asserted), nothing is pruned or deduped.
 *
 * wooden_desk, monitor and macbook_pro_closed are deliberately not here: the monitor dive and the desk
 * close-up resolve them, and capping all six measured only 29 ms better than capping these three.
 *
 * The source is ALWAYS the backed-up original (`--backup <dir>`, default ~/.cache/yuribodo-l1-backup, filled from
 * the current GLB on the first run), so a rerun with different caps never stacks WebP generation loss, and a
 * rerun with the same caps writes identical bytes.
 *
 * Status: written and A/B-measured but NOT applied to public/lobby/models (desk-ready did not improve at 1x on a
 * quiet machine, only under 4x CPU / 20 Mbps). Apply with `node scripts/cap-desk-textures.mjs && pnpm assets:version`.
 *
 * One place to flip: DESK_TEXTURE_CAPS_ENABLED below. With false the script restores the originals from the
 * backup instead of capping. Either way finish with `pnpm assets:version`.
 *   restore: set it to false, `node scripts/cap-desk-textures.mjs`, `pnpm assets:version`
 *   one texture back: raise its CAPS row (1024 keeps it), rerun, `pnpm assets:version`
 *
 * Usage: node scripts/cap-desk-textures.mjs [--dry] [--report <json path>] [--backup <dir>] [--out <dir>]
 */
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { assertPreserved, capFor, fitWithin, imageUsage, parseGlb, repack, writeGlb } from './cap-texture-sizes.mjs';

/** Master switch: true caps the textures below, false restores the originals from the backup. */
export const DESK_TEXTURE_CAPS_ENABLED = true;

const MODELS = 'public/lobby/models/';
const DEFAULT_BACKUP = `${os.homedir()}/.cache/yuribodo-l1-backup`;

/** [glb, 'material|slot', longest side in px]; slots base, normal, mr, occlusion, emissive; the shared image of
 * several slots takes the largest cap. Rows come from texel density measured at the seated camera (fov 50) over
 * the 1440x900 DPR 1 / 1.5 and 3840x2160 buffers and the four pointer-parallax extremes: the cap leaves at
 * least 0.75 texel per screen pixel at the 2nd percentile of visible area, flat maps may go lower. A cap
 * of 1024 is a deliberate no-op: that map needs everything it has. The comment gives the 4K 2nd-percentile
 * texel/px of the 1024 image (coarsest case over seated and parallax) and the texel/px left at the cap. */
export const CAPS = [
  ['keyboard-razer', 'None|base', 256], // flat grey, 4 KB: 256 round trip is within WebP noise (mean abs diff 0.3/255)
  // The keyboard maps share one UV set: 0.84 texel/px at 4K (the 0.75 rule would keep 1024), 2.0 at 1440x900. 512 leaves
  // 0.42 at 4K and 1.0 at 1440; measured 4K keyboard-box mean abs diff 1.5/255, whole frame 0.02. Raise to 1024 to keep them whole.
  ['keyboard-razer', 'None|mr', 512],
  ['keyboard-razer', 'None|emissive', 512],
  ['keyboard-razer', 'None|normal', 512],
  ['mouse-razer', 'mouse_pad|base', 384], // 2.18 texel/px at 4K -> 0.82
  ['mouse-razer', 'mouse_pad|normal', 384], // 2.18 texel/px at 4K -> 0.82 (fabric weave, sub-pixel at 1440)
  ['mouse-razer', 'mouse|base', 256], // 4.36 texel/px at 4K -> 1.09
  ['mouse-razer', 'mouse|mr', 256], // 4.36 texel/px at 4K -> 1.09
  ['mouse-razer', 'mouse|normal', 256], // 4.36 texel/px at 4K -> 1.09
  ['nintendo-ds', 'Material.001|base', 256], // 3.08 texel/px at 4K -> 0.77
  ['nintendo-ds', 'Material|base', 384], // 2.18 texel/px at 4K -> 0.82
  ['nintendo-ds', 'Material.005|base', 128], // 69 texel/px at 4K, flat
  ['nintendo-ds', 'Material.011|base', 128], // 83 texel/px at 4K, flat
  ['nintendo-ds', 'Material.018|base', 128], // 83 texel/px at 4K, flat
  ['nintendo-ds', 'Material.019|base', 128], // 83 texel/px at 4K, flat
  ['nintendo-ds', 'Material.020|base', 128], // 83 texel/px at 4K, flat
];

const exists = path => fs.access(path).then(() => true, () => false);

async function main() {
  const args = process.argv.slice(2), dry = args.includes('--dry');
  const arg = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : '';
  const backup = arg('--backup') || DEFAULT_BACKUP, reportPath = arg('--report'), outDir = (arg('--out') || MODELS).replace(/\/?$/, '/');
  const files = [...new Set(CAPS.map(([file]) => file))];
  await fs.mkdir(backup, { recursive: true });
  if (!DESK_TEXTURE_CAPS_ENABLED) {
    for (const file of files) {
      if (!await exists(`${backup}/${file}.glb`)) throw new Error(`no backup for ${file} in ${backup}`);
      if (!dry) await fs.copyFile(`${backup}/${file}.glb`, `${outDir}${file}.glb`);
      console.log('restored', file);
    }
    return;
  }
  const sharp = createRequire(createRequire(import.meta.url).resolve('@gltf-transform/cli'))('sharp');
  const report = [];
  for (const file of files) {
    const path = `${outDir}${file}.glb`;
    // First run: the shipped GLB is the original. Later runs always start from it again.
    if (!await exists(`${backup}/${file}.glb`)) await fs.copyFile(`${MODELS}${file}.glb`, `${backup}/${file}.glb`);
    const source = await fs.readFile(`${backup}/${file}.glb`), before = parseGlb(source), usage = imageUsage(before.json);
    const json = structuredClone(before.json), replacements = new Map(), rows = [];
    for (const [index, image] of before.json.images.entries()) {
      const view = before.json.bufferViews[image.bufferView], bytes = before.bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
      const uses = usage.get(index) ?? [], cap = capFor(CAPS, file, uses), meta = await sharp(bytes).metadata();
      const row = { file, image: index, uses: uses.join(' ') || 'UNUSED', from: [meta.width, meta.height], bytes: bytes.length };
      const target = cap ? fitWithin(meta.width, meta.height, cap.max) : null;
      if (target) {
        if (image.mimeType !== 'image/webp') throw new Error(`${file} image ${index} is not WebP`);
        const out = await sharp(bytes).resize({ width: target[0], height: target[1], fit: 'fill', kernel: 'cubic' })
          .webp({ quality: cap.quality, alphaQuality: 100, effort: 6, smartSubsample: true }).toBuffer();
        replacements.set(index, out);
        Object.assign(row, { to: target, newBytes: out.length, quality: cap.quality });
      }
      rows.push(row);
    }
    report.push(...rows);
    const output = replacements.size ? writeGlb(json, repack(json, before.bin, replacements)) : source;
    if (replacements.size) {
      const after = parseGlb(output);
      assertPreserved(before, after, new Set(replacements.keys()));
      for (const [index, bytes] of replacements) {
        const view = after.json.bufferViews[after.json.images[index].bufferView];
        const meta = await sharp(after.bin.subarray(view.byteOffset, view.byteOffset + view.byteLength)).metadata();
        if (meta.width !== rows[index].to[0] || meta.height !== rows[index].to[1] || view.byteLength !== bytes.length) throw new Error(`${file} image ${index} did not round trip`);
      }
    }
    console.log(file, source.length, '->', output.length, 'bytes', dry ? '(dry run)' : '');
    if (!dry) await fs.writeFile(path, output);
  }
  for (const r of report) console.log(r.file.padEnd(15), String(r.image).padStart(2), r.uses.slice(0, 40).padEnd(40), r.from.join('x').padEnd(10), r.to ? `-> ${r.to.join('x')} q${r.quality}`.padEnd(18) : 'kept'.padEnd(18), r.bytes, r.newBytes ? `-> ${r.newBytes}` : '');
  if (reportPath) await fs.writeFile(reportPath, JSON.stringify(report, null, 1));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error); process.exitCode = 1; });
