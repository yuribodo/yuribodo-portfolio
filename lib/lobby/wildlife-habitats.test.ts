import test from 'node:test';
import assert from 'node:assert/strict';
import {vistaSpread} from './world-distance';
import {FANTASY_RESIDENTS,residentPose,dragonPose} from './wildlife-habitats';
import {riverLevel,worldHeight,VISTA_STREAMS,vistaStream} from './world-geography';

test('fantasy inhabitants remain above dry ground throughout the hop and hover cycles',()=>{
 for(const resident of FANTASY_RESIDENTS)for(let time=0;time<32;time+=.05){
  const pose=residentPose(resident,time);
  assert.ok(worldHeight(resident.x,resident.z)>riverLevel(resident.z)+2);
  assert.ok(pose.position[1]>=worldHeight(resident.x,resident.z)-1e-8,'creature penetrates the ground');
  assert.ok(pose.stretch>.7&&pose.stretch<1.3);
  for(let i=0;i<VISTA_STREAMS.length;i++)for(let step=0;step<=40;step++){
   const stream=vistaStream(i,step/40);
   assert.ok(Math.hypot(resident.x-stream.x,resident.z-stream.z)>stream.width*.5,'creature in tributary');
  }
 }
});

test('settled slimes do not slide, and landing poses remain continuous',()=>{
 for(const resident of FANTASY_RESIDENTS.filter(r=>r.kind==='slime'))for(let time=0;time<20;time+=.025){
  const a=residentPose(resident,time),b=residentPose(resident,time+.0001);
  assert.equal(a.position[0],b.position[0]);assert.equal(a.position[2],b.position[2]);
  assert.ok(Math.abs(a.position[1]-b.position[1])<.002,'vertical teleport');
  assert.ok(Math.abs(a.stretch-b.stretch)<.002,'squash discontinuity');
 }
});

test('flight headings match the path tangent',()=>{
 for(let i=0;i<2;i++)for(let time=0;time<300;time+=.5){
  const pose=dragonPose(time,i),next=dragonPose(time+.001,i),dx=next.position[0]-pose.position[0],dz=next.position[2]-pose.position[2];
  assert.ok((Math.sin(pose.yaw)*dx+Math.cos(pose.yaw)*dz)/Math.hypot(dx,dz)>.999,'dragon flies sideways');
  assert.ok(Math.abs(pose.bank)<.3);
 }

});

test('dragon circuits retain clearance over the terrain for the full orbit',()=>{
 for(let i=0;i<2;i++)for(let time=0;time<300;time+=.5){
  const {position}=dragonPose(time,i);
  assert.ok(position[1]>18&&position[2]<-150);
  assert.ok(position.every(Number.isFinite));
  let lower=-600,upper=0;
  for(let step=0;step<24;step++){
   const z=(lower+upper)/2;if(z*vistaSpread(z)<position[2])lower=z;else upper=z;
  }
  const z=(lower+upper)/2,x=position[0]/vistaSpread(z);
  assert.ok(position[1]-worldHeight(x,z)>12,'dragon intersects terrain');
 }
});
