/** Halves the two largest terrain upgrade maps (rock-face detail + normal, 2048 -> 1024) to cut ~2.6 MB
 * from the slow-link tail: they are the last bytes to land (Low priority, after the previews).
 *
 * The 1024 map is the exact 2x2 box mip the GPU would have sampled anyway: linear-light average for the
 * sRGB detail map, plain average for the data (normal) map. Texels are 1.6 mm over a 3.2 m tile, so mip 0
 * only shows up in the closest few metres of ground. The tiling (`repeat`), colour space and anisotropy
 * live in ground-textures.ts and do not depend on the image size.
 *
 * One place to flip: GROUND_MAPS_1K below. With false the script restores the originals. Either way:
 * `pnpm assets:version`. Sources always come from the backup, never from public/, so reruns never stack
 * WebP generation loss. First run snapshots the 2048 originals into the backup (never overwritten).
 *
 * Usage: node scripts/shrink-ground-maps.mjs [--backup <dir>]   (default ~/.cache/yuribodo-l4-backup)
 */
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Master switch: true writes the 1024 maps, false restores the 2048 originals from the backup. */
export const GROUND_MAPS_1K = true;

const WORLD = 'public/lobby/world/';
/** [file, sRGB colour data, WebP quality]. Detail keeps the original q90, normal stays near-lossless-ish
 * because banding in a normal map shows up as faceting under the sun. */
export const GROUND_MAPS = [
  ['rock-face-detail', true, 90],
  ['rock-face-normal', false, 94],
];
export const SOURCE_SIZE = 2048;

const SRGB_TO_LINEAR = Float32Array.from({ length: 256 }, (_, i) => {
  const c = i / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});
export function linearToSrgb8(v) {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(c * 255)));
}

/** Exact 2x2 box downsample of interleaved 8-bit pixels. With `srgb` the colour channels (all but a 4th
 * alpha channel) are averaged in linear light; everything else is a plain rounded average. */
export function halve(data, width, height, channels, srgb) {
  if (width % 2 || height % 2) throw new Error(`halve needs even dimensions, got ${width}x${height}`);
  const w = width / 2, h = height / 2, out = Buffer.alloc(w * h * channels);
  const colour = channels === 4 ? 3 : channels;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let k = 0; k < channels; k++) {
    const i0 = (2 * y * width + 2 * x) * channels + k, i1 = i0 + channels, i2 = i0 + width * channels, i3 = i2 + channels;
    out[(y * w + x) * channels + k] = srgb && k < colour
      ? linearToSrgb8((SRGB_TO_LINEAR[data[i0]] + SRGB_TO_LINEAR[data[i1]] + SRGB_TO_LINEAR[data[i2]] + SRGB_TO_LINEAR[data[i3]]) / 4)
      : Math.round((data[i0] + data[i1] + data[i2] + data[i3]) / 4);
  }
  return { data: out, width: w, height: h };
}

const sharpOf = () => createRequire(createRequire(import.meta.url).resolve('next/package.json'))('sharp');
const exists = file => fs.access(file).then(() => true, () => false);

/** The 2048 original for `name`, snapshotting the live file the first time it is still full size. */
async function ensureBackup(sharp, backupDir, name) {
  const backup = path.join(backupDir, `${name}.webp`);
  if (await exists(backup)) return backup;
  const live = WORLD + `${name}.webp`, { width } = await sharp(live).metadata();
  if (width !== SOURCE_SIZE) throw new Error(`${live} is ${width}px wide and no backup exists in ${backupDir}: restore the ${SOURCE_SIZE}px original first (git show HEAD:${live})`);
  await fs.mkdir(backupDir, { recursive: true });
  await fs.copyFile(live, backup);
  return backup;
}

async function writeIfChanged(file, bytes) {
  if (await exists(file) && Buffer.compare(await fs.readFile(file), bytes) === 0) return false;
  await fs.writeFile(file, bytes);
  return true;
}

async function main() {
  const flag = process.argv.indexOf('--backup');
  const backupDir = flag > 0 ? process.argv[flag + 1] : path.join(os.homedir(), '.cache', 'yuribodo-l4-backup');
  const sharp = sharpOf();
  for (const [name, srgb, quality] of GROUND_MAPS) {
    const backup = await ensureBackup(sharp, backupDir, name);
    const original = await fs.readFile(backup), target = WORLD + `${name}.webp`;
    let bytes = original;
    if (GROUND_MAPS_1K) {
      const { data, info } = await sharp(original).raw().toBuffer({ resolveWithObject: true });
      const half = halve(data, info.width, info.height, info.channels, srgb);
      bytes = await sharp(half.data, { raw: { width: half.width, height: half.height, channels: info.channels } }).webp({ quality, effort: 6 }).toBuffer();
    }
    const changed = await writeIfChanged(target, bytes);
    console.log(`${name}: ${original.length} -> ${bytes.length} bytes (${GROUND_MAPS_1K ? '1024' : 'original'}${changed ? '' : ', unchanged'})`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error); process.exitCode = 1; });
