/** Repack image payloads only; preserve compressed geometry and material slots.
 * TOKTX=/path/to/toktx node scripts/encode-gpu-textures.mjs input.glb output.glb
 * Requires official KTX-Software. UASTC + Zstd, original image dimensions,
 * offline mipmaps, sRGB only for color/emissive maps. No mesh simplification.
 * Set KTX_MODE=etc1s to evaluate ETC1S instead of the UASTC default.
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve('next/package.json'))('sharp');
const [input, output] = process.argv.slice(2);
if (!input || !output || input === output) throw new Error('Provide different input/output paths');
const source = await fs.readFile(input), jsonLength = source.readUInt32LE(12);
const document = JSON.parse(source.subarray(20, 20 + jsonLength));
const bin = source.subarray(28 + jsonLength);
const originalImages = new Set(document.images.map(image => image.bufferView));
const imageFor = info => {
  if (!info) return undefined;
  const texture = document.textures[info.index];
  return texture.extensions?.EXT_texture_webp?.source ?? texture.source;
};
const color = new Set();
for (const material of document.materials) {
  for (const info of [material.pbrMetallicRoughness?.baseColorTexture, material.emissiveTexture,
    material.extensions?.KHR_materials_specular?.specularColorTexture]) {
    const image = imageFor(info); if (image !== undefined) color.add(image);
  }
}
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'lobby-ktx-'));
try {
  const replacements = new Map();
  for (const [index, image] of document.images.entries()) {
    const view = document.bufferViews[image.bufferView];
    if (view.buffer !== 0) throw new Error('Expected embedded source image');
    const imageBytes = bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
    const png = path.join(directory, `${index}.png`), ktx = path.join(directory, `${index}.ktx2`);
    await sharp(imageBytes).png().toFile(png);
    execFileSync(process.env.TOKTX || 'toktx', ['--t2', ...(process.env.KTX_MODE === 'etc1s' ? ['--encode', 'etc1s', '--qlevel', '255', '--clevel', '2'] : ['--encode', 'uastc', '--uastc_quality', '2', '--zcmp', '18']), '--genmipmap', '--assign_oetf', color.has(index) ? 'srgb' : 'linear',
      '--assign_primaries', 'bt709', '--threads', '2', ktx, png], { stdio: 'pipe' });
    const bytes = await fs.readFile(ktx);
    replacements.set(image.bufferView, bytes); image.mimeType = 'image/ktx2';
    console.log(`image ${index}: ${imageBytes.length} -> ${bytes.length}`);
  }
  for (const texture of document.textures) {
    const image = texture.extensions?.EXT_texture_webp?.source ?? texture.source;
    texture.extensions ||= {};
    delete texture.extensions.EXT_texture_webp; delete texture.source;
    texture.extensions.KHR_texture_basisu = { source: image };
  }
  for (const field of ['extensionsUsed', 'extensionsRequired']) {
    document[field] = [...new Set([...(document[field] || []).filter(e => e !== 'EXT_texture_webp'), 'KHR_texture_basisu'])];
  }
  const parts = []; let offset = 0;
  const append = bytes => {
    const start = offset; parts.push(bytes); offset += bytes.length;
    const padding = (4 - offset % 4) % 4;
    if (padding) { parts.push(Buffer.alloc(padding)); offset += padding; }
    return start;
  };
  for (const [index, view] of document.bufferViews.entries()) {
    if (view.buffer === 0) {
      const original = bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
      const bytes = replacements.get(index) ?? original;
      view.byteOffset = append(bytes); view.byteLength = bytes.length;
      if (!originalImages.has(index) && !bytes.equals(original)) throw new Error('Geometry changed');
    }
    const compressed = view.extensions?.EXT_meshopt_compression;
    if (compressed) {
      if (compressed.buffer !== 0) throw new Error('Unexpected Meshopt buffer');
      const bytes = bin.subarray(compressed.byteOffset || 0, (compressed.byteOffset || 0) + compressed.byteLength);
      compressed.byteOffset = append(bytes);
    }
  }
  document.buffers[0].byteLength = offset;
  const json = Buffer.from(JSON.stringify(document)), padding = Buffer.alloc((4 - json.length % 4) % 4, 32);
  const header = Buffer.from(source.subarray(0, 12)), jsonHeader = Buffer.alloc(8), binHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(json.length + padding.length); jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  binHeader.writeUInt32LE(offset); binHeader.writeUInt32LE(0x004e4942, 4);
  header.writeUInt32LE(28 + json.length + padding.length + offset, 8);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, Buffer.concat([header, jsonHeader, json, padding, binHeader, ...parts]));
  console.log(`${source.length} -> ${header.readUInt32LE(8)} bytes`);
} finally { await fs.rm(directory, { recursive: true, force: true }); }
