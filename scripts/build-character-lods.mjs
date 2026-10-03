/** Lossless geometry pass for the static world characters: weld bitwise-identical
 * vertices, then reorder for the vertex cache. Same triangles, same vertex values.
 * Only going-merry (unwelded, 207k verts) and royal-court shrink. ainz and lancelot are
 * already tight and their meshopt re-encode loses the original filter, so they stay as is.
 * snorlax (morph targets) and fishstick (skinned) are refused outright.
 * Nothing is pruned or deduped; node names, materials and textures are asserted unchanged.
 * Idempotent. Rerun scripts/version-lobby-assets.ts afterwards.
 * Usage: node scripts/build-character-lods.mjs
 */
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
const require = createRequire(import.meta.url), sdk = createRequire(require.resolve('@gltf-transform/cli'));
const { NodeIO } = sdk('@gltf-transform/core');
const { weld, reorder } = sdk('@gltf-transform/functions');
const { ALL_EXTENSIONS } = sdk('@gltf-transform/extensions');
const { MeshoptDecoder, MeshoptEncoder } = sdk('meshoptimizer');
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

const TARGETS = ['going-merry', 'royal-court'];

const digest = value => crypto.createHash('sha1').update(value).digest('hex');
const imageDigest = texture => digest(Buffer.from(texture.getImage()));

/** Per primitive: the triangles as sorted corner-value tuples, rotation-normalised (smallest of the 3 cyclic rotations) so winding survives. */
function triangleSoup(prim) {
  const semantics = prim.listSemantics().sort(), attributes = semantics.map(s => prim.getAttribute(s)), indices = prim.getIndices();
  const corner = i => attributes.map(a => a.getElement(i, []).join(',')).join(';');
  const count = indices ? indices.getCount() : attributes[0].getCount(), triangles = [];
  for (let t = 0; t < count; t += 3) {
    const corners = [0, 1, 2].map(k => corner(indices ? indices.getScalar(t + k) : t + k));
    triangles.push([0, 1, 2].map(r => [...corners.slice(r), ...corners.slice(0, r)].join('|')).sort()[0]);
  }
  return triangles.sort();
}

/** Reorder only changes draw order within a primitive: unsafe if faces coincide in space with different data. */
function assertNoCoincidentFaces(prim, label) {
  const position = prim.getAttribute('POSITION'), indices = prim.getIndices(), seen = new Map();
  for (let t = 0; t < indices.getCount(); t += 3) {
    const key = [0, 1, 2].map(k => position.getElement(indices.getScalar(t + k), []).join(',')).sort().join('|');
    const data = [0, 1, 2].map(k => prim.listSemantics().sort().map(s => prim.getAttribute(s).getElement(indices.getScalar(t + k), []).join(',')).join(';')).sort().join('|');
    if (seen.has(key) && seen.get(key) !== data) throw new Error(`${label}: coincident faces with different attributes`);
    seen.set(key, data);
  }
}

function fingerprint(doc) {
  const root = doc.getRoot();
  return {
    nodes: root.listNodes().map(n => `${n.getName()}|${n.getMesh()?.getName()}|${n.getTranslation()}|${n.getRotation()}|${n.getScale()}`),
    materials: root.listMaterials().map(m => JSON.stringify([m.getName(), m.getBaseColorFactor(), m.getAlphaMode(), m.getDoubleSided(), m.getBaseColorTexture() && imageDigest(m.getBaseColorTexture())])),
    textures: root.listTextures().map(imageDigest),
    extensions: root.listExtensionsUsed().map(e => e.extensionName).sort(),
    prims: root.listMeshes().map(m => m.listPrimitives().map(p => digest(triangleSoup(p).join('\n')) + ':' + p.getMaterial()?.getName())),
  };
}

const vertexCount = doc => doc.getRoot().listMeshes().reduce((sum, m) => sum + m.listPrimitives().reduce((s, p) => s + p.getAttribute('POSITION').getCount(), 0), 0);

for (const name of TARGETS) {
  const path = `public/lobby/world/characters/${name}.glb`;
  const before = await fs.stat(path), doc = await io.read(path), root = doc.getRoot();
  if (root.listSkins().length || root.listMeshes().some(m => m.listPrimitives().some(p => p.listTargets().length)))
    throw new Error(`${name}: skinned or morphed meshes must not be welded`);
  const srcVertices = vertexCount(doc), print = fingerprint(doc);
  for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives()) assertNoCoincidentFaces(prim, name);
  await doc.transform(weld(), reorder({ encoder: MeshoptEncoder }));
  const dstVertices = vertexCount(doc);
  if (dstVertices >= srcVertices) { console.log(name, 'already welded'); continue; }
  const output = await io.writeBinary(doc), after = fingerprint(await io.readBinary(output));
  if (JSON.stringify(after) !== JSON.stringify(print)) throw new Error(`${name}: weld changed triangles, nodes, materials or textures`);
  await fs.writeFile(path, output);
  console.log(name, before.size, '->', output.byteLength, 'bytes,', srcVertices, '->', dstVertices, 'vertices');
}
