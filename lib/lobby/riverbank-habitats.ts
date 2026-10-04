import {riverCenter,riverWidth,riverLevel,worldHeight,worldSlope,roadCenter,VISTA_STREAMS,vistaStream} from './world-geography';
import {vistaSpread} from './world-distance';

export const RIVER_STOPS=[{z:-132,side:1},{z:-214,side:-1}] as const;
const cascadeCorridors=VISTA_STREAMS.flatMap((_,i)=>Array.from({length:41},(_,j)=>vistaStream(i,j/40)));
export function riverbankClear(x:number,z:number){
 if([-96,-172].some(bridge=>Math.abs(z-bridge)<6))return false;
 if(RIVER_STOPS.some(stop=>Math.abs(z-stop.z)<5&&Math.sign(x-riverCenter(z))===stop.side))return false;
 if(cascadeCorridors.some(s=>Math.hypot(x-s.x,z-s.z)<s.width*.5+2))return false;
 return Math.abs(x-riverCenter(z))>riverWidth(z)+.8&&worldHeight(x,z)>riverLevel(z)+.3;
}
export function riverbankPlants(floorY:number){
 let seed=14027;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const plants:{kind:string;position:[number,number,number];scale:number;yaw:number}[]=[];
 for(let band=0;band<3;band++)for(let i=0;i<340;i++){
  const z=-87-random()*225,side=i%2?1:-1,offset=band===0?1.1+random()*3:band===1?4+random()*7:10+random()*12;
  const x=riverCenter(z)+side*(riverWidth(z)+offset);
  if(!riverbankClear(x,z)||worldSlope(x,z)/vistaSpread(z)>.7)continue;
  const cluster=Math.sin(z*.18+side*2)+Math.sin(z*.053);
  if(band===2&&cluster<.35)continue;
  const kind=band===2?'tree-d':band===1?(i%3?'bush':'rock-b'):(i%5?'tall-grass':'rock-a');
  if(kind.startsWith('rock')&&cluster<.4)continue;
  const scale=band===2?1.8+random()*1.7:kind.startsWith('rock')?1.1+random()*2.1:band===1?2.0+random()*1.8:1.8+random()*1.6;
  plants.push({kind,position:[x,floorY+worldHeight(x,z)-(kind.startsWith('rock')?scale*.18:.04),z],scale,yaw:random()*Math.PI*2});
 }
 // The larger right-bank coves form sheltering groves, with an understory
 // that joins their roots to the shore. Clearings between coves keep the river legible.
 for(const [cz,side,offset]of [[-106,1,17],[-139,1,23],[-192,1,20],[-249,-1,16],[-287,1,18]]){
  const cx=riverCenter(cz)+side*(riverWidth(cz)+offset);
  for(let i=0;i<80;i++){
   const angle=random()*Math.PI*2,r=Math.sqrt(random()),x=cx+Math.cos(angle)*r*9,z=cz+Math.sin(angle)*r*13;
   if(!riverbankClear(x,z)||worldSlope(x,z)/vistaSpread(z)>.95||Math.abs(x-roadCenter(z))<5)continue;
   const kind=i%3?'bush':'tree-c',scale=kind==='bush'?2+random()*2.4:2.2+random()*1.7;
   plants.push({kind,position:[x,floorY+worldHeight(x,z)-.06,z],scale,yaw:random()*Math.PI*2});
  }
 }
 return plants;
}
