/** Distance LODs for the organic landscape kits, derived from the shipped GLBs.
 * Every mesh node gains `<name>~lod1` .. `~lod3` siblings, picked at
 * placement time by organic-vegetation.tsx.
 * tree_small_02 is deliberately excluded: all instances are near, its leaves
 * are 113k separate 4-triangle cards, and any rewrite of that GLB visibly
 * lightened the canopy beside the arch.
 * Errors are relative to mesh extent and sized to stay under ~1px at the
 * largest on-screen size of each tier (LOD_TIERS in lib/lobby/vegetation-lod.ts).
 * Usage: node --max-old-space-size=4096 scripts/build-vegetation-lods.mjs [fresh-directory]
 * Each write re-encodes LOD0 with Draco, so always start from a fresh
 * build-organic-assets.mjs output (or `git show` of the LOD-free GLBs) passed
 * as [fresh-directory]; without it the GLBs in public/lobby/world are read and
 * a file that already has LODs is skipped.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const require = createRequire(import.meta.url), sdk = createRequire(require.resolve('@gltf-transform/cli'));
const { NodeIO } = sdk('@gltf-transform/core');
const { prune, draco, compactPrimitive } = sdk('@gltf-transform/functions');
const { ALL_EXTENSIONS } = sdk('@gltf-transform/extensions'), draco3d = sdk('draco3dgltf');
const { MeshoptSimplifier } = sdk('meshoptimizer');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule(),
});
await MeshoptSimplifier.ready;

const LODS = [{ ratio: .3, error: .006 }, { ratio: .08, error: .02 }, { ratio: .015, error: .06 }];
const KITS = ['shrub_02', 'rock_moss_set_01', 'fern_02'], fresh = process.argv[2];

/** UVs weigh most: foliage shape lives in the alpha texture. */
function simplified(doc, source, { ratio, error }) {
  const indices = Uint32Array.from(source.getIndices().getArray());
  const positions = Float32Array.from(source.getAttribute('POSITION').getArray());
  const normal = source.getAttribute('NORMAL'), uv = source.getAttribute('TEXCOORD_0');
  const count = positions.length / 3, attributes = new Float32Array(count * 5);
  for (let i = 0; i < count; i++) {
    const n = normal.getElement(i, []), t = uv.getElement(i, []);
    attributes.set([n[0], n[1], n[2], t[0], t[1]], i * 5);
  }
  const target = Math.max(3, Math.floor(indices.length * ratio / 3) * 3);
  const [result] = MeshoptSimplifier.simplifyWithAttributes(indices, positions, 3, attributes, 5, [.25, .25, .25, 1, 1], null, target, error);
  const primitive = source.clone();
  primitive.setIndices(doc.createAccessor().setType('SCALAR').setArray(result).setBuffer(source.getIndices().getBuffer()));
  compactPrimitive(primitive);
  return primitive;
}

const triangles = mesh => mesh.listPrimitives().reduce((sum, p) => sum + p.getIndices().getCount() / 3, 0);

for (const name of KITS) {
  const file = `public/lobby/world/organic-${name}.glb`;
  const doc = await io.read(fresh ? `${fresh}/organic-${name}.glb` : file), root = doc.getRoot();
  if (root.listNodes().some(n => n.getName().includes('~lod'))) { console.log(name, 'already has LODs'); continue; }
  for (const node of root.listNodes().filter(n => n.getMesh())) {
    const parent = node.getParentNode(), scene = root.listScenes().find(s => s.listChildren().includes(node));
    const counts = [triangles(node.getMesh())];
    LODS.forEach((lod, i) => {
      const mesh = doc.createMesh(`${node.getMesh().getName()}~lod${i + 1}`);
      for (const p of node.getMesh().listPrimitives()) mesh.addPrimitive(simplified(doc, p, lod));
      const copy = doc.createNode(`${node.getName()}~lod${i + 1}`).setMesh(mesh)
        .setTranslation(node.getTranslation()).setRotation(node.getRotation()).setScale(node.getScale());
      (parent ?? scene).addChild(copy);
      counts.push(triangles(mesh));
    });
    console.log(name, node.getName(), counts.join(' / '));
  }
  await doc.transform(prune(), draco());
  const output = await io.writeBinary(doc);
  await fs.writeFile(file, output);
  console.log(name, (await fs.stat(file)).size, 'bytes');
}
