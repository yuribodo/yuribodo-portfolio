/**
 * Rebuild the small, vertex-painted world GLBs. No Blender or remote assets
 * required. Kenney rock/grass source geometry is CC0; see assets/lobby-world.
 * Run: node scripts/build-lobby-world.mjs
 */
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'public/lobby/world');
await mkdir(output,{recursive:true});
// GLTFExporter uses the browser FileReader API for binary packaging only.
class BinaryReader {
  async readAsArrayBuffer(blob) {
    this.result=await blob.arrayBuffer();
    this.onloadend?.();
  }
}
globalThis.FileReader=BinaryReader;

let seed=8317;
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
const parts=[];
const white=new T.MeshStandardMaterial({vertexColors:true,roughness:1});
function add(geometry,color,position=[0,0,0],scale=[1,1,1],rotation=[0,0,0]){
  const g=geometry.clone();
  // Only attributes shared by every primitive are exported.
  for(const name of Object.keys(g.attributes))if(!['position','normal'].includes(name))g.deleteAttribute(name);
  const m=new T.Matrix4().compose(new T.Vector3(...position),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(...scale));
  g.applyMatrix4(m);
  const c=new T.Color(color);
  const colors=new Float32Array(g.attributes.position.count*3);
  for(let i=0;i<colors.length;i+=3){colors[i]=c.r;colors[i+1]=c.g;colors[i+2]=c.b;}
  g.setAttribute('color',new T.BufferAttribute(colors,3));
  const uv=[];
  const vertices=g.attributes.position,normals=g.attributes.normal;
  for(let i=0;i<vertices.count;i++){
    const nx=Math.abs(normals.getX(i)),ny=Math.abs(normals.getY(i)),nz=Math.abs(normals.getZ(i));
    if(ny>nx&&ny>nz)uv.push(vertices.getX(i),vertices.getZ(i));
    else if(nx>nz)uv.push(vertices.getZ(i),vertices.getY(i));
    else uv.push(vertices.getX(i),vertices.getY(i));
  }
  g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  parts.push(g.index?g.toNonIndexed():g);
  if(g.index)g.dispose();
  geometry.dispose();
}
const box=(p,s,c,r=[0,0,0])=>add(new T.BoxGeometry(1,1,1),c,p,s,r);
const cylinder=(p,rt,rb,h,c,segments=48)=>add(new T.CylinderGeometry(rt,rb,h,segments),c,p);
const sphere=(p,s,c,detail=1)=>add(new T.IcosahedronGeometry(1,detail),c,p,s);
const palette={stone:'#c6c6b6',light:'#e1dfc9',shadow:'#8d978c',grass:'#708c4a',leaf:'#537443',steel:'#537e99',rim:'#92b3c7',dark:'#314f6c',window:'#263f59',roof:'#ac594e'};

function beam(start,end,width,color){
 const a=new T.Vector3(...start),b=new T.Vector3(...end),d=b.clone().sub(a);
 const r=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.clone().normalize()));
 add(new T.CylinderGeometry(width*0.7,width,d.length(),6),color,a.add(b).multiplyScalar(0.5).toArray(),[1,1,1],[r.x,r.y,r.z]);
}

function masonry(p,s,c){
 const [w,h,d]=s,cut=Math.min(w,d)*0.055;
 const outline=new T.Shape();
 for(const [i,[x,z]] of [[-w/2+cut,-d/2],[w/2-cut,-d/2],[w/2,-d/2+cut],[w/2,d/2-cut],[w/2-cut,d/2],[-w/2+cut,d/2],[-w/2,d/2-cut],[-w/2,-d/2+cut]].entries()){
  if(i===0)outline.moveTo(x,z);else outline.lineTo(x,z);
 }
 outline.closePath();
 add(new T.ExtrudeGeometry(outline,{depth:h,bevelEnabled:true,bevelSize:0.009,bevelThickness:0.009,bevelSegments:1,steps:1}),c,[p[0],p[1]-h/2,p[2]],[1,1,1],[-Math.PI/2,0,0]);
}

