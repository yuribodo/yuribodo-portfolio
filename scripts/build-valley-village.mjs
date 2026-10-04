/** Quaternius Medieval Village (CC0), normalized and palette-adapted for Skybound.
 * Inputs: https://quaternius.com/packs/medievalvillage.html (GLBs via Poly Pizza).
 * node scripts/build-valley-village.mjs /path/to/source/glbs
 */
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
globalThis.FileReader = class { async readAsArrayBuffer(blob) { this.result=await blob.arrayBuffer();this.onloadend?.(); } };
const input=process.argv[2];
if(!input)throw new Error('Pass a directory containing the licensed source GLBs.');
const heights={'house-a':2.8,'house-b':6.1,'house-c':6.1,inn:6.4,mill:11,tower:12,market:2.2,well:1.5};
const palette={Wood:'#71604d',Wood_Side:'#908068',Wood_Light:'#87715b',Plaster:'#d6ceaf',Windows:'#405665',RoofTiles:'#668695',RoofTiles_Red:'#a67461',Stone:'#8b9594',Stone_Dark:'#737f83',Stone_Light:'#b8beb2',Green:'#7e996a'};
const scene=new T.Scene();
const material=new T.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,envMapIntensity:.1});material.name='Village painted surfaces';
for(const [name,height]of Object.entries(heights)){
 const bytes=await readFile(`${input}/${name}.glb`);
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 gltf.scene.updateMatrixWorld(true);
 const bounds=new T.Box3().setFromObject(gltf.scene),center=bounds.getCenter(new T.Vector3());
 const scale=height/(bounds.max.y-bounds.min.y),pieces=[];
 gltf.scene.traverse(o=>{
  if(!o.isMesh)return;
  let g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);g.translate(-center.x,-bounds.min.y,-center.z);g.scale(scale,scale,scale);
  if(g.index){const old=g;g=g.toNonIndexed();old.dispose()}
  const v=g.attributes.position,n=g.attributes.normal,colors=new Float32Array(v.count*3);
  const groups=g.groups.length?g.groups:[{start:0,count:v.count,materialIndex:0}];
  for(const group of groups){
   const source=Array.isArray(o.material)?o.material[group.materialIndex]:o.material;
   const c=palette[source.name]?new T.Color(palette[source.name]):source.color.clone().lerp(new T.Color('#adad93'),.3);
   for(let i=group.start;i<group.start+group.count;i++){
    // Gentle painted occlusion under overhangs and at foundations.
    const shade=(.88+.12*Math.min(1,v.getY(i)/1.2))*(n.getY(i)<-.3?.72:1)*(.96+.04*Math.sin(v.getX(i)*4+v.getY(i)*5+v.getZ(i)*3));
    colors.set([c.r*shade,c.g*shade,c.b*shade],i*3);
   }
  }
  g.setAttribute('color',new T.BufferAttribute(colors,3));
  for(const attr of Object.keys(g.attributes))if(!['position','normal','color'].includes(attr))g.deleteAttribute(attr);
  g.clearGroups();pieces.push(g);
 });
 const merged=mergeGeometries(pieces),mesh=new T.Mesh(merged,material);mesh.name=name;scene.add(mesh);
 pieces.forEach(g=>g.dispose());console.log(name,merged.attributes.position.count/3,'triangles');
}
const buffer=await new GLTFExporter().parseAsync(scene,{binary:true});
const output='public/lobby/world/valley-village.glb';await writeFile('/tmp/valley-village-raw.glb',Buffer.from(buffer));
execFileSync('pnpm',['exec','gltf-transform','optimize','/tmp/valley-village-raw.glb',output,'--compress','draco','--simplify','false','--join','false','--flatten','false'],{stdio:'inherit'});
