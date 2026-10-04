import test from 'node:test';
import assert from 'node:assert/strict';
import {OrthographicCamera,Vector3} from 'three';
import {fitSunShadow,sunShadowMapSize,toLightSpace,type Vec3} from './shadow-frustum';
import {plantCommunities} from './plant-communities';
import {FANTASY_RESIDENTS,residentPose} from './wildlife-habitats';
import {worldHeight} from './world-geography';
import {lobbyScaleForRenderer} from './gpu-detect';

// Mirrors SUN_POSITION in components/lobby/world/outdoor-lighting.tsx (a client module).
const SUN:Vec3=[-52,64,38];
// Measured from the desk GLB; the 0.5 m margin below absorbs a few centimetres of drift.
const FLOOR_Y=-1.21;
const MARGIN=.5;

const sub=(a:Vec3,b:Vec3):Vec3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const toSun=(()=>{const l=Math.hypot(...SUN);return SUN.map(c=>c/l) as unknown as Vec3;})();
/** Where the shadow of a point lands: the first terrain hit walking away from the sun. */
function shadowReceiver(point:Vec3):Vec3{
 let q:Vec3=point;
 for(let i=0;i<600&&q[1]>FLOOR_Y+worldHeight(q[0],q[2]);i++)q=[q[0]-toSun[0]*.25,q[1]-toSun[1]*.25,q[2]-toSun[2]*.25];
 return q;
}
function corners(min:Vec3,max:Vec3):Vec3[]{
 return [min[0],max[0]].flatMap(x=>[min[1],max[1]].flatMap(y=>[min[2],max[2]].map(z=>[x,y,z] as Vec3)));
}
const F=FLOOR_Y;
// Terrace and desk are static and conservative; their extents come from the placement code in
// terrace-architecture.tsx, terrace-garden.tsx and the desk props' positions.
const STATIC_BOXES:Record<string,[Vec3,Vec3]>={
 'desk and props (incl. hover lift)':[[-1.1,F,-.8],[1.2,1.6,.8]],
 'terrace paving, walls, stair':[[-5.2,F-.65,-6.7],[5.2,F+.5,4.3]],
 'forecourt beds':[[-3.1,F,-3.4],[3.1,F+.4,-2]],
 'arcade':[[2.9,F,-8.25],[7.55,F+4.2,-7.15]],
 'second bay':[[-5.3,F,-5.2],[-2.8,F+.7,-4.55]],
 'vine leaves':[[3.2,F+.3,-7.5],[6.6,F+4.3,-7.2]],
 'front bed leaves':[[-4.6,F,-4.5],[4.6,F+.7,-4.2]],
};
// organic-tree_small_02 LOD0, centred and scaled to 8 m: radius of the crown per metre of height.
const TREE_LAYERS:[number,number,number][]=[[0,1,.89],[1,2,1.99],[2,3,2.29],[3,4,2.29],[4,4.57,1.82]];
const TREE_SCALE=8/4.56,WIND=.5;

function casterPoints():Map<string,Vec3[]>{
 const groups=new Map<string,Vec3[]>();
 for(const [name,[min,max]] of Object.entries(STATIC_BOXES))groups.set(name,corners(min,max));
 for(const [i,r] of FANTASY_RESIDENTS.entries()){
  if(r.z<-40)continue; // distant spirits sit outside the lobby's shadow range, as before
  const points:Vec3[]=[];
  for(let time=0;time<40;time+=.25){
   const [x,y,z]=residentPose(r,time,F).position,h=r.height;
   points.push(...corners([x-h*.6,y-.05,z-h*.6],[x+h*.6,y+h*1.05,z+h*.6]));
  }
  groups.set(`${r.kind} #${i}`,points);
 }
 for(const [key,list] of Object.entries(plantCommunities(F))){
  if(!key.includes(':shadow'))continue;
  for(const p of list){
   const s=(p.scale??1)*TREE_SCALE,points:Vec3[]=[];
   for(const [y0,y1,radius] of TREE_LAYERS)for(const y of [y0,y1])for(let k=0;k<24;k++){
    const a=k/24*Math.PI*2,r=radius*s+WIND;
    points.push([p.position[0]+Math.cos(a)*r,p.position[1]+y*s,p.position[2]+Math.sin(a)*r]);
   }
   groups.set(`${key} @${p.position[0]},${p.position[2]}`,points);
  }
 }
 return groups;
}

for(const tier of ['nvidia geforce rtx 3050','intel(r) uhd graphics']){
 const mapSize=sunShadowMapSize(lobbyScaleForRenderer(tier).shadow);
 test(`every shadow caster and its receiver sit inside the fitted frustum (${mapSize}px)`,()=>{
  const fit=fitSunShadow(SUN,mapSize),camera=new OrthographicCamera(fit.left,fit.right,fit.top,fit.bottom,fit.near,fit.far);
  camera.position.set(...fit.position);camera.lookAt(new Vector3(...fit.target));camera.updateMatrixWorld();
  const groups=casterPoints();
  assert.ok(groups.size>=10,'caster set looks incomplete');
  assert.equal([...groups.keys()].filter(name=>name.includes(':shadow')).length,2,'expected the two near trees');
  const view=new Vector3();
  for(const [name,points] of groups)for(const caster of points)for(const point of [caster,shadowReceiver(caster)]){
   view.set(...point).applyMatrix4(camera.matrixWorldInverse);
   const depth=-view.z,margins=[view.x-fit.left,fit.right-view.x,fit.top-view.y,view.y-fit.bottom,depth-fit.near,fit.far-depth];
   assert.ok(Math.min(...margins)>=MARGIN,`${name} leaves the shadow frustum (margins ${margins.map(m=>m.toFixed(2))})`);
  }
 });
}
test('the fit changes the light position but not its direction',()=>{
 const fit=fitSunShadow(SUN,1024),offset=sub(fit.position,fit.target);
 assert.deepEqual(offset.map(c=>+c.toFixed(9)),[...SUN]);
 const {u,v,t}=toLightSpace(SUN,fit.target);
 assert.ok(Math.abs(t)<1e-9);assert.ok(u>-30&&u<10&&v>-8&&v<18);
});
test('the map keeps the old texel, so the sun looks as it did, from a map ~10x smaller',()=>{
 const oldHigh=112/2048*1000,oldLow=112/1024*1000;
 assert.equal(sunShadowMapSize(2048),640);assert.equal(sunShadowMapSize(1024),320);
 const high=fitSunShadow(SUN,640),low=fitSunShadow(SUN,320);
 assert.ok(Math.abs(high.texelMm-oldHigh)<1.5&&Math.abs(low.texelMm-oldLow)<2.5,`${high.texelMm} ${low.texelMm}`);
 assert.equal(high.radius,1);
 assert.ok(Math.abs(Math.abs(high.bias)*(high.far-high.near)*1000-47.8)<5,'depth bias stays near the old 47.8 mm');
 assert.ok(Math.abs(high.normalBias-.015)<.001,'normal bias stays near the old 0.015 m');
 assert.ok(640*640*10<2048*2048);
});