function tree(x,y,z,h,detail=1){
 beam([x,y,z],[x+h*0.03,y+h*0.72,z],h*0.036,'#667363');
 for(let lobe=0;lobe<7;lobe++){
  const a=lobe*2.4,r=h*(lobe===0?0:0.22),cy=y+h*(0.68+(lobe%3)*0.1);
  const cx=x+Math.cos(a)*r,cz=z+Math.sin(a)*r;
  if(lobe%2===0)beam([x,y+h*0.35,z],[cx,cy,cz],h*0.015,'#667363');
  sphere([cx,cy,cz],[h*0.24,h*0.21,h*0.24],['#47745b','#5b865d','#759557'][lobe%3],detail);
 }
}

async function save(name){
  const geom=mergeGeometries(parts);
  if(name!=='terrace')geom.deleteAttribute('uv');
  for(const g of parts)g.dispose();
  parts.length=0;
  const mesh=new T.Mesh(geom,white);
  mesh.name=name;
  const group=new T.Group();group.name=name;group.add(mesh);
  const binary=await new GLTFExporter().parseAsync(group,{binary:true,onlyVisible:true});
  await writeFile(path.join(output,name+'.glb'),Buffer.from(binary));
  const raw=path.join(output,name+'.glb');
  const compressed=path.join(output,name+'.compressed.glb');
  execFileSync(path.join(root,'node_modules/.bin/gltf-transform'),['meshopt',raw,compressed],{stdio:'pipe'});
  await rename(compressed,raw);
  console.log(name,geom.attributes.position.count/3,'triangles',(await readFile(raw)).byteLength,'compressed bytes');
  geom.dispose();
}

async function sourceGeometry(file){
  const bytes=await readFile(path.join(root,file));
  const jsonLen=bytes.readUInt32LE(12);
  const json=JSON.parse(bytes.subarray(20,20+jsonLen).toString());
  // Source surfaces are repainted for this scene, so no texture decoding.
  delete json.images;delete json.textures;
  json.materials=[{}];
  for(const mesh of json.meshes)for(const primitive of mesh.primitives)primitive.material=0;
  const binOffset=20+jsonLen;
  const bin=bytes.subarray(binOffset+8,binOffset+8+bytes.readUInt32LE(binOffset));
  const text=Buffer.from(JSON.stringify(json));
  const padded=Buffer.alloc(Math.ceil(text.length/4)*4,32);text.copy(padded);
  const glb=Buffer.alloc(28+padded.length+bin.length);
  glb.writeUInt32LE(0x46546c67,0);glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);
  glb.writeUInt32LE(padded.length,12);glb.writeUInt32LE(0x4e4f534a,16);padded.copy(glb,20);
  glb.writeUInt32LE(bin.length,20+padded.length);glb.writeUInt32LE(0x004e4942,24+padded.length);bin.copy(glb,28+padded.length);
  const scene=(await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.byteLength),'' )).scene;
  scene.updateMatrixWorld(true);
  const meshes=[];
  scene.traverse(o=>{if(o.isMesh)meshes.push(o.geometry.clone().applyMatrix4(o.matrixWorld))});
  const g=mergeGeometries(meshes.map(g=>{g.deleteAttribute('uv');return g.index?g.toNonIndexed():g}));
  g.computeBoundingBox();
  const size=g.boundingBox.getSize(new T.Vector3());
  const center=g.boundingBox.getCenter(new T.Vector3());
  g.translate(-center.x,-g.boundingBox.min.y,-center.z);
  g.scale(1/size.y,1/size.y,1/size.y);
  return g;
}
const rock=await sourceGeometry('assets/lobby-world/source/kenney-rock.glb');
const grass=await sourceGeometry('assets/lobby-world/source/kenney-grass.glb');

