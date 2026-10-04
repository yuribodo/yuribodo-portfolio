/** Preserve geometry, animation, albedo and alpha byte-for-byte. Only auxiliary
 * normal/roughness maps on landscape plants/rocks are capped to 1024 pixels.
 * Usage: node scripts/optimize-world-textures.mjs input.glb output.glb */
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve('next/package.json'))('sharp');
const [input, output] = process.argv.slice(2);
if (!input || !output || input === output) throw new Error('Provide different input and output GLB paths');
const source = await fs.readFile(input), jsonLength = source.readUInt32LE(12);
const document = JSON.parse(source.subarray(20, 20 + jsonLength));
if (document.extensionsUsed?.includes('EXT_meshopt_compression')) throw new Error('This repacker accepts Draco/uncompressed GLBs only');
const binStart = 28 + jsonLength;
const imageFor = info => {
  if (!info) return undefined;
  const texture = document.textures[info.index];
  return texture.extensions?.EXT_texture_webp?.source ?? texture.source;
};
const keep = new Set(), auxiliary = new Set();
for (const material of document.materials) {
  for (const slot of [material.pbrMetallicRoughness?.baseColorTexture, material.emissiveTexture]) keep.add(imageFor(slot));
  for (const slot of [material.normalTexture, material.pbrMetallicRoughness?.metallicRoughnessTexture, material.occlusionTexture]) auxiliary.add(imageFor(slot));
}
const replacements = new Map();
for (const index of auxiliary) {
  if (index === undefined || keep.has(index)) continue;
  const image = document.images[index], view = document.bufferViews[image.bufferView];
  if (image.mimeType !== 'image/webp') throw new Error('Expected an existing WebP texture');
  const bytes = source.subarray(binStart + (view.byteOffset || 0), binStart + (view.byteOffset || 0) + view.byteLength);
  const metadata = await sharp(bytes).metadata();
  if (Math.max(metadata.width, metadata.height) <= 1024) continue;
  // High-quality auxiliary maps; keep all albedo/alpha detail at source resolution.
  const resized = await sharp(bytes).resize({width:1024,height:1024,fit:'inside',withoutEnlargement:true}).webp({quality:95,effort:6}).toBuffer();
  replacements.set(image.bufferView, resized);
  console.log(`${image.name}: ${metadata.width}×${metadata.height} → 1024px max`);
}
const buffers = []; let offset = 0;
for (const [index, view] of document.bufferViews.entries()) {
  const bytes = replacements.get(index) ?? source.subarray(binStart + (view.byteOffset || 0), binStart + (view.byteOffset || 0) + view.byteLength);
  view.byteOffset = offset; view.byteLength = bytes.length;
  buffers.push(bytes); offset += bytes.length;
  const padding = (4 - offset % 4) % 4;
  if (padding) { buffers.push(Buffer.alloc(padding)); offset += padding; }
}
document.buffers[0].byteLength = offset;
const json = Buffer.from(JSON.stringify(document)), jsonPadding = Buffer.alloc((4-json.length%4)%4, 32);
const jsonHeader = Buffer.alloc(8); jsonHeader.writeUInt32LE(json.length+jsonPadding.length); jsonHeader.writeUInt32LE(0x4e4f534a,4);
const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(offset); binHeader.writeUInt32LE(0x004e4942,4);
const header = Buffer.from(source.subarray(0,12)); header.writeUInt32LE(12+8+json.length+jsonPadding.length+8+offset,8);
await fs.writeFile(output, Buffer.concat([header,jsonHeader,json,jsonPadding,binHeader,...buffers]));
console.log(`${source.length} → ${header.readUInt32LE(8)} bytes; geometry and color buffers retained`);
