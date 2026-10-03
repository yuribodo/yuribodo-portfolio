import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {InstancedMesh} from 'three';
import {plantCommunities} from './plant-communities';
import {buildMeadow} from '@/components/lobby/world/meadow-life';

// Fixtures were captured from the pre-optimisation generators. Regenerate only
// when the scatter is changed on purpose: UPDATE_WORLD_FIXTURE=1 pnpm test.
const FIXTURE=new URL('./world-mount.fixture.json',import.meta.url);
const FLOORS=[-.8,-1.5] as const;
const light={time:{value:0},advance:()=>{}};

function plantDigest(floorY:number){
 const hash=createHash('sha256'),regions=plantCommunities(floorY);let count=0;
 for(const [key,plants] of Object.entries(regions)){
  hash.update(key+'\0');
  const data=new Float64Array(plants.length*5);
  plants.forEach((p,i)=>data.set([...p.position,p.scale,p.yaw],i*5));
  hash.update(new Uint8Array(data.buffer));count+=plants.length;
 }
 return {regions:Object.keys(regions).length,count,sha256:hash.digest('hex')};
}
function meadowDigest(floorY:number){
 const meadow=buildMeadow(floorY,light),hash=createHash('sha256');let count=0;
 for(const child of meadow.group.children){
  const mesh=child as InstancedMesh;
  hash.update(new Uint8Array(mesh.instanceMatrix.array.buffer,0,mesh.count*16*4));
  hash.update(new Uint8Array(mesh.instanceColor!.array.buffer,0,mesh.count*3*4));
  hash.update(String(mesh.count)+(mesh.geometry.getAttribute('position').count)+'\0');count+=mesh.count;
 }
 const digest={meshes:meadow.group.children.length,count,sha256:hash.digest('hex')};
 meadow.dispose();return digest;
}

const current=()=>Object.fromEntries(FLOORS.map(f=>[String(f),{plants:plantDigest(f),meadow:meadowDigest(f)}]));
if(process.env.UPDATE_WORLD_FIXTURE||!existsSync(FIXTURE))writeFileSync(FIXTURE,JSON.stringify(current(),null,1)+'\n');
const expected=JSON.parse(readFileSync(FIXTURE,'utf8')) as ReturnType<typeof current>;

for(const floorY of FLOORS){
 test(`plant placements are unchanged at floorY ${floorY}`,()=>{
  assert.deepEqual(plantDigest(floorY),expected[String(floorY)].plants);
 });
 test(`meadow instance matrices and tints are unchanged at floorY ${floorY}`,()=>{
  assert.deepEqual(meadowDigest(floorY),expected[String(floorY)].meadow);
 });
}