// Ground height is supplied by the measured desk bounds at runtime.
// A broad stone terrace with irregular inset slabs and a grass perimeter.
box([0,-0.25,1.5],[14,0.5,11],'#78855f');
for(let x=-7;x<=7;x++)for(let z=-4;z<=7;z++){
  if(Math.abs(x)>5&&Math.abs(z)>5)continue;
  const shade=['#d1d0bc','#c9cbbb','#c3c6b6','#d9d8c6'][Math.floor(random()*4)];
  masonry([x*0.97+(z%2)*0.15,random()*0.012-0.015,z*0.97],[0.93+random()*0.018,0.09,0.93+random()*0.018],shade);
}
// Rubble and low parapets frame the side edges, keeping the monitor clear.
for(let i=0;i<48;i++){
  const side=i%2?1:-1;
  const x=side*(3.3+random()*3.2),z=-3.5+random()*10;
  add(rock.clone(),['#b5b398','#c9c2a4','#999f83'][i%3],[x,0,z],[0.18+random()*0.42,0.17+random()*0.3,0.25+random()*0.4],[0,random()*6.28,0]);
}
for(let i=0;i<55;i++){
  const x=(random()-0.5)*13,z=-3.5+random()*10;
  if(Math.abs(x)<2.3&&z>-2.5&&z<3.5)continue;
  const h=0.035+random()*0.05;
  add(grass.clone(),['#6e8c43','#92a558','#547d42'][i%3],[x,0.015,z],[h,h,h],[0,random()*6.28,0]);
}
// Nearby ruined arch on the right. Each voussoir is an actual wedge.
const archX=3.95,archZ=-4.3,radius=1.15,thickness=0.32,spring=2.05;
for(const side of [-1,1])for(let j=0;j<6;j++){
  masonry([archX+side*(radius+thickness/2),0.17+j*0.34,archZ],[0.4,0.335,0.65],j%2?palette.stone:palette.light);
}
for(let i=0;i<13;i++){
  const start=i*Math.PI/13+0.012,end=(i+1)*Math.PI/13-0.012;
  const shape=new T.Shape();
  shape.absarc(0,0,radius+thickness,start,end,false);
  shape.absarc(0,0,radius,end,start,true);shape.closePath();
  add(new T.ExtrudeGeometry(shape,{depth:0.65,bevelEnabled:false,curveSegments:3}),i%3?palette.stone:palette.light,[archX,spring,archZ-0.325]);
}
// Broken masonry and moss frame the vista at the edge of the terrace.
for(let j=0;j<3;j++)masonry([-3.8,0.16+j*0.32,-3.9],[0.62,0.31,0.64],palette.stone);
for(const side of [-1,1])for(let i=0;i<7;i++){
 const x=side*(2.5+i*0.48);
 masonry([x,0.15,-4.1],[0.45,0.3,0.42],palette.stone);
 if(i>2)masonry([x+0.08,0.43,-4.1],[0.46,0.26,0.43],palette.light);
}
// Fine vines and individually shaped leaves replace the geometric ivy blocks.
const leaf=new T.Shape();leaf.moveTo(0,-0.8);leaf.bezierCurveTo(-0.6,-0.25,-0.72,0.38,0,0.85);leaf.bezierCurveTo(0.65,0.4,0.6,-0.25,0,-0.8);
for(let vine=0;vine<9;vine++){
 const x=archX-1.4+vine*0.3,top=spring+Math.sqrt(Math.max(0,(radius+thickness)**2-(x-archX)**2));
 const length=0.6+random()*1.9;
 const points=[];
 for(let j=0;j<15;j++)points.push(new T.Vector3(x+Math.sin(j*0.7+vine)*0.08,top-j/14*length,archZ+0.39+Math.cos(j*0.5)*0.035));
 add(new T.TubeGeometry(new T.CatmullRomCurve3(points),20,0.009,3,false),'#536b3b');
 for(let j=1;j<15;j++)for(const side of [-1,1]){
  const q=points[j];
  add(new T.ShapeGeometry(leaf),'#618342',[q.x+side*0.065,q.y,q.z+0.012],[0.085,0.12,1],[0,side*0.3,side*(0.5+random()*0.6)]);
 }
}
await save('terrace');

