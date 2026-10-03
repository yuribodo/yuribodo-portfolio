/** Lossy texture caps for the far-away lobby models, sized to what the fixed 50 degree seated camera
 * can resolve (texels per screen pixel measured at the real framing, see the CAPS rationale below).
 *
 * The GLB is repacked at the byte level: only the image bufferViews are replaced. Meshopt / Draco
 * streams, quantization, KHR_texture_transform, node names and every accessor are copied byte for
 * byte (the script asserts it), so nothing is pruned, deduped or re-encoded. Textures already within
 * their cap are skipped, so reruns never stack WebP generation loss.
 *
 * One place to flip: TEXTURE_CAPS_ENABLED below. With false the script restores the original GLBs
 * from a backup folder (`--backup <dir>`, laid out like public/lobby/world) instead of capping.
 * To get a single texture back: raise its CAPS row, restore that GLB from the backup
 * (`cp <backup>/<file>.glb public/lobby/world/<file>.glb`) and rerun this script. Either way finish with
 * `pnpm assets:version`.
 *
 * Usage: node scripts/cap-texture-sizes.mjs [--dry] [--only <glb substring>] [--report <json path>] [--backup <dir>]
 */
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

/** Master switch: true caps the textures below, false restores the originals from --backup. */
export const TEXTURE_CAPS_ENABLED = true;

const WORLD = 'public/lobby/world/';
/** [glb, 'material|slot', longest side in px]. Slots: base, normal, mr, occlusion, emissive. A key may end
 * in '*' (prefix match; '*' alone is the whole file); the most specific row wins, and an image shared by
 * several slots takes the largest cap. Rows are generated from texel density measured at the real
 * framing (seated camera, fov 50, 4K buffer = 2.4x the 1440x900 one): the cap leaves at least 0.75 texel per
 * screen pixel at the 2nd percentile of visible area, never below 128. A cap above the image's size is a
 * deliberate no-op ("kept"): that map needs everything it has. The comment gives the measured screen area
 * at 1440x900 and the texel/px of the 2nd percentile at 4K. To get a texture back, raise its number. */
