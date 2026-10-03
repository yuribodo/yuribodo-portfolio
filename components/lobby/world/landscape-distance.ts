import {BufferAttribute,BufferGeometry,Float32BufferAttribute,Uint32BufferAttribute} from 'three';
import {vistaSpread} from '@/lib/lobby/world-distance';
import {VALLEY_AXIS} from '@/lib/lobby/valley-terrain-grid';
/** BufferGeometry.computeVertexNormals on raw arrays: same operations in the same
 * order (Float32 accumulation, reads before writes), without a Vector3 per step. */
function computeNormals(geometry:BufferGeometry){
 const position=geometry.attributes.position.array as Float32Array,index=geometry.index?.array;
 let attribute=geometry.getAttribute('normal') as BufferAttribute|undefined;
 if(attribute)(attribute.array as Float32Array).fill(0);
 else geometry.setAttribute('normal',attribute=new BufferAttribute(new Float32Array(position.length),3));
 const n=attribute.array as Float32Array;
 for(let i=0,count=index?index.length:position.length/3;i<count;i+=3){
  const a=(index?index[i]:i)*3,b=(index?index[i+1]:i+1)*3,c=(index?index[i+2]:i+2)*3;
  const cbx=position[c]-position[b],cby=position[c+1]-position[b+1],cbz=position[c+2]-position[b+2];
  const abx=position[a]-position[b],aby=position[a+1]-position[b+1],abz=position[a+2]-position[b+2];
  const x=cby*abz-cbz*aby,y=cbz*abx-cbx*abz,z=cbx*aby-cby*abx;
  const ax=n[a]+x,ay=n[a+1]+y,az=n[a+2]+z,bx=n[b]+x,by=n[b+1]+y,bz=n[b+2]+z,cx=n[c]+x,cy=n[c+1]+y,cz=n[c+2]+z;
  n[a]=ax;n[a+1]=ay;n[a+2]=az;n[b]=bx;n[b+1]=by;n[b+2]=bz;n[c]=cx;n[c+1]=cy;n[c+2]=cz;
 }
 for(let i=0;i<n.length;i+=3){
  const x=n[i],y=n[i+1],z=n[i+2],scale=1/(Math.sqrt(x*x+y*y+z*z)||1);
  n[i]=x*scale;n[i+1]=y*scale;n[i+2]=z*scale;
 }
 attribute.needsUpdate=true;
}

/** Ground and water share this mapping; authored UVs retain roads and banks. */
export function spreadLandscape(geometry:BufferGeometry,keepDomain=false){
 const vertices=geometry.attributes.position as BufferAttribute,p=vertices.array as Float32Array;
 // Two normal passes stay: landDomainNormal is the pre-spread surface normal.
 if(keepDomain){geometry.setAttribute('landDomain',new Float32BufferAttribute(p,3));computeNormals(geometry);geometry.setAttribute('landDomainNormal',geometry.attributes.normal.clone());}
 for(let i=0;i<p.length;i+=3){const spread=vistaSpread(p[i+2]);p[i]*=spread;p[i+2]*=spread;}
 vertices.needsUpdate=true;computeNormals(geometry);
 geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}

// The seated camera always faces -Z (±0.06 parallax; the dive only moves it
// forward), so quads outside this wedge can never reach the screen. 160 degrees
// leaves ultrawide (32:9, ~118 degree hfov) and the pitched-down view of deep
// gorges well inside. The apex sits behind the camera: moving forward only shrinks it.
const CULL_APEX_Z=4,CULL_SIN=Math.sin(80*Math.PI/180),CULL_COS=Math.cos(80*Math.PI/180);
/** Outside either boundary half-plane for all four corners means outside the wedge. */
function isBehindCamera(position:Float32Array,a:number,b:number,c:number,d:number){
 let left=true,right=true;
 for(const index of [a,b,c,d]){
  const u=position[index*3],w=CULL_APEX_Z-position[index*3+2];
  if(w*CULL_SIN-u*CULL_COS>=0)left=false;
  if(w*CULL_SIN+u*CULL_COS>=0)right=false;
  if(!left&&!right)return false;
 }
 return true;
}

/** Outer valley grid. The original high-resolution near ground owns the inner square. */
export function landGeometry(heights:Float32Array){
 const axis=VALLEY_AXIS,n=axis.length;
 const positions=new Float32Array(n*n*3),uv=new Float32Array(n*n*2);
 let sample=0;
 for(let j=0;j<n;j++){const z=axis[j];for(let i=0;i<n;i++){
  const x=axis[i],y=heights[sample];
  positions[sample*3]=x;positions[sample*3+1]=y;positions[sample*3+2]=z;
  uv[sample*2]=(x+85)/170;uv[sample*2+1]=(85-z)/170;sample++;
 }}
 const indices=new Uint32Array((n-1)*(n-1)*6);let count=0;
 for(let z=0;z<n-1;z++)for(let x=0;x<n-1;x++){
  if(axis[x]>=-85&&axis[x+1]<=85&&axis[z]>=-85&&axis[z+1]<=85)continue;
  const a=z*n+x,b=a+1,c=a+n,d=c+1;
  indices.set([a,c,b,b,c,d],count);count+=6;
 }
 const geometry=new BufferGeometry();
 geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));
 // Normals use the full grid so culled quads leave no seam on the visible edge.
 geometry.setIndex(new Uint32BufferAttribute(indices.subarray(0,count),1));
 spreadLandscape(geometry,true);
 const spread=geometry.attributes.position.array as Float32Array,kept=new Uint32Array(count);let keptCount=0;
 for(let i=0;i<count;i+=6){
  const a=indices[i],b=indices[i+2],c=indices[i+1],d=indices[i+5];
  if(isBehindCamera(spread,a,b,c,d))continue;
  kept.set(indices.subarray(i,i+6),keptCount);keptCount+=6;
 }
 geometry.setIndex(new Uint32BufferAttribute(kept.slice(0,keptCount),1));
 return geometry;
}