// Aincrad's iconic stacked floors: built as one merged mesh, not hundreds
// of React objects. Front windows and projecting decks remain geometric.
const floors=27;
function floorRadius(i){
 const tier=Math.floor(i/3)*3;
 return 0.85+10.65*Math.pow(1-tier/floors,1.12)-(i-tier)*0.19;
}
for(let i=0;i<floors;i++){
 const y=i*0.7,r=floorRadius(i),next=floorRadius(i+1);
 const major=i%4===0;
 cylinder([0,y,0],next,r,0.63,i%4===2?'#648da5':palette.steel,64);
 cylinder([0,y-0.29,0],r+(major?0.47:0.16),r+0.12,major?0.18:0.075,palette.rim,64);
 cylinder([0,y+0.24,0],next+0.04,next+0.04,0.08,palette.dark,64);
 const n=Math.max(8,Math.floor(r*4));
 for(let k=0;k<n;k++){
  const a=k/n*Math.PI*2;
  // Recessed window groups and pale structural piers create inhabited floors.
  box([Math.sin(a)*(r-0.11),y+0.015,Math.cos(a)*(r-0.11)],[0.2,0.28,0.028],palette.window,[0,a,0]);
  if(k%3===0)box([Math.sin(a)*(r+0.02),y,Math.cos(a)*(r+0.02)],[0.055,0.5,0.055],palette.rim,[0,a,0]);
 }
 if(major){
  for(let k=0;k<12;k++){
   const a=k/12*Math.PI*2;
   box([Math.sin(a)*(r+0.21),y-0.12,Math.cos(a)*(r+0.21)],[0.09,0.38,0.16],palette.rim,[0,a,0]);
  }
 }
}
// Wide lower rim and radial landings, with suspended tapered undercroft.
cylinder([0,-0.45,0],12.2,11.6,0.7,palette.steel,64);
cylinder([0,-0.1,0],12.5,12.5,0.12,palette.rim,64);
cylinder([0,-3.8,0],11.6,3.8,6.2,palette.dark,64);
cylinder([0,-7.8,0],3.8,1.2,2.4,palette.steel,40);
cylinder([0,-9.7,0],1.2,0.1,1.4,palette.dark,24);
for(let i=0;i<12;i++){
 const a=i/12*Math.PI*2;
 box([Math.sin(a)*13.8,-0.35,Math.cos(a)*13.8],[0.52,0.19,5.2],palette.rim,[0,a,0]);
 cylinder([Math.sin(a)*16.1,0.8,Math.cos(a)*16.1],0.06,0.22,2.9,palette.rim,8);
 cylinder([Math.sin(a)*16.1,-1.35,Math.cos(a)*16.1],0.12,0.02,1.8,palette.dark,8);
}
cylinder([0,19.25,0],0.75,1.05,1.8,palette.steel,20);
for(let i=0;i<5;i++){const a=i/5*Math.PI*2;cylinder([Math.cos(a)*0.7,20.1,Math.sin(a)*0.7],0.06,0.22,2.2,palette.rim,10);}
cylinder([0,20.4,0],0.12,0.55,2.6,palette.rim,16);
cylinder([0,21.5,0],0.01,0.22,1.5,palette.light,12);
for(let i=0;i<18;i++){
 const a=i/18*Math.PI*2;
 const start=new T.Vector3(Math.sin(a)*11.4,-0.8,Math.cos(a)*11.4);
 const end=new T.Vector3(Math.sin(a)*3.8,-6.9,Math.cos(a)*3.8);
 const direction=end.clone().sub(start);
 const rotation=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction.clone().normalize()));
 add(new T.CylinderGeometry(0.13,0.23,direction.length(),6),palette.rim,start.add(end).multiplyScalar(0.5).toArray(),[1,1,1],[rotation.x,rotation.y,rotation.z]);
}
await save('sky-citadel');

