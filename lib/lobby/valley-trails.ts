import {CatmullRomCurve3,Vector3} from 'three';
import {riverCenter,riverWidth,roadCenter} from './world-geography';

// Dirt lanes branch from the existing river road and bridge approaches.
// Coordinates stay in the terrain's design domain; the ground shader supplies
// their elevation, so the paths cannot float above or clip into the slopes.
const lane=(points:number[][],width:number)=>({points,width});
export const VALLEY_TRAILS=[
 lane([[roadCenter(-108),-108],[-32,-107],[-41,-99],[-55,-97],[-66,-102],[-72,-108]],1.05),
 lane([[-72,-108],[-82,-103],[-90,-95],[-89,-88],[-78,-88],[-69,-95],[-66,-102]],.85),
 lane([[-72,-108],[-80,-115],[-82,-131],[-76,-144],[-62,-149]],.9),
 lane([[roadCenter(-194),-194],[-24,-199],[-40,-206],[-49,-222],[-38,-226]],1.05),
 lane([[-62,-149],[-68,-166],[-63,-189],[-60,-211],[-49,-222]],.85),
 lane([[riverCenter(-96)+riverWidth(-96)+7,-96],[17,-99],[25,-110],[39,-119],[54,-129],[67,-142],[74,-150]],1.15),
 lane([[74,-150],[83,-145],[92,-153],[87,-160],[76,-158],[74,-150]],.85),
] as const;
export const TRAIL_SEGMENTS=VALLEY_TRAILS.flatMap(({points,width})=>{
 const curve=new CatmullRomCurve3(points.map(([x,z])=>new Vector3(x,0,z)),false,'centripetal');
 const samples=curve.getPoints(Math.ceil(curve.getLength()));
 return samples.slice(1).map((b,i)=>({ax:samples[i].x,az:samples[i].z,bx:b.x,bz:b.z,width}));
});
export function trailEdgeDistance(x:number,z:number){
 let distance=Infinity;
 for(const {ax,az,bx,bz,width}of TRAIL_SEGMENTS){
  if(x<Math.min(ax,bx)-5||x>Math.max(ax,bx)+5||z<Math.min(az,bz)-5||z>Math.max(az,bz)+5)continue;
  const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
  distance=Math.min(distance,Math.hypot(x-ax-t*dx,z-az-t*dz)-width);
 }
 return distance;
}
export const TRAIL_MAP_SIZE=1024,TRAIL_MAP_EXTENT=512,TRAIL_MAP_X=-256,TRAIL_MAP_Z=-384;
export function trailMask(){
 const size=TRAIL_MAP_SIZE,extent=TRAIL_MAP_EXTENT,mask=new Uint8Array(size*size*4),units=extent/size;
 for(const {ax,az,bx,bz,width}of TRAIL_SEGMENTS){
  const margin=width+1.25,x0=Math.max(0,Math.floor((Math.min(ax,bx)-margin-TRAIL_MAP_X)/units)),x1=Math.min(size-1,Math.ceil((Math.max(ax,bx)+margin-TRAIL_MAP_X)/units));
  const z0=Math.max(0,Math.floor((Math.min(az,bz)-margin-TRAIL_MAP_Z)/units)),z1=Math.min(size-1,Math.ceil((Math.max(az,bz)+margin-TRAIL_MAP_Z)/units));
  for(let j=z0;j<=z1;j++)for(let i=x0;i<=x1;i++){
   const x=TRAIL_MAP_X+(i+.5)*units,z=TRAIL_MAP_Z+(j+.5)*units,dx=bx-ax,dz=bz-az;
   const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
   const edge=Math.hypot(x-ax-t*dx,z-az-t*dz)-width;
   const cover=Math.max(0,Math.min(1,1-edge/.8)),index=(j*size+i)*4;
   mask[index]=Math.max(mask[index],Math.round(cover*255));mask[index+3]=255;
  }
 }
 return mask;
}