export const CAPS = [
  ['toothless-flight', 'Body|base', 512], // user-approved: 512 measures 0.055 mad vs 0.027 at 1024 at the nearest pass (4K), invisible; 320 would allow more
  ['toothless-flight', 'Body|normal', 512], // same
  ['characters/going-merry', 'Going Merry painted atlas|base', 960], // 2048x2048, 4191 px, 1.67 texel/px at 4K
  ['characters/snorlax', 'Material.002|base', 256], // 1024x1024, 96 px, 3.96 texel/px at 4K
  ['characters/lancelot', 'blinn1SG|base', 128], // 1024x1024, 774 px, 6.67 texel/px at 4K
  ['characters/lancelot', 'blinn1SG|emissive', 128], // 1024x1024, 774 px, 6.67 texel/px at 4K
  ['characters/lancelot', 'blinn1SG|mr', 128], // 1024x1024, 774 px, 6.67 texel/px at 4K
  ['characters/lancelot', 'blinn1SG|normal', 128], // 1024x1024, 774 px, 6.67 texel/px at 4K
  ['characters/lancelot', 'blinn2SG|base', 128], // 1024x1024, 215 px, 9.43 texel/px at 4K
  ['characters/lancelot', 'blinn2SG|mr', 128], // 1024x1024, 215 px, 9.43 texel/px at 4K
  ['characters/lancelot', 'blinn2SG|normal', 128], // 1024x1024, 215 px, 9.43 texel/px at 4K
  ['characters/royal-court', 'Court - weathered pale stone|base', 384], // 1024x1024, 9177 px, 2.36 texel/px at 4K
  ['characters/ainz', 'jubah_1|base', 128], // 1024x1024, 1586 px, 7.93 texel/px at 4K
  ['characters/ainz', 'Jubah_2|base', 128], // 1024x1024, 104 px, 13.33 texel/px at 4K
  ['characters/ainz', 'jubah_3|base', 128], // 1024x1024, 148 px, 22.42 texel/px at 4K
  ['characters/ainz', 'jubah|base', 128], // 1024x1024, 1369 px, 13.33 texel/px at 4K
  ['characters/ainz', 'Material.005|base', 384], // 1024x1024, 80 px, 2.36 texel/px at 4K
  ['characters/fishstick', 'M_MED_TeriyakiFish_Body|base', 128], // 1024x1024, 43 px, 11.21 texel/px at 4K
  ['characters/fishstick', 'M_Med_TeriyakiFish_Hat|base', 128], // 1024x1024, 3 px, 37.71 texel/px at 4K
  ['characters/fishstick', 'M_Med_TeriyakiFish_Head|base', 128], // 1024x512, 2 px, 15.86 texel/px at 4K
  ['chess-monuments', 'Chess marble|base', 704], // 1024x1024, 7181 px, 1.18 texel/px at 4K
  ['chess-monuments', 'Chess marble|normal', 704], // 1024x1024, 7181 px, 1.18 texel/px at 4K
  ['chess-monuments', 'Chess marble|mr', 64], // isekai-world.tsx nulls roughnessMap/metalnessMap on this material, so the map is never sampled
  ['reference-houses', 'anime-house:Material.011|base', 128], // 768x768, 23348 px, 13.33 texel/px at 4K
  ['reference-houses', 'anime-house:Material.016|base', 128], // 768x768, 2450 px, 63.42 texel/px at 4K
  ['reference-houses', 'anime-house:Material.019|base', 128], // 768x768, 3461 px, 53.33 texel/px at 4K
  ['reference-houses', 'anime-house:Material.021|base', 128], // 768x768, 11046 px, 13.33 texel/px at 4K
  ['reference-houses', 'anime-house:Material.022|base', 128], // 768x768, 890 px, 53.33 texel/px at 4K
  ['reference-houses', 'anime-house:Roof|base', 128], // 768x768, 29539 px, 22.42 texel/px at 4K
  ['reference-houses', 'anime-house:swg.001|base', 128], // 768x768, 565 px, 44.85 texel/px at 4K
  ['reference-houses', 'anime-house:WoodFloor_Brown|base', 128], // 768x768, 18056 px, 22.42 texel/px at 4K
  ['reference-houses', 'hobbit-house:House_1|base', 192], // 768x768, 1881 px, 3.33 texel/px at 4K
  ['reference-houses', 'hobbit-house:House_2|base', 128], // 768x768, 92 px, 13.33 texel/px at 4K
  ['reference-houses', 'hobbit-house:House_3|base', 128], // 768x768, 671 px, 5.61 texel/px at 4K
  ['reference-houses', 'ichiraku-ramen:blinn13|base', 128], // 512x512, 14 px, 15.86 texel/px at 4K
  ['reference-houses', 'ichiraku-ramen:blinn14|base', 128], // 256x256, 14 px, 3.33 texel/px at 4K
  ['reference-houses', 'ichiraku-ramen:blinn4|base', 128], // 256x128, 263 px, 2.36 texel/px at 4K
  ['reference-houses', 'ichiraku-ramen:blinn5|base', 128], // 256x256, 4 px, 7.93 texel/px at 4K
  ['reference-houses', 'ichiraku-ramen:lambert13|base', 192], // 512x128, 204 px, 2.8 texel/px at 4K
  ['reference-houses', 'ichiraku-ramen:lambert15|base', 128], // 512x128, 74 px, 9.43 texel/px at 4K
  ['reference-houses', 'ichiraku-ramen:lambert16|base', 128], // 512x512, 443 px, 13.33 texel/px at 4K
  ['reference-houses', 'ichiraku-ramen:lambert19|base', 128], // 512x256, 217 px, 4.71 texel/px at 4K
  ['reference-houses', 'ichiraku-ramen:lambert22|base', 704], // 256x256 kept, 1385 px, 0.29 texel/px at 4K
  ['reference-houses', 'ichiraku-ramen:lambert23|base', 192], // 512x256, 313 px, 2.8 texel/px at 4K
  ['reference-houses', 'ichiraku-ramen:lambert24|base', 512], // 64x512 kept, 799 px, 0.83 texel/px at 4K
  ['reference-houses', 'ichiraku-ramen:lambert40|base', 128], // 256x256, 55 px, 3.33 texel/px at 4K
  ['reference-houses', 'ichiraku-ramen:lambert42|base', 128], // 256x256, 186 px, 7.93 texel/px at 4K
  ['reference-houses', 'ichiraku-ramen:lambert43|base', 128], // 256x256, 23 px, 31.71 texel/px at 4K
  ['reference-houses', 'ichiraku-ramen:lambert48|base', 128], // 256x256, 395 px, 18.86 texel/px at 4K
  ['reference-houses', 'ichiraku-ramen:lambert49|base', 128], // 512x256, 96 px, 7.93 texel/px at 4K
  ['reference-houses', 'ichiraku-ramen:lambert50|base', 128], // 768x768, 536 px, 4.71 texel/px at 4K
  ['reference-houses', 'ichiraku-ramen:lambert51|base', 128], // 256x256, 54 px, 15.86 texel/px at 4K
  ['reference-houses', 'ichiraku-ramen:lambert52|base', 128], // 128x128 kept, 2 px, 1.98 texel/px at 4K
  ['reference-houses', 'ichiraku-ramen:lambert59|base', 128], // 768x768, 2 px, 75.42 texel/px at 4K
  ['reference-houses', 'ichiraku-ramen:phong2|base', 128], // 256x128, 1 px, 9.43 texel/px at 4K
  ['reference-houses', 'ichiraku-ramen:phong6|base', 128], // 512x256, 7 px, 13.33 texel/px at 4K
  ['reference-houses', 'ichiraku-ramen:phongE1|base', 128], // 256x128, 22 px, 5.61 texel/px at 4K
  ['reference-houses', 'kame-house:material_1|base', 128], // 768x768, 19 px, 26.67 texel/px at 4K
  ['reference-houses', 'kame-house:material_3|base', 128], // 768x768, 11 px, 37.71 texel/px at 4K
  ['reference-houses', 'kame-house:material|base', 128], // 768x768, 257 px, 4.71 texel/px at 4K
  ['reference-houses', 'pineapple-house:ChimneyMaterial|base', 128], // 768x768, 4 px, 37.71 texel/px at 4K
  ['reference-houses', 'pineapple-house:CrownMaterial|base', 128], // 768x768, 104 px, 11.21 texel/px at 4K
  ['reference-houses', 'pineapple-house:DoorMaterial|base', 128], // 768x768, 48 px, 15.86 texel/px at 4K
  ['reference-houses', 'pineapple-house:FlowersMaterial|base', 128], // 512x256, 94 px, 11.21 texel/px at 4K
  ['reference-houses', 'pineapple-house:PineAppleMaterial|base', 192], // 768x768, 377 px, 3.96 texel/px at 4K
  ['reference-houses', 'pineapple-house:WindowMaterial|base', 128], // 768x768, 15 px, 22.42 texel/px at 4K
  ['reference-houses', 'pokemon-center:Grey_1|base', 192], // 768x768, 914 px, 3.33 texel/px at 4K
  ['reference-houses', 'pokemon-center:Grey_1|emissive', 192], // 768x768, 914 px, 3.33 texel/px at 4K
  ['reference-houses', 'ichiraku-ramen:*', 256], // maps hidden at the seated camera; fallback
  ['reference-houses', 'pineapple-house:*', 256], // DoorWheel is hidden; fallback
];