function island(p,s,{forest=true}={}){
 const count=44,depth=[0,0.09,0.21,0.43,0.65,0.86],width=[1,1.015,0.86,0.65,0.34,0.05];
 const radii=Array.from({length:count},(_,i)=>0.89+0.08*Math.sin(i*0.7)+0.07*Math.cos(i*1.9)+random()*0.04);
 const rings=depth.map((d,ring)=>radii.map((r,i)=>{
  const a=i/count*Math.PI*2;
  return [p[0]+Math.cos(a)*r*width[ring]*s+s*0.08*d,p[1]-s*d*(0.78+0.2*Math.sin(i*0.6))+(ring>0?(random()-0.5)*s*0.035:0),p[2]+Math.sin(a)*r*width[ring]*s*0.75];
 }));
 for(let ring=0;ring<depth.length-1;ring++)for(let i=0;i<count;i++){
  const j=(i+1)%count,vertices=[...rings[ring][i],...rings[ring][j],...rings[ring+1][i],...rings[ring][j],...rings[ring+1][j],...rings[ring+1][i]];
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();
  const color=new T.Color(['#bed0a0','#c2cbb5','#b4c1b0','#9db3ad','#87a5a5'][ring]);
  color.multiplyScalar(0.91+0.07*Math.sin(i*0.55)+random()*0.025);
  add(geo,color);
 }
 const shape=new T.Shape();
 rings[0].forEach(([x,,z],i)=>{if(i===0)shape.moveTo(x-p[0],p[2]-z);else shape.lineTo(x-p[0],p[2]-z)});shape.closePath();
 add(new T.ShapeGeometry(shape),'#78975a',p,[1,1,1],[-Math.PI/2,0,0]);
 // Hanging rock teeth and ledges break up the inverted-cone silhouette.
 for(let i=0;i<19;i++){
  const a=i/19*Math.PI*2,r=s*(0.55+random()*0.25),h=s*(0.12+random()*0.24);
  const x=p[0]+Math.cos(a)*r,z=p[2]+Math.sin(a)*r*0.75;
  add(rock.clone(),i%3?'#aebfaf':'#c2cbb4',[x,p[1]-h*0.65,z],[s*0.15,h,s*0.17],[0,a,Math.PI]);
  sphere([x,p[1]+s*0.015,z],[s*0.13,s*0.027,s*0.09],i%2?'#648752':'#89a35c',1);
 }
 if(forest)for(let i=0;i<12;i++){
  const a=i*2.399,r=s*(0.3+random()*0.48);
  tree(p[0]+Math.cos(a)*r,p[1],p[2]+Math.sin(a)*r*0.6,s*(0.1+random()*0.08),0);
 }
}
// Chess landmark: readable Staunton silhouette, not a horse character.
island([0,0,0],8.5,{forest:false});
for(let i=0;i<9;i++)tree(-6+i*1.45,0,-3.7,1.1+random()*0.7);
const pawnPoints=[[0,0],[1.8,0],[1.9,0.3],[1.5,0.6],[1.2,0.75],[0.65,1.1],[0.5,3.2],[1,3.6],[1,3.9],[0.65,4.05]];
add(new T.LatheGeometry(pawnPoints.map(p=>new T.Vector2(...p)),32),'#9285bb',[4,0,0]);
add(new T.SphereGeometry(1,32,20),'#bab0d5',[4,5,0],[1.25,1.25,1.25]);
const basePoints=[[0,0],[2,0],[2.15,0.35],[1.8,0.65],[1.55,0.85],[1.45,1.1],[1.55,1.4],[0,1.4]];
add(new T.LatheGeometry(basePoints.map(p=>new T.Vector2(...p)),32),'#857bae',[-2,0,0]);
const knight=new T.Shape();
knight.moveTo(-1.4,1.25);knight.lineTo(1.3,1.25);knight.bezierCurveTo(1.45,3.1,1.2,4.9,0.35,6.1);
knight.lineTo(-0.2,6.9);knight.lineTo(-0.45,6.15);knight.lineTo(-1,6.6);knight.lineTo(-1.05,5.9);
knight.lineTo(-1.95,5.25);knight.lineTo(-2.2,4.3);knight.lineTo(-1.5,3.9);knight.lineTo(-0.85,4.2);
knight.lineTo(-0.6,3.8);knight.lineTo(-0.5,2.6);knight.closePath();
add(new T.ExtrudeGeometry(knight,{depth:1.1,bevelEnabled:true,bevelSize:0.22,bevelThickness:0.3,bevelSegments:3,steps:1,curveSegments:10}),'#a092c6',[-2,0,-0.55]);
sphere([-3,5.25,0.74],[0.12,0.12,0.04],'#787db1',1);
for(let i=0;i<8;i++){
 const y=2.15+i*0.43,x=-0.82-(i>4?(i-4)*0.15:0);
 box([x,y,0.77],[0.3,0.045,0.035],'#7770a3',[0,0,-0.22]);
}
sphere([-3.9,4.55,0.76],[0.085,0.065,0.025],'#676791',1);
cylinder([-2,1.2,0],1.55,1.55,0.08,'#cec4e0',40);
cylinder([4,0.35,0],1.9,1.9,0.055,'#cec4e0',40);
await save('chess-island');

