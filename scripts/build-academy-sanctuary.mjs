/** Original Ranoa-inspired campus study: arcaded wings, pitched slate roofs,
 * buttressed hall and a clock tower. Rebuild with node scripts/build-academy-sanctuary.mjs.
 * This is an interpretation of the approved academy motif, not an anime replica.
 */
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { writeFile, rename } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
globalThis.FileReader = class { async readAsArrayBuffer(blob) { this.result=await blob.arrayBuffer(); this.onloadend?.(); } };
const palette={stone:'#bec5ba',trim:'#d5d3b9',roof:'#648597',shadow:'#54707b',grass:'#638873',rock:'#8d9f95',brass:'#b4aa79'};
const parts=Object.fromEntries(Object.keys(palette).map(k=>[k,[]]));
function add(g,key,p=[0,0,0],rotation=[0,0,0]){
 g.rotateX(rotation[0]);g.rotateY(rotation[1]);g.rotateZ(rotation[2]);g.translate(...p);
 if(g.index){const indexed=g;g=g.toNonIndexed();indexed.dispose()}
 g.clearGroups();g.deleteAttribute('uv');
 const colors=[],v=g.attributes.position;
 for(let i=0;i<v.count;i++){
  const tint=.88+.07*Math.sin(v.getX(i)*.8+v.getZ(i)*.61)+.05*Math.sin(v.getY(i)*1.2);
  colors.push(tint,tint,tint);
 }
 g.setAttribute('color',new T.Float32BufferAttribute(colors,3));parts[key].push(g);
}
const box=(x,y,z,w,h,d,key='stone',yaw=0)=>add(new T.BoxGeometry(w,h,d),key,[x,y,z],[0,yaw,0]);
function profile(points,key,p=[0,0,0],segments=64){add(new T.LatheGeometry(points.map(v=>new T.Vector2(...v)),segments),key,p)}
function window(x,y,z,width,height,yaw=0){
 const s=new T.Shape(),r=width/2;
 s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,height-r);s.absarc(0,height-r,r,0,Math.PI);s.closePath();
 add(new T.ShapeGeometry(s,8),'shadow',[x,y,z],[0,yaw,0]);
 const local=(dx,dy,dz)=>[x+dx*Math.cos(yaw)+dz*Math.sin(yaw),y+dy,z-dx*Math.sin(yaw)+dz*Math.cos(yaw)];
 add(new T.BoxGeometry(width+.18,.12,.18),'trim',local(0,-.035,.03),[0,yaw,0]);
 for(const side of [-1,1])add(new T.BoxGeometry(.09,height-r,.1),'trim',local(side*(r+.02),(height-r)/2,.015),[0,yaw,0]);
 const curve=new T.EllipseCurve(0,height-r,r+.03,r+.03,0,Math.PI,false);
 const points=curve.getPoints(12).map(p=>new T.Vector3(p.x,p.y,.03));
 add(new T.TubeGeometry(new T.CatmullRomCurve3(points),16,.05,4),'trim',[x,y,z],[0,yaw,0]);
 add(new T.BoxGeometry(.05,height-.08,.07),'trim',local(0,height/2,.05),[0,yaw,0]);
}
function hall(x,z,w,d,h){
 box(x,h/2,z,w,h,d);
 for(const y of [.2,2.25,h-.2])box(x,y,z,w+.18,.14,d+.18,'trim');
 // Continuous gable with readable eaves and narrow courses in the slate.
 const s=new T.Shape();s.moveTo(-w/2-.2,0);s.lineTo(0,w*.48);s.lineTo(w/2+.2,0);s.closePath();
 add(new T.ExtrudeGeometry(s,{depth:d+.4,bevelEnabled:false}),'roof',[x,h,z-d/2-.2]);
 for(let i=1;i<8;i++){
  const fy=i/8*w*.48,half=(w/2+.2)*(1-i/8);
  for(const side of [-1,1])box(x+side*half,h+fy,z,.06,.07,d+.48,'roof');
 }
 box(x,h+w*.48+.025,z,.15,.16,d+.55,'trim');
 for(const side of [-1,1])for(let i=0;i<Math.floor(d/1.4);i++){
  const zz=z-d/2+.7+i*1.4;
  window(x+side*(w/2+.012),.55,zz,.5,1.4,side*Math.PI/2);
  window(x+side*(w/2+.012),2.65,zz,.5,1.3,side*Math.PI/2);
  box(x+side*(w/2+.18),h*.43,zz+.61,.28,h*.86,.28,'trim');
 }
 for(let i=0;i<Math.floor(w/1.1);i++){
  const xx=x-w/2+.55+i*1.1;
  window(xx,.5,z+d/2+.015,.6,1.4);
  window(xx,2.7,z+d/2+.015,.6,1.25);
 }
}
// Main hall and flanking residential wings form an inhabited courtyard.
hall(0,-3,5,12,5.2);hall(-6,1,3.1,10,4.5);hall(6,1,3.1,10,4.5);
hall(0,-7.5,14,2.8,4.7);
box(0,-.3,0,19,.6,21,'stone');box(0,.015,3.5,8,.06,8,'trim');
for(const x of [-4.1,4.1])for(let i=0;i<7;i++){
 box(x,.35,-.5+i*.78,.12,.7,.12,'trim');box(x,.76,-.5+i*.78,.16,.12,.78,'trim');
}
for(let i=0;i<6;i++)box(0,-i*.16,10.5+i*.48,5,.18,.52,'trim');
// Clock tower: masonry, recessed belfry, projecting cornices and dormers.
const tx=0,tz=-7.5;
box(tx,6.5,tz,3.3,13,3.3);
for(const y of [1.5,5,8.5,11.4,12.9])box(tx,y,tz,3.58,.19,3.58,'trim');
for(const side of [-1,1]){
 window(tx+side*1.661,9.05,tz,.95,1.95,side*Math.PI/2);
 window(tx,9.05,tz+side*1.661,.95,1.95,side<0?Math.PI:0);
 for(const x of [-1.58,1.58])box(x,6.4,tz+side*1.58,.18,12.8,.18,'trim');
}
for(const side of [-1,1]){
 add(new T.CylinderGeometry(.62,.62,.06,48),'trim',[0,7,tz+side*1.7],[Math.PI/2,0,0]);
 add(new T.CylinderGeometry(.5,.5,.065,48),'shadow',[0,7,tz+side*1.74],[Math.PI/2,0,0]);
 box(0,7.17,tz+side*1.79,.045,.35,.035,'brass');
 box(.14,7,tz+side*1.79,.28,.045,.035,'brass');
}
profile([[2.5,13],[2.5,13.2],[1.8,13.5],[.9,16.4],[.25,17.1],[0,18]],'roof',[0,0,tz],4);
for(const x of [-7.5,7.5])for(const z of [-5.5,6]){
 profile([[.8,0],[.8,5.5],[1,5.6],[1,5.9],[.83,6],[.83,6.8]],'stone',[x,0,z],16);
 profile([[1.15,6.8],[1.15,7],[.1,9.3],[0,9.7]],'roof',[x,0,z],16);
 for(let i=0;i<6;i++){
  const a=i/6*Math.PI*2;window(x+Math.sin(a)*.81,4.5,z+Math.cos(a)*.81,.32,.7,a);
 }
}
// The runtime shared world terrain supplies the hillside under this campus.
// Layered garden terraces, cypress-like silhouettes and footpaths.
for(const side of [-1,1])for(let i=0;i<5;i++){
 const x=side*(9+(i%2)*1.1),z=-7+i*3.5;
 box(x,.15,z,1.5,.35,2.6,'grass');
 profile([[0,0],[.65,.3],[.8,1.4],[.6,2.7],[0,3.8]],'grass',[x,.3,z],16);
}
const group=new T.Group();group.name='Skybound academy sanctuary';
let triangles=0;
for(const [key,bucket] of Object.entries(parts)){
 if(!bucket.length)continue;
 const geometry=mergeGeometries(bucket);bucket.forEach(g=>g.dispose());triangles+=geometry.attributes.position.count/3;
 const material=new T.MeshStandardMaterial({name:'Academy '+key,color:palette[key],roughness:1,vertexColors:true});
 group.add(new T.Mesh(geometry,material));
}
const target='public/lobby/world/academy-sanctuary.glb';
await writeFile(target,Buffer.from(await new GLTFExporter().parseAsync(group,{binary:true})));
execFileSync('node_modules/.bin/gltf-transform',['meshopt',target,target+'.compressed.glb'],{stdio:'pipe'});
await rename(target+'.compressed.glb',target);
console.log({triangles,target});