/** Auxiliary maps are re-encoded at 95 (lossy normals band), albedo at 92; alpha is always lossless. */
const QUALITY = { base: 92, emissive: 92, normal: 95, mr: 95, occlusion: 95 };
/** A cap only applies when it removes at least a quarter of the pixels; smaller wins are not worth a re-encode. */
export const MAX_PIXEL_SHARE = 0.75;

/** Image index -> every 'material|slot' that samples it. */
export function imageUsage(json) {
  const usage = new Map();
  const sourceOf = info => { if (!info) return undefined; const t = json.textures[info.index]; return t.extensions?.EXT_texture_webp?.source ?? t.source; };
  for (const material of json.materials ?? []) {
    const pbr = material.pbrMetallicRoughness ?? {};
    const slots = { base: pbr.baseColorTexture, mr: pbr.metallicRoughnessTexture, normal: material.normalTexture, occlusion: material.occlusionTexture, emissive: material.emissiveTexture };
    for (const [slot, info] of Object.entries(slots)) {
      const image = sourceOf(info);
      if (image !== undefined) (usage.get(image) ?? usage.set(image, []).get(image)).push(`${material.name}|${slot}`);
    }
  }
  return usage;
}

/** Cap for one image: each use takes its most specific row (exact, then longest prefix, then '*'), and a
 * shared image keeps the largest of its uses. Undefined when no row applies to any use. */
