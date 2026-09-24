import {HAMLETS,ANCIENT_TREES} from './fantasy-landmarks';
import {distantPosition,vistaSpread} from './world-distance';
import {worldHeight,worldSlope,riverCenter,riverWidth,roadCenter,VISTA_STREAMS,vistaStream} from './world-geography';
import {VALLEY_AXIS} from './valley-terrain-grid';

const STREAM_CLEARINGS=VISTA_STREAMS.flatMap((_,i)=>Array.from({length:65},(_,j)=>vistaStream(i,j/64)));
// Each copse sits on a shoulder or shelf. Gaps preserve the skyline and the
// village clearings, rather than spreading a uniform forest over every slope.
const SHOULDERS=[
 [-46,-96,12,8],[-92,-125,12,9],[-104,-152,15,9],[-110,-211,17,12],
 [-128,-258,20,15],[-118,-305,22,13],[-84,-352,20,15],
 [47,-106,12,9],[96,-139,13,10],[114,-177,15,11],
 [121,-224,20,14],[119,-273,21,15],[100,-322,22,16],[81,-374,20,14],
] as const;

/** Match the rendered triangles, including the non-linear front vista spread.
 * Planting only on the analytic height field can leave roots above coarse faces. */
export function hillsideSurface(x:number,z:number){
 const cell=(value:number)=>{
  let lo=0,hi=VALLEY_AXIS.length-1;
  while(hi-lo>1){const mid=(lo+hi)>>1;if(VALLEY_AXIS[mid]<=value)lo=mid;else hi=mid;}
  return [VALLEY_AXIS[lo],VALLEY_AXIS[hi]];
 };
 const [x0,x1]=cell(x),[z0,z1]=cell(z);
 const vertex=(x:number,z:number)=>distantPosition([x,worldHeight(x,z),z]);
 const a=vertex(x0,z0),b=vertex(x1,z0),c=vertex(x0,z1),d=vertex(x1,z1),p=distantPosition([x,0,z]);
 const interpolate=(a:number[],b:number[],c:number[])=>{
  const det=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);
  const u=((b[2]-c[2])*(p[0]-c[0])+(c[0]-b[0])*(p[2]-c[2]))/det;
  const v=((c[2]-a[2])*(p[0]-c[0])+(a[0]-c[0])*(p[2]-c[2]))/det;
  return {height:u*a[1]+v*b[1]+(1-u-v)*c[1],inside:u>=-1e-8&&v>=-1e-8&&u+v<=1+1e-8};
 };
 const first=interpolate(a,c,b);return first.inside?first.height:interpolate(b,c,d).height;
}

export function hillsidePlants(floorY:number){
 let seed=96371;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const plants:{kind:string;position:[number,number,number];scale:number;yaw:number}[]=[];
 for(const [cx,cz,rx,rz]of SHOULDERS)for(let i=0;i<56;i++){
  const angle=random()*Math.PI*2,r=Math.sqrt(random()),x=cx+Math.cos(angle)*r*rx,z=cz+Math.sin(angle)*r*rz;
  if(HAMLETS.some(([hx,hz])=>Math.hypot(x-hx,z-hz)<16)||ANCIENT_TREES.some(t=>Math.hypot(x-t.x,z-t.z)<10))continue;
  if(Math.abs(x-riverCenter(z))<riverWidth(z)+18||Math.abs(x-roadCenter(z))<9)continue;
  if(STREAM_CLEARINGS.some(s=>Math.hypot(x-s.x,z-s.z)<s.width*.5+10))continue;
  const slope=worldSlope(x,z)/vistaSpread(z),height=worldHeight(x,z);
  if(slope>1.05)continue;
  // Broad crowns on lower shelves; conifers become more frequent uphill.
  const conifer=height>0?i%4!==0:i%5===0;
  const kind=i%9===0?'rock-b':i%4===0?'bush':conifer?'pine-b':'tree-d';
  const scale=kind==='rock-b'?2.5+random()*2.2:kind==='bush'?2.1+random()*1.5:2.25+random()*1.55;
  const bury=kind==='rock-b'?scale*.32:kind==='bush'?.15:.22;
  plants.push({kind,position:[x,floorY+hillsideSurface(x,z)-bury,z],scale,yaw:random()*Math.PI*2});
 }
 return plants;
}
