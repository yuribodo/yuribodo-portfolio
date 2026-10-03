import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {ANCIENT_TREES,gillGeometry,IMPOSTOR_FRAMES,impostorUrl,impostorYaw,hasFullGills,MUSHROOM_GILL_RANGE,MUSHROOM_GROVES,mushroomDistance} from './fantasy-landmarks';
import {distantPosition,vistaSpread} from './world-distance';
import {DESK_CAMERA} from './world-view';

const origins=ANCIENT_TREES.map(t=>distantPosition([t.x,0,t.z]));

test('every ancient tree has a baked frame whose root is where the grove puts it', () => {
 assert.equal(IMPOSTOR_FRAMES.length,ANCIENT_TREES.length);
 ANCIENT_TREES.forEach((tree,i)=>{
  const frame=IMPOSTOR_FRAMES[i],[x,,z]=origins[i];
  assert.ok(Math.abs(frame.origin[0]-x)<.01&&Math.abs(frame.origin[2]-z)<.01,`tree ${i} root`);
  assert.ok(Math.abs(Math.hypot(x-DESK_CAMERA.x,z-DESK_CAMERA.z)-frame.distance)<.01,`tree ${i} distance`);
  assert.ok(frame.u0<0&&frame.u1>0&&frame.v1>frame.v0&&frame.depthRange>0,`tree ${i} frame brackets its root`);
 });
});

test('the card is square to the line from the seated camera, with local x running screen-right', () => {
 for(const [x,,z] of origins){
  const yaw=impostorYaw([x,0,z]),normal=[Math.sin(yaw),Math.cos(yaw)],right=[Math.cos(yaw),-Math.sin(yaw)];
  const toRoot=[x-DESK_CAMERA.x,z-DESK_CAMERA.z],length=Math.hypot(...toRoot);
  assert.ok(Math.abs(normal[0]*toRoot[0]+normal[1]*toRoot[1]+length)<1e-6,'the front faces the camera head-on');
  assert.ok(Math.abs(right[0]*toRoot[0]+right[1]*toRoot[1])<1e-6,'x lies across the line of sight');
  // The camera looks down -z, so screen-right at the bake is +x of the world: right.x must be positive for a tree dead ahead.
  assert.ok(right[0]>0);
 }
});

test('seated parallax cannot change the view of a card by a visible angle', () => {
 for(const [x,,z] of origins){
  const base=Math.atan2(x-DESK_CAMERA.x,z-DESK_CAMERA.z),moved=Math.atan2(x-(DESK_CAMERA.x+.06),z-DESK_CAMERA.z);
  assert.ok(Math.abs(base-moved)*180/Math.PI<.005,'under 0.005 degrees');
 }
});

test('gills simplify only on mushrooms beyond the range, measured after the vista spread', () => {
 assert.equal(MUSHROOM_GILL_RANGE,200);
 const near=MUSHROOM_GROVES.map(([x,z])=>hasFullGills(x,z));
 assert.deepEqual(near,[false,false,false,false,true,false]);
 // The unspread grove at [-10,-25] is the only one the spread leaves alone.
 assert.equal(vistaSpread(MUSHROOM_GROVES[4][1]),1);
 // [-63,-100] is 118 m away before the spread but 310 m after it: the raw distance would wrongly keep its gills.
 const [x,z]=MUSHROOM_GROVES[5];
 assert.ok(Math.hypot(x,z)<MUSHROOM_GILL_RANGE&&mushroomDistance(x,z)>MUSHROOM_GILL_RANGE);
});

test('far gills are a quarter of the triangles and end on the same rim tips', () => {
 const full=gillGeometry(8),far=gillGeometry(2),count=(g:typeof full)=>g.index!.count/3;
 assert.equal(count(full),42*8*4*2);
 assert.equal(count(far),42*2*4*2);
 // Every tube's last ring sits on the rim circle (radius 1.29, y 1.19 around the tube's own axis): the farthest vertices match.
 const reach=(g:typeof full)=>{let r=0;const p=g.attributes.position;for(let i=0;i<p.count;i++)r=Math.max(r,Math.hypot(p.getX(i),p.getZ(i)));return r;};
 assert.ok(Math.abs(reach(full)-reach(far))<1e-6);
});

test('the baked images are shipped next to the world assets', () => {
 ANCIENT_TREES.forEach((_,i)=>{for(const state of ['sun','shade'] as const)assert.ok(existsSync(`public${impostorUrl(i,state)}`),impostorUrl(i,state));});
});