export function capFor(rows, file, uses) {
  const rank = (key, use) => key === use ? 2 : key === '*' ? 0 : key.endsWith('*') && use.startsWith(key.slice(0, -1)) ? 1 + key.length / 1e3 : -1;
  const perUse = (uses.length ? uses : ['']).map(use => {
    let best = -1, row;
    for (const candidate of rows) if (candidate[0] === file && rank(candidate[1], use) > best) { best = rank(candidate[1], use); row = candidate; }
    return row && { use, max: row[2] };
  }).filter(match => match !== undefined);
  if (!perUse.length) return undefined;
  const slots = uses.length ? uses.map(use => use.split('|').pop()) : ['base'];
  return { max: Math.max(...perUse.map(match => match.max)), quality: Math.max(...slots.map(slot => QUALITY[slot] ?? 92)) };
}

/** Longest-side fit that never enlarges; null when the image is within the cap or the saving is too small. */
export function fitWithin(width, height, max) {
  if (width <= max && height <= max) return null;
  const scale = max / Math.max(width, height), fitted = [Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))];
  return fitted[0] * fitted[1] <= width * height * MAX_PIXEL_SHARE ? fitted : null;
}

/** Texture memory the GPU holds for one RGBA image with a full mip chain. */
export const textureBytes = (width, height) => Math.round(width * height * 4 * 4 / 3);

