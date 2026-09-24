/** Prepare authored Poly Haven nature geometry and PBR maps for the world.
 * Sources and CC0 provenance: assets/lobby-world/organic-sources.json.
 * Usage: node --max-old-space-size=4096 scripts/build-organic-assets.mjs /source-directory [asset-name]
 * Trees use bake-tree-canopies.py and pack-tree-canopies.mjs instead.
 */
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
const require=createRequire(import.meta.url),sdk=createRequire(require.resolve('@gltf-transform/cli'));
const {NodeIO}=sdk('@gltf-transform/core');
const {prune,dedup,weld,simplifyPrimitive,draco,textureCompress,flatten}=sdk('@gltf-transform/functions');
const {ALL_EXTENSIONS}=sdk('@gltf-transform/extensions'),draco3d=sdk('draco3dgltf');
const {MeshoptSimplifier}=sdk('meshoptimizer'),sharp=createRequire(require.resolve('next/package.json'))('sharp');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.encoder':await draco3d.createEncoderModule()});
await MeshoptSimplifier.ready;
const names=process.argv[3]?[process.argv[3]]:['fern_02','shrub_02','rock_moss_set_01'];
for(const name of names){
 if(!['fern_02','shrub_02','rock_moss_set_01'].includes(name))throw new Error('Use the Blender canopy pipeline for trees.');
 const file=`${process.argv[2]}/${name}/${name}.gltf`;
 const doc=await io.read(file);await doc.transform(prune(),flatten(),weld());
 const root=doc.getRoot();
 // Keep the actual asymmetry, UVs and normal maps. Separate LOD budgets for
 // foliage and solid geometry prevent a tiny trunk from consuming the canopy budget.
 for(const mesh of root.listMeshes())for(const p of mesh.listPrimitives()){
  const triangles=p.getIndices().getCount()/3;
  const budget=name.includes('rock')?2300:4500;
  if(triangles>budget)simplifyPrimitive(p,{simplifier:MeshoptSimplifier,ratio:budget/triangles,error:.035,lockBorder:false});
 }
 for(const m of root.listMaterials()){
  m.setMetallicFactor(0);
  if(m.getAlphaMode()==='BLEND')m.setAlphaMode('MASK').setAlphaCutoff(.4);
 }
 await doc.transform(prune(),dedup(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[2048,2048],quality:88}),draco());
 const output=await io.writeBinary(doc);await fs.writeFile(`public/lobby/world/organic-${name}.glb`,output);
 console.log(name,output.byteLength,'bytes',root.listMeshes().map(m=>m.listPrimitives().reduce((a,p)=>a+p.getIndices().getCount()/3,0)));
}
