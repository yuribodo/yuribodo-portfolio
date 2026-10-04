import { distantPosition } from './world-distance';
import { worldHeight } from './world-geography';

export type FantasyResident={kind:'slime'|'spirit';x:number;z:number;height:number;phase:number;perch?:number};
/** Keep the single hopping terrace slime; leaf spirits still inhabit the valley. */
export const FANTASY_RESIDENTS:readonly FantasyResident[]=[
 {kind:'slime',x:-3.51,z:-4.65,height:.58,phase:0,perch:.255},
 {kind:'spirit',x:-12,z:-22,height:1.15,phase:7},
 {kind:'spirit',x:9,z:-23,height:1.5,phase:4},
 ...[[-67,-101],[-59,-111],[-68,-131],[66,-145],[-52,-204]].map(([x,z],i)=>
  ({kind:'spirit' as const,x:x-2.3,z:z-1.8,height:2.5,phase:i*1.7+8})),
];
export function residentPose(resident:FantasyResident,time:number,floorY=0){
 const phase=time+resident.phase,cycle=((phase%6.4)+6.4)%6.4;
 // Anticipation, ballistic hop, soft landing, then a long settled pause.
 const hop=cycle>1&&cycle<2.5?Math.sin((cycle-1)/1.5*Math.PI):0;
 const anticipation=cycle>.6&&cycle<=1?Math.sin((cycle-.6)/.4*Math.PI):0;
 const landing=cycle>=2.5&&cycle<3?Math.sin((cycle-2.5)/.5*Math.PI):0;
 const stretch=1+hop*.13-anticipation*.13-landing*.17+Math.sin(phase*1.3)*.012;
 const float=resident.kind==='spirit'?.38+Math.sin(phase*.8)*.16:hop*.48;
 return {position:distantPosition([resident.x,floorY+(resident.perch??worldHeight(resident.x,resident.z))+float*resident.height,resident.z]),
  stretch:resident.kind==='slime'?stretch:1,yaw:Math.atan2(-resident.x,-resident.z)+Math.sin(phase*.35)*.14,tilt:resident.kind==='spirit'?Math.sin(phase*.7)*.09:0};
}
/** The forward vector is the actual orbit tangent; bank is applied around local +Z. */
export function dragonPose(time:number,index:number){
 const rate=index?.038:.046,angle=time*rate+index*2.9+.2,rx=index?170:130,rz=index?115:85;
 const vx=-Math.sin(angle)*rx*rate,vz=Math.cos(angle)*rz*rate,vy=Math.cos(angle*2+index)*10*rate;
 const speed=Math.hypot(vx,vz),curvature=rx*rz/Math.pow(Math.hypot(rx*Math.sin(angle),rz*Math.cos(angle)),3);
 return {position:[-25+Math.cos(angle)*rx,(index?48:30)+Math.sin(angle*2+index)*5,(index?-460:-280)+Math.sin(angle)*rz] as [number,number,number],
  yaw:Math.atan2(vx,vz),pitch:-Math.atan2(vy,speed),bank:Math.atan(speed*speed*curvature/9.81)};
}
