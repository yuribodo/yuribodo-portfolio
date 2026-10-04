import test from 'node:test';
import assert from 'node:assert/strict';
import {TRAIL_SEGMENTS,TRAIL_MAP_SIZE,TRAIL_MAP_EXTENT,TRAIL_MAP_X,TRAIL_MAP_Z,trailMask} from './valley-trails';
import {riverLevel,worldHeight} from './world-geography';

test('village lanes remain on dry terrain between their bridge connections',()=>{
 for(const {ax,az,bx,bz}of TRAIL_SEGMENTS){
  const x=(ax+bx)/2,z=(az+bz)/2;
  assert.ok(worldHeight(x,z)>riverLevel(z)+.5,`lane crosses open water at ${x},${z}`);
 }
});
test('terrain trail mask covers the route centres and leaves the desk courtyard alone',()=>{
 const mask=trailMask(),sample=(x:number,z:number)=>{
  const i=Math.floor((x-TRAIL_MAP_X)/TRAIL_MAP_EXTENT*TRAIL_MAP_SIZE),j=Math.floor((z-TRAIL_MAP_Z)/TRAIL_MAP_EXTENT*TRAIL_MAP_SIZE);
  return mask[(j*TRAIL_MAP_SIZE+i)*4];
 };
 for(const {ax,az}of TRAIL_SEGMENTS)assert.ok(sample(ax,az)>220,'gap in dirt lane');
 for(const [x,z]of [[0,0],[3,-3],[-3,-3],[0,100]])assert.equal(sample(x,z),0);
});