export function parseGlb(file) {
  if (file.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB');
  const jsonLength = file.readUInt32LE(12);
  if (file.readUInt32LE(16) !== 0x4e4f534a) throw new Error('first chunk is not JSON');
  const binOffset = 20 + jsonLength;
  if (file.readUInt32LE(binOffset + 4) !== 0x004e4942) throw new Error('second chunk is not BIN');
  const binLength = file.readUInt32LE(binOffset);
  if (binOffset + 8 + binLength !== file.length) throw new Error('unexpected extra GLB chunks');
  return { json: JSON.parse(file.subarray(20, 20 + jsonLength).toString('utf8')), bin: file.subarray(binOffset + 8, binOffset + 8 + binLength) };
}

export function writeGlb(json, bin) {
  const text = Buffer.from(JSON.stringify(json)), jsonPad = (4 - text.length % 4) % 4, binPad = (4 - bin.length % 4) % 4;
  const head = Buffer.alloc(20), mid = Buffer.alloc(8);
  head.write('glTF', 0, 'latin1'); head.writeUInt32LE(2, 4);
  head.writeUInt32LE(12 + 8 + text.length + jsonPad + 8 + bin.length + binPad, 8);
  head.writeUInt32LE(text.length + jsonPad, 12); head.writeUInt32LE(0x4e4f534a, 16);
  mid.writeUInt32LE(bin.length + binPad, 0); mid.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([head, text, Buffer.alloc(jsonPad, 0x20), mid, bin, Buffer.alloc(binPad)]);
}

/** Every range of buffer 0 that is referenced (plain views and EXT_meshopt_compression sources),
 * grouped so a shared range is moved once. Draco views are plain views of buffer 0. */
export function bufferRanges(json) {
  const ranges = new Map(), imageOfView = new Map((json.images ?? []).map((image, index) => [image.bufferView, index]));
  const add = (offset, length, move, image) => {
    const key = `${offset}:${length}`, range = ranges.get(key) ?? ranges.set(key, { offset, length, moves: [], image: undefined }).get(key);
    range.moves.push(move);
    if (image !== undefined) range.image = image;
  };
  json.bufferViews.forEach((view, index) => {
    const meshopt = view.extensions?.EXT_meshopt_compression;
    if (meshopt) {
      if (meshopt.buffer === 0) add(meshopt.byteOffset ?? 0, meshopt.byteLength, offset => { meshopt.byteOffset = offset; });
      else if (view.buffer === 0) throw new Error('mixed meshopt buffers are not supported');
    } else if (view.buffer === 0) add(view.byteOffset ?? 0, view.byteLength, (offset, length) => { view.byteOffset = offset; view.byteLength = length; }, imageOfView.get(index));
  });
  const sorted = [...ranges.values()].sort((a, b) => a.offset - b.offset);
  for (let i = 1; i < sorted.length; i++) if (sorted[i].offset < sorted[i - 1].offset + sorted[i - 1].length) throw new Error('overlapping buffer ranges');
  return sorted;
}

/** Rebuilds buffer 0 with the replacement bytes (image index -> bytes) and patches the view offsets in place. */
export function repack(json, bin, replacements) {
  const parts = [];
  let cursor = 0;
  for (const range of bufferRanges(json)) {
    const bytes = (range.image === undefined ? undefined : replacements.get(range.image)) ?? bin.subarray(range.offset, range.offset + range.length);
    for (const move of range.moves) move(cursor, bytes.length);
    const padding = (4 - bytes.length % 4) % 4;
    parts.push(bytes, Buffer.alloc(padding));
    cursor += bytes.length + padding;
  }
  json.buffers[0].byteLength = cursor;
  return Buffer.concat(parts);
}

const sha = bytes => crypto.createHash('sha1').update(bytes).digest('hex');

/** Everything except replaced image bytes, their view lengths and the buffer offsets must survive the repack. */
export function assertPreserved(before, after, replaced) {
  const normalise = ({ json }) => {
    const copy = structuredClone(json), imageViews = new Set([...replaced].map(i => copy.images[i].bufferView));
    copy.bufferViews.forEach((view, index) => {
      const meshopt = view.extensions?.EXT_meshopt_compression;
      if (meshopt) delete meshopt.byteOffset;
      else if (view.buffer === 0) { delete view.byteOffset; if (imageViews.has(index)) delete view.byteLength; }
    });
    copy.buffers[0].byteLength = 0;
    return JSON.stringify(copy);
  };
  if (normalise(before) !== normalise(after)) throw new Error('JSON changed beyond image views');
  const kept = ({ json, bin }) => bufferRanges(json).filter(range => range.image === undefined || !replaced.has(range.image)).map(range => sha(bin.subarray(range.offset, range.offset + range.length)));
  const a = kept(before), b = kept(after);
  if (a.length !== b.length || a.some((hash, i) => hash !== b[i])) throw new Error('non-image bytes changed');
}

async function main() {
  const args = process.argv.slice(2), dry = args.includes('--dry');
  const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : '', reportPath = args.includes('--report') ? args[args.indexOf('--report') + 1] : '';
  const backup = args.includes('--backup') ? args[args.indexOf('--backup') + 1] : '';
  const files = [...new Set(CAPS.map(([f]) => f))].filter(f => f.includes(only));
  if (!TEXTURE_CAPS_ENABLED) {
    if (!backup) throw new Error('TEXTURE_CAPS_ENABLED is false: pass --backup <dir> holding the original GLBs to restore them');
    for (const file of files) { if (!dry) await fs.copyFile(`${backup}/${file}.glb`, `${WORLD}${file}.glb`); console.log('restored', file); }
    return;
  }
  const sharp = createRequire(createRequire(import.meta.url).resolve('@gltf-transform/cli'))('sharp');
  const report = [];
  for (const file of files) {
    const path = `${WORLD}${file}.glb`, source = await fs.readFile(path), before = parseGlb(source), usage = imageUsage(before.json);
    const json = structuredClone(before.json), replacements = new Map(), rows = [];
    for (const [index, image] of before.json.images.entries()) {
      const view = before.json.bufferViews[image.bufferView], bytes = before.bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
      const uses = usage.get(index) ?? [], cap = capFor(CAPS, file, uses), meta = await sharp(bytes).metadata();
      const row = { file, image: index, name: image.name ?? '', uses: uses.join(' ') || 'UNUSED', from: [meta.width, meta.height], bytes: bytes.length };
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
    if (!replacements.size) { console.log(file, 'already within caps'); report.push(...rows); continue; }
    const output = writeGlb(json, repack(json, before.bin, replacements)), after = parseGlb(output);
    assertPreserved(before, after, new Set(replacements.keys()));
    for (const [index, bytes] of replacements) {
      const view = after.json.bufferViews[after.json.images[index].bufferView];
      const meta = await sharp(after.bin.subarray(view.byteOffset, view.byteOffset + view.byteLength)).metadata();
      if (meta.width !== rows[index].to[0] || meta.height !== rows[index].to[1] || view.byteLength !== bytes.length) throw new Error(`${file} image ${index} did not round trip`);
    }
    console.log(file, source.length, '->', output.length, 'bytes', dry ? '(dry run)' : '');
    if (!dry) await fs.writeFile(path, output);
    report.push(...rows);
  }
  for (const r of report) console.log(r.file.padEnd(26), String(r.image).padStart(2), r.uses.slice(0, 60).padEnd(60), r.from.join('x').padEnd(10), r.to ? `-> ${r.to.join('x')} q${r.quality}`.padEnd(18) : ''.padEnd(18), r.bytes, r.newBytes ? `-> ${r.newBytes}` : '');
  if (reportPath) await fs.writeFile(reportPath, JSON.stringify(report, null, 1));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error); process.exitCode = 1; });
