/** Lossless texture trims for the desk models: drops maps that carry no data.
 *   macbook_pro_closed  emissive (all black) + normal (exactly flat), emissiveFactor -> 0
 *   wooden_desk         Foundations + Handles normals (flat to within WebP noise)
 *   monitor             Display emissive: monitor.tsx swaps that material for the
 *                       canvas-driven screen material, the GLB image never renders
 * A flat map is checked pixel by pixel before it is dropped. Nothing is pruned or
 * deduped (the code looks nodes up by name) and the extensions are kept, so mesh
 * data stays byte-identical after the meshopt round trip; the script asserts that.
 * Idempotent. Rerun scripts/version-lobby-assets.ts afterwards.
 * Usage: node scripts/trim-desk-textures.mjs
 */
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
const require = createRequire(import.meta.url), sdk = createRequire(require.resolve('@gltf-transform/cli'));
const { NodeIO } = sdk('@gltf-transform/core');
const { ALL_EXTENSIONS } = sdk('@gltf-transform/extensions');
const { MeshoptDecoder, MeshoptEncoder } = sdk('meshoptimizer');
const sharp = sdk('sharp');
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

const FLAT_NORMAL = [128, 127, 255], BLACK = [0, 0, 0];
// WebP noise: at most this share of pixels may be further than TOLERANCE levels from the constant.
const TOLERANCE = 16, MAX_OUTLIER_SHARE = 5e-4;
const TRIMS = [
  { file: 'macbook_pro_closed', material: 'MacBook_Pro_Closed', drop: { emissive: BLACK, normal: FLAT_NORMAL }, blackout: true },
  { file: 'wooden_desk', material: 'Foundations', drop: { normal: FLAT_NORMAL } },
  { file: 'wooden_desk', material: 'Handles', drop: { normal: FLAT_NORMAL } },
  { file: 'monitor', material: 'Display', drop: { emissive: null }, blackout: true },
];

const digest = array => crypto.createHash('sha1').update(Buffer.from(array.buffer, array.byteOffset, array.byteLength)).digest('hex');

async function assertConstant(texture, expected, label) {
  const { data, info } = await sharp(Buffer.from(texture.getImage())).raw().toBuffer({ resolveWithObject: true });
  const pixels = info.width * info.height;
  let outliers = 0;
  for (let p = 0; p < pixels; p++)
    for (let c = 0; c < 3; c++)
      if (Math.abs(data[p * info.channels + c] - expected[c]) > TOLERANCE) { outliers++; break; }
  if (outliers / pixels > MAX_OUTLIER_SHARE) throw new Error(`${label} is not constant: ${outliers} of ${pixels} pixels differ`);
  return outliers;
}

/** Decoded content of everything that must survive: node names, mesh data, kept textures. */
function fingerprint(doc) {
  const root = doc.getRoot();
  return {
    nodes: root.listNodes().map(n => `${n.getName()}|${n.getMesh()?.getName()}|${n.getTranslation()}|${n.getRotation()}|${n.getScale()}`),
    meshes: root.listMeshes().map(m => m.listPrimitives().map(p => [
      p.getMaterial()?.getName(), p.getIndices() && digest(p.getIndices().getArray()),
      ...p.listSemantics().map(s => `${s}:${digest(p.getAttribute(s).getArray())}`),
    ].join(' '))),
    textures: root.listTextures().map(t => digest(t.getImage())),
    extensions: root.listExtensionsUsed().map(e => e.extensionName).sort(),
  };
}

const bySlot = {
  emissive: [m => m.getEmissiveTexture(), m => m.setEmissiveTexture(null)],
  normal: [m => m.getNormalTexture(), m => m.setNormalTexture(null)],
};

for (const file of [...new Set(TRIMS.map(t => t.file))]) {
  const path = `public/lobby/models/${file}.glb`;
  const before = await fs.stat(path), doc = await io.read(path), root = doc.getRoot(), print = fingerprint(doc);
  let removed = 0;
  for (const { material: name, drop, blackout } of TRIMS.filter(t => t.file === file)) {
    const material = root.listMaterials().find(m => m.getName() === name);
    if (!material) throw new Error(`${file}: no material ${name}`);
    for (const [slot, expected] of Object.entries(drop)) {
      const [get, clear] = bySlot[slot], texture = get(material);
      if (!texture) continue;
      const outliers = expected ? await assertConstant(texture, expected, `${file}/${name}/${slot}`) : 0;
      clear(material);
      if (!texture.listParents().some(p => p.propertyType !== 'Root')) { texture.dispose(); removed++; }
      console.log(`${file}/${name}: dropped ${slot} (${outliers} outlier px)`);
    }
    // Without the black map a factor of 1 would turn the surface white.
    if (blackout) material.setEmissiveFactor([0, 0, 0]);
  }
  if (!removed) { console.log(file, 'already trimmed'); continue; }
  const output = await io.writeBinary(doc), after = fingerprint(await io.readBinary(output));
  if (JSON.stringify(after.nodes) !== JSON.stringify(print.nodes) || JSON.stringify(after.meshes) !== JSON.stringify(print.meshes)
    || JSON.stringify(after.extensions) !== JSON.stringify(print.extensions) || after.textures.length !== print.textures.length - removed
    || !after.textures.every(hash => print.textures.includes(hash)))
    throw new Error(`${file}: round trip changed nodes, meshes, extensions or surviving textures`);
  await fs.writeFile(path, output);
  console.log(file, before.size, '->', output.byteLength, 'bytes,', print.textures.length, '->', after.textures.length, 'textures');
}
