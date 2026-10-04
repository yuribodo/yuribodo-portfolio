/** Authored radial architecture for the approved Skybound silhouette.
 * The profile, structural hierarchy and modules are specified deliberately;
 * this replaces the repeated-cone blockout. All geometry is original.
 */
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { writeFile, rename } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

globalThis.FileReader = class { async readAsArrayBuffer(blob) { this.result = await blob.arrayBuffer(); this.onloadend?.(); } };
const surfaces = {
  limestone: new T.MeshStandardMaterial({ name:'Citadel limestone', color:'#8197a0', roughness:0.82, metalness:0.12, vertexColors:true }),
  ledge: new T.MeshStandardMaterial({ name:'Cut silver edges', color:'#b9cacb', roughness:0.46, metalness:0.38, vertexColors:true }),
  metal: new T.MeshStandardMaterial({ name:'Blue patinated metal', color:'#5c7782', roughness:0.67, metalness:0.48, vertexColors:true }),
  recess: new T.MeshStandardMaterial({ name:'Gallery shadows', color:'#233d49', roughness:0.95, vertexColors:true }),
  gold: new T.MeshStandardMaterial({ name:'Aged brass details', color:'#9e956c', roughness:0.45, metalness:0.6, vertexColors:true }),
  glazing: new T.MeshStandardMaterial({ name:'Window glass', color:'#517583', roughness:0.27, metalness:0.5, vertexColors:true }),
  garden: new T.MeshStandardMaterial({ name:'Terrace gardens', color:'#526e56', roughness:1, vertexColors:true }),
};
const buckets = Object.fromEntries(Object.keys(surfaces).map(k=>[k,[]]));
function add(g, mat, p=[0,0,0], scale=[1,1,1], yaw=0, tint=1) {
  const q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),yaw);
  g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...p),q,new T.Vector3(...scale)));
  if(g.index) { const indexed=g;g=g.toNonIndexed();indexed.dispose(); }
  for(const name of Object.keys(g.attributes))if(!['position','normal','uv'].includes(name))g.deleteAttribute(name);
  if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
  const colors=[];
  for(let i=0;i<g.attributes.position.count;i++) {
    const x=g.attributes.position.getX(i),y=g.attributes.position.getY(i),z=g.attributes.position.getZ(i);
    const value=tint*(0.9+0.07*Math.sin(x*1.17+z*.59)+0.03*Math.sin(y*3.7));
    colors.push(value,value,value);
  }
  g.setAttribute('color',new T.Float32BufferAttribute(colors,3));buckets[mat].push(g);
}
function box(p,size,mat,yaw=0,tint=1){add(new T.BoxGeometry(...size),mat,p,[1,1,1],yaw,tint);}
function lathe(points,mat,segments=128,p=[0,0,0]){add(new T.LatheGeometry(points.map(([r,y])=>new T.Vector2(r,y)),segments),mat,p);}
function ring(r,y,width,height,mat){lathe([[r-width,y-height/2],[r,y-height/2],[r+.035,y-height*.25],[r+.035,y+height*.25],[r,y+height/2],[r-width,y+height/2]],mat);}
function cylinder(r,rt,y,h,mat,p=[0,0,0],segments=32){add(new T.CylinderGeometry(rt,r,h,segments),mat,[p[0],p[1]+y,p[2]]);}
function radial(r,a,y){return [Math.sin(a)*r,y,Math.cos(a)*r];}
function tube(points,r,mat,p=[0,0,0],yaw=0){add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),16,r,5,false),mat,p,[1,1,1],yaw);}
function archShape(w,h,thickness=0){
 const s=new T.Shape(),r=w/2,shoulder=h-r;
 s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,shoulder);s.absarc(0,shoulder,r,0,Math.PI,false);s.lineTo(-r,0);
 if(thickness){const inner=new T.Path(),ri=r-thickness;inner.moveTo(-ri,thickness);inner.lineTo(-ri,shoulder);inner.absarc(0,shoulder,ri,Math.PI,0,true);inner.lineTo(ri,thickness);inner.closePath();s.holes.push(inner);}
 return s;
}
const archOpening=new T.ShapeGeometry(archShape(.48,.85),6);
const archFrame=new T.ExtrudeGeometry(archShape(.61,.98,.065),{depth:.06,bevelEnabled:false,curveSegments:5});
function gallery(radius,y,count,height=1){
 for(let i=0;i<count;i++){
  const a=i/count*Math.PI*2;
  add(archOpening.clone(),'recess',radial(radius+.016,a,y),[1,height,1],a);
  add(archFrame.clone(),'ledge',radial(radius+.02,a,y-.04),[1,height,1],a,.85+(i%5)*.025);
  box(radial(radius+.07,a,y+.32),[.023,.6*height,.035],'metal',a);
  if(i%4===0)box(radial(radius+.02,a,y+.47),[.105,1.26*height,.12],'limestone',a);
 }
}
// Six major districts with inhabited arcades, projecting galleries and roofs.
// Their varying heights/recesses break the repeated cylindrical wedding-cake read.
const districts=[
 {y:0,r:14.3,next:12.1,h:4.6}, {y:4.6,r:11.9,next:9.9,h:4.0},
 {y:8.6,r:9.75,next:7.9,h:3.6}, {y:12.2,r:7.8,next:5.9,h:3.25},
 {y:15.45,r:5.8,next:3.75,h:3.1}, {y:18.55,r:3.7,next:2.1,h:2.65},
];
for(const [index,{y,r,next,h}] of districts.entries()){
 // Main sloping face, its narrow floors and recessed full-height arcade band.
 lathe([[r-.1,y],[r-.1,y+.3],[r-.35,y+.72]],'limestone');
 lathe([[r-.43,y+1.65],[r-.43,y+1.8],[next+.3,y+h-.42],[next,y+h]],'limestone');
 ring(r+.22,y+.15,.6,.24,'ledge');ring(r+.1,y+.33,.2,.045,'gold');
 cylinder(r-.82,r-.82,y+1.16,1.1,'recess',[0,0,0],128);
 gallery(r-.36,y+.85,Math.floor(r*7.8),.78);
 for(let floor=1;floor<=3;floor++){
  const fy=y+1.8+floor*(h-2.05)/3;
  const fr=T.MathUtils.lerp(r-.43,next+.3,(fy-y-1.65)/(h-.42-1.65));
  ring(fr+.12,fy,.23,.1,'ledge');
  // Dark slit windows live under a cornice, with grouping and clear piers.
  const count=Math.floor(fr*9);
  for(let bay=0;bay<count;bay++){
   const a=bay/count*Math.PI*2;
   box(radial(fr-.02,a,fy-.21),[.22,.14,.035],bay%6===0?'glazing':'recess',a,.78+(bay%7)*.03);
  }
 }
 // Larger radial braces tie the terraces together rather than float as disks.
 const braces=Math.max(12,24-index*2);
 for(let i=0;i<braces;i++){
  const a=i/braces*Math.PI*2;
  tube([[0,y-.04,r+.1],[0,y+.38,r+.18],[0,y+1.7,r-.23],[0,y+h-.28,next+.45]],.095,'ledge',[0,0,0],a);
  box(radial(r+.02,a,y+.35),[.18,.25,.29],'gold',a);
 }
 // Broad shallow overhang, balcony balustrade and inset garden ledges.
 lathe([[next-.15,y+h-.15],[next+.55,y+h-.15],[next+.75,y+h-.05],[next+.73,y+h+.09],[next-.15,y+h+.09]],'metal');
 ring(next+.74,y+h+.1,.18,.09,'ledge');
 if(index<3)for(let i=0;i<16;i++){
  const a=i/16*Math.PI*2;
  box(radial(next+.4,a,y+h+.13),[.85,.075,.26],'garden',a);
 }
}
// Monumental equatorial platform and continuous rounded armoured undercroft.
lathe([[0,-12.6],[.5,-12.3],[1.25,-11.2],[2.3,-9.8],[4.0,-8.1],[6.3,-6.45],[8.9,-4.45],[11.8,-2.1],[14.4,-.6],[15.4,-.35],[15.8,-.05],[15.8,.12],[14.15,.3]],'metal',160);
ring(15.9,.08,.45,.15,'ledge');ring(15.65,-.48,.35,.12,'gold');
for(let i=0;i<32;i++){
 const a=i/32*Math.PI*2;
 tube([[0,-12.2,.43],[0,-10.3,2.1],[0,-7.4,5.2],[0,-4.1,9.3],[0,-1.5,13.1],[0,-.35,15.35]],i%4===0?.16:.08,i%4===0?'ledge':'recess',[0,0,0],a);
 if(i%2===0){
  tube([[0,-7.9,4.5],[0,-5.8,5.0],[0,-2.2,8.6],[0,-.15,14.8]],.095,'ledge',[0,0,0],a);
  cylinder(.18,.025,-3.1,3.8,'ledge',radial(14.5,a,0),8);
 }
}
for(const [y,r] of [[-3.8,9.8],[-7,5.6],[-10.3,2.0]])ring(r,y,.2,.13,'ledge');
// Long tapered bridges with carved buttresses and satellite needle towers.
for(let i=0;i<8;i++){
 const a=i/8*Math.PI*2;
 const outline=new T.Shape();outline.moveTo(-.65,13.8);outline.lineTo(.65,13.8);outline.lineTo(.36,25);outline.lineTo(.12,29);outline.lineTo(-.12,29);outline.lineTo(-.36,25);outline.closePath();
 const deck=new T.ExtrudeGeometry(outline,{depth:.15,bevelEnabled:true,bevelSize:.06,bevelThickness:.045,bevelSegments:2});deck.rotateX(Math.PI/2);
 add(deck,'ledge',[0,.2,0],[1,1,1],a);
 tube([[0,-2.2,13.2],[0,-1.4,17.5],[0,-.15,24],[0,.0,28]],.095,'metal',[0,0,0],a);
 for(const side of [-1,1])tube([[side*.6,.29,14],[side*.5,.28,20],[side*.26,.24,25],[0,.17,29]],.045,'gold',[0,0,0],a);
 const p=radial(23.7,a,0);
 lathe([[0,-4.2],[.13,-3.6],[.23,-2.5],[.3,-1.2],[.52,-.3],[.75,0],[.72,.25],[.43,.45],[.35,1.65],[.23,2.1],[.08,4.6],[0,5.1]],'metal',24,p);
 ringModule(p,.53,.4,'ledge');
 for(const side of [-1,1])tube([[side*.3,3.6,23.7],[side*.3,1.5,20],[side*.4,.28,17]],.03,'metal',[0,0,0],a);
}
function ringModule(p,r,y,mat){lathe([[r-.12,y-.06],[r,y-.06],[r,y+.06],[r-.12,y+.06]],mat,24,p);}
// Crown palace: arcaded drum, buttressed lantern and tiered needle.
cylinder(2.2,2.2,21.9,1.5,'limestone');gallery(2.21,21.25,22,1.0);ring(2.48,22.8,.4,.18,'ledge');
lathe([[2.3,22.86],[1.5,23.6],[1.2,23.85],[1.2,24.9],[.8,25.35],[.55,25.35],[.55,26.8],[.2,27.3],[.05,29.4],[0,29.7]],'metal',64);
for(let i=0;i<8;i++){
 const p=radial(1.8,i/8*Math.PI*2,0);
 lathe([[.3,22.6],[.32,24.1],[.4,24.2],[.19,24.8],[0,26]],'ledge',16,p);
}
for(const [y,r] of [[23.8,1.3],[25.25,.88],[26.7,.59]])ring(r,y,.2,.12,'gold');
// Meshes merged by material keep the architectural detail to seven draws.
const group=new T.Group();group.name='Skybound citadel';
let triangles=0;
for(const [name,parts] of Object.entries(buckets)){
 const geometry=mergeGeometries(parts);for(const p of parts)p.dispose();geometry.computeBoundingSphere();
 const mesh=new T.Mesh(geometry,surfaces[name]);mesh.name=name;group.add(mesh);triangles+=geometry.attributes.position.count/3;
}
const bytes=await new GLTFExporter().parseAsync(group,{binary:true});
await writeFile('public/lobby/world/sky-citadel-v2.glb',Buffer.from(bytes));
execFileSync('pnpm',['exec','gltf-transform','optimize','public/lobby/world/sky-citadel-v2.glb','public/lobby/world/sky-citadel-v2.compressed.glb','--compress','meshopt','--simplify','false','--join','false','--palette','false'],{stdio:'pipe'});
await rename('public/lobby/world/sky-citadel-v2.compressed.glb','public/lobby/world/sky-citadel-v2.glb');
console.log({triangles,materials:group.children.length});
