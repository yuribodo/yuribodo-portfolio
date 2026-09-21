/** Franchise-reference houses for the valley village, from user-supplied Sketchfab glTF downloads.
 * Sources, licenses and adaptations: assets/lobby-world/reference-house-sources.json, public/CREDITS.md.
 * Usage: node scripts/build-reference-houses.mjs /directory/with/sketchfab/zips [house-id]
 * Each input is either `<slug>.zip` (the "Autoconverted glTF" download) or an extracted `<slug>/` folder.
 */
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url),sdk=createRequire(require.resolve('@gltf-transform/cli'));
const {NodeIO,Document,getBounds}=sdk('@gltf-transform/core');
const {prune,dedup,weld,flatten,simplifyPrimitive,transformMesh,textureCompress,draco,mergeDocuments,unpartition}=sdk('@gltf-transform/functions');
const {ALL_EXTENSIONS}=sdk('@gltf-transform/extensions'),draco3d=sdk('draco3dgltf');
const {MeshoptSimplifier,MeshoptDecoder}=sdk('meshoptimizer'),sharp=createRequire(require.resolve('next/package.json'))('sharp');
await Promise.all([MeshoptSimplifier.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.encoder':await draco3d.createEncoderModule(),'draco3d.decoder':await draco3d.createDecoderModule(),'meshopt.decoder':MeshoptDecoder});

const manifest=JSON.parse(await fs.readFile('assets/lobby-world/reference-house-sources.json','utf8'));
const input=process.argv[2];
if(!input)throw new Error('Pass the directory containing the Sketchfab glTF downloads.');
const selected=process.argv[3]?manifest.houses.filter(h=>h.id===process.argv[3]):manifest.houses;
const scratch=await fs.mkdtemp(path.join(os.tmpdir(),'reference-houses-'));

async function locate(house){
 for(const slug of [house.slug,...(house.aliases??[])]){
  const folder=path.join(input,slug),zip=`${folder}.zip`;
  if(await fs.stat(folder).then(s=>s.isDirectory()).catch(()=>false))return folder;
  if(await fs.stat(zip).catch(()=>false)){
   const target=path.join(scratch,slug);await fs.mkdir(target,{recursive:true});
   execFileSync('unzip',['-o','-q',zip,'-d',target]);return target;
  }
 }
 if(process.argv[3])throw new Error(`Missing ${house.slug}.zip (or folder) for ${house.id} in ${input}`);
 console.warn(`skipping ${house.id}: no ${house.slug}.zip in ${input}`);return null;
}
async function findScene(folder){
 const entries=await fs.readdir(folder,{withFileTypes:true,recursive:true});
 const files=entries.filter(e=>e.isFile()).map(e=>path.join(e.parentPath??e.path,e.name));
 return files.find(f=>f.endsWith('.gltf'))??files.find(f=>f.endsWith('.glb'))??(()=>{throw new Error(`No glTF in ${folder}`)})();
}

/** Kitbashed Sketchfab models are hundreds of separate boxes; edge collapse alone cannot reduce
 * them. meshopt's Prune flag also drops components smaller than the error bound (nails, trims). */
function pruneSimplify(prim,ratio,error){
 const indices=prim.getIndices();if(!indices)return;
 const source=new Uint32Array(indices.getArray()),positions=prim.getAttribute('POSITION').getArray();
 const [result]=MeshoptSimplifier.simplify(source,positions,3,Math.floor(source.length*ratio/3)*3,error,['Prune']);
 indices.setArray(result);
 // A no-op simplification pass compacts the unreferenced vertices left behind.
 simplifyPrimitive(prim,{simplifier:MeshoptSimplifier,ratio:1,error:0});
}

/** A low sand dome replaces a source island that extended to the horizon. */
function addMound(doc,parent,buffer,{radius,height,depth,color}){
 const rings=6,segments=28,positions=[],normals=[],indices=[];
 for(let r=0;r<=rings;r++){
  const t=r/rings,rr=Math.sin(t*Math.PI/2)*radius,y=Math.cos(t*Math.PI/2)*height-(t===1?depth:0);
  for(let s=0;s<segments;s++){const a=s/segments*Math.PI*2;positions.push(Math.cos(a)*rr,y,Math.sin(a)*rr);normals.push(Math.cos(a)*t,1-t*.6,Math.sin(a)*t);}
 }
 for(let r=0;r<rings;r++)for(let s=0;s<segments;s++){const a=r*segments+s,b=r*segments+(s+1)%segments,c=a+segments,d=b+segments;indices.push(a,b,c,b,d,c);}
 const position=doc.createAccessor().setType('VEC3').setArray(new Float32Array(positions)).setBuffer(buffer);
 const normal=doc.createAccessor().setType('VEC3').setArray(new Float32Array(normals)).setBuffer(buffer);
 const index=doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(indices)).setBuffer(buffer);
 const material=doc.createMaterial('mound').setBaseColorFactor([...color,1]).setMetallicFactor(0).setRoughnessFactor(1).setDoubleSided(true);
 const prim=doc.createPrimitive().setAttribute('POSITION',position).setAttribute('NORMAL',normal).setIndices(index).setMaterial(material);
 const mesh=doc.createMesh('mound').addPrimitive(prim);parent.addChild(doc.createNode('mound').setMesh(mesh));
}

const merged=new Document();merged.createBuffer();
const scene=merged.createScene('reference-houses');
for(const house of selected){
 const folder=await locate(house);if(!folder)continue;
 const file=await findScene(folder);
 const doc=await io.read(file);
 // Decoded geometry is recompressed once for the merged output.
 for(const ext of doc.getRoot().listExtensionsUsed())if(/meshopt|draco|quantization/i.test(ext.extensionName))ext.dispose();
 await doc.transform(prune(),flatten(),weld());
 const root=doc.getRoot(),source=root.listScenes()[0];
 // Drop meshes the author included as scene dressing (ground planes, sky boxes, reference cards).
 for(const node of source.listChildren())if(house.dropNodes?.some(p=>new RegExp(p,'i').test(node.getName()||'')))node.dispose();
 await doc.transform(prune());
 // Bake node transforms so that each house is centered in XZ, sits on y=0 and matches its target height.
 const bounds=getBounds(source),size=bounds.max.map((v,i)=>v-bounds.min[i]);
 const axis={x:0,y:1,z:2}[house.sizeAxis??'y'],scale=house.size/size[axis];
 const cx=(bounds.min[0]+bounds.max[0])/2,cz=(bounds.min[2]+bounds.max[2])/2;
 const yaw=(house.yaw??0)*Math.PI/180,c=Math.cos(yaw),s=Math.sin(yaw);
 for(const node of source.listChildren()){
  const t=node.getTranslation();
  node.setTranslation([t[0]-cx,t[1]-bounds.min[1],t[2]-cz]);
 }
 // Reduce to a web budget, retaining texture coordinates and normals.
 let triangles=0,index=0;
 for(const mesh of root.listMeshes()){
  const nodes=root.listNodes().filter(n=>n.getMesh()===mesh);
  for(const node of nodes){
   // Apply the node transform, then yaw/scale, to the primitives themselves; runtime instancing expects local geometry.
   const bake=[c*scale,0,-s*scale,0, 0,scale,0,0, s*scale,0,c*scale,0, 0,0,0,1];
   const own=mesh.listParents().filter(p=>p.propertyType==='Node').length>1?mesh.clone():mesh;
   node.setMesh(own);
   transformMesh(own,node.getWorldMatrix());
   transformMesh(own,bake);
   node.setMatrix([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
   own.setName(`${house.id}:${index++}`);node.setName(own.getName());
  }
 }
 for(const mesh of root.listMeshes())for(const p of mesh.listPrimitives()){
  const count=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;
  const budget=house.triangleBudget??7000,share=Math.max(1,count)/Math.max(1,root.listMeshes().reduce((a,m)=>a+m.listPrimitives().reduce((b,q)=>b+(q.getIndices()?.getCount()??q.getAttribute('POSITION').getCount())/3,0),0));
  const target=Math.max(300,budget*share);
  if(count>target)pruneSimplify(p,target/count,house.simplifyError??.05);
  triangles+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;
 }
 for(const m of root.listMaterials()){
  // Optional per-channel gain baked into the base colour, e.g. warming an olive roof toward terracotta.
  const gain=house.tint?.[m.getName()],texture=m.getBaseColorTexture();
  if(gain&&texture){
   const image=await sharp(Buffer.from(texture.getImage())).linear(gain,[0,0,0]).png().toBuffer();
   texture.setImage(new Uint8Array(image)).setMimeType('image/png');
  }
  m.setName(`${house.id}:${m.getName()}`);
  m.setMetallicFactor(0);
  if(m.getRoughnessFactor()<.6)m.setRoughnessFactor(.75);
  // Distant painted buildings: base colour only; relief and gloss maps do not read at village scale.
  m.setMetallicRoughnessTexture(null);m.setNormalTexture(null);m.setOcclusionTexture(null);
  if(m.getAlphaMode()==='BLEND')m.setAlphaMode('MASK').setAlphaCutoff(.5);
  m.setDoubleSided(house.doubleSided??false);
 }
 for(const n of root.listNodes())if(!n.getMesh()&&n.listChildren().length===0)n.dispose();
 await doc.transform(prune(),dedup());
 // Group under one named root so the runtime can address the house by id.
 const group=doc.createNode(house.id);
 for(const node of source.listChildren())if(node!==group){source.removeChild(node);group.addChild(node);}
 source.addChild(group);
 if(house.mound){
  addMound(doc,group,root.listBuffers()[0]??doc.createBuffer(),house.mound);
  const mound=group.listChildren().at(-1);mound.setName(`${house.id}:${index}`);mound.getMesh().setName(`${house.id}:${index++}`);
  mound.getMesh().listPrimitives()[0].getMaterial().setName(`${house.id}:mound`);
 }
 const map=mergeDocuments(merged,doc);
 for(const child of map.get(source).listChildren())scene.addChild(child);
 map.get(source).dispose();
 console.log(house.id,Math.round(triangles),'triangles','from',path.relative(input,file));
}
for(const s of merged.getRoot().listScenes())if(s!==scene)s.dispose();
await merged.transform(unpartition(),prune(),dedup(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[768,768],quality:84}),draco());
const output=await io.writeBinary(merged);
const target=process.argv[3]?`/tmp/reference-house-${process.argv[3]}.glb`:'public/lobby/world/reference-houses.glb';
await fs.writeFile(target,output);
console.log(target,output.byteLength,'bytes');
await fs.rm(scratch,{recursive:true,force:true});