// Rear academy: clustered towers, red roofs and a fortified approach.
island([0,-1.5,0],14,{forest:false});
for(let i=0;i<20;i++){const a=i/20*Math.PI*2;tree(Math.cos(a)*11,-1.5,Math.sin(a)*7,1.8+random()*1.5);}
box([0,0,0],[11,3,6],'#d4d2bf');
box([0,2,0],[5,3.8,5],'#e0d9bd');
// Pitched roofs, buttresses and an entrance distinguish the inhabited academy.
for(const x of [-3.5,3.5]){
 add(new T.CylinderGeometry(0,1,1,4),palette.roof,[x,2.35,0],[3.1,1.7,5.2],[0,Math.PI/4,0]);
 for(let j=0;j<4;j++)box([x+(x<0?-1.2:1.2),0.2,-2.4+j*1.6],[0.24,3.4,0.38],'#b9c2b2');
}
box([0,0.2,3.06],[1.1,2.4,0.1],'#4a6c79');
box([0,1.65,3.14],[1.6,0.18,0.2],palette.light);
for(const [x,z,h] of [[-5,-2,6],[5,-2,7],[-5,2,5],[5,2,5],[0,0,9]]){
 cylinder([x,h/2,z],0.9,1.05,h,'#d6d3bc',20);
 cylinder([x,h+1.1,z],0,1.25,2.4,palette.roof,20);
 cylinder([x,h-0.1,z],1.03,1.03,0.18,palette.light,20);
 for(let j=1;j<4;j++)for(let k=0;k<8;k++){
  const a=k/8*Math.PI*2;
  box([x+Math.sin(a)*0.99,j*h/4,z+Math.cos(a)*0.99],[0.2,0.65,0.045],'#476b7e',[0,a,0]);
 }
 cylinder([x,h+0.05,z],1.28,1.28,0.09,'#d4cbb4',24);
 cylinder([x,h+2.45,z],0.02,0.07,0.5,'#bdbda4',8);
}
for(let i=0;i<8;i++){
 box([-4.7+i*1.35,0.25,3.05],[0.25,0.95,0.04],'#6e8790');
 box([-4.7+i*1.35,1.8,3.05],[0.25,0.95,0.04],'#6e8790');
}
box([0,-0.9,7],[2.4,0.4,9],'#bfc6b0');
for(let i=0;i<16;i++){
 const x=(random()-0.5)*21,z=4+random()*5;
 if(Math.abs(x)<2)continue;
 box([x,-1.2,z],[0.9,1.1,1.1],'#e5d3b1');
 add(new T.ConeGeometry(0.95,0.8,4),palette.roof,[x,-0.35,z],[1,1,1],[0,Math.PI/4,0]);
}
await save('academy-island');

for(const [x,y,z,s] of [[-67,3,-145,4.5],[24,5,-140,3.8],[-6,11,-165,2.8],[65,12,90,4],[-60,7,120,5]])island([x,y,z],s);
await save('floating-islands');
rock.dispose();grass.dispose();white.dispose();
