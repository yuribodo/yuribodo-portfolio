/** Quaternius Mill (CC0): retain the authored rotor as a separate moving part.
 * Source: https://poly.pizza/m/89dsFYAoX1
 * node scripts/build-living-mill.mjs /path/to/source-mill.glb
 */
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
globalThis.FileReader=class {async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}};
if(!process.argv[2])throw Error('Pass the source Mill GLB.');
const bytes=await readFile(process.argv[2]);
const {scene:source}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
source.updateMatrixWorld(true);
const bounds=new T.Box3().setFromObject(source),center=bounds.getCenter(new T.Vector3()),scale=11/(bounds.max.y-bounds.min.y);
const bladeBounds=new T.Box3();source.traverse(o=>{if(o.isMesh&&o.name.startsWith('Mill_Blades'))bladeBounds.union(new T.Box3().setFromObject(o));});
const pivot=bladeBounds.getCenter(new T.Vector3());pivot.sub(new T.Vector3(center.x,bounds.min.y,center.z)).multiplyScalar(scale);
const palette={Wood:'#71604d',Wood_Side:'#908068',Wood_Light:'#87715b',Plaster:'#d6ceaf',Windows:'#405665',RoofTiles:'#668695',Stone:'#8b9594',Stone_Dark:'#737f83',Stone_Light:'#b8beb2',Green:'#7e996a'};
const pieces={body:[],rotor:[]};
source.traverse(o=>{
 if(!o.isMesh)return;
 const kind=o.name.startsWith('Mill_Blades')?'rotor':'body';
 let g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);g.translate(-center.x,-bounds.min.y,-center.z);g.scale(scale,scale,scale);
 if(g.index){const indexed=g;g=g.toNonIndexed();indexed.dispose();}
 const p=g.attributes.position,n=g.attributes.normal,c=new T.Color(palette[o.material.name]??'#adad93'),colors=[];
 for(let i=0;i<p.count;i++){
  const shade=(.88+.12*Math.min(1,p.getY(i)/1.2))*(n.getY(i)<-.3?.72:1)*(.96+.04*Math.sin(p.getX(i)*4+p.getY(i)*5+p.getZ(i)*3));
  colors.push(c.r*shade,c.g*shade,c.b*shade);
 }
 if(kind==='rotor')g.translate(-pivot.x,-pivot.y,-pivot.z);
 g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 for(const attr of Object.keys(g.attributes))if(!['position','normal','color'].includes(attr))g.deleteAttribute(attr);
 g.clearGroups();pieces[kind].push(g);
});
const scene=new T.Scene(),material=new T.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0});
for(const [kind,geometries] of Object.entries(pieces)){
 const mesh=new T.Mesh(mergeGeometries(geometries),material);mesh.name=kind;
 if(kind==='rotor')mesh.position.copy(pivot);
 scene.add(mesh);geometries.forEach(g=>g.dispose());
}
await writeFile('/tmp/skybound-living-mill.glb',Buffer.from(await new GLTFExporter().parseAsync(scene,{binary:true})));
execFileSync('pnpm',['exec','gltf-transform','optimize','/tmp/skybound-living-mill.glb','public/lobby/world/living-mill.glb','--compress','draco','--simplify','false','--join','false','--flatten','false'],{stdio:'inherit'});
console.log('Rotor pivot:',pivot.toArray());
