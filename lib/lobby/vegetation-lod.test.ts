import assert from 'node:assert/strict';
import test from 'node:test';
import {isVisibleGrass,LOD_TIERS,lodTier,TALL_GRASS_MIN_SIZE,viewSize,type Placed} from './vegetation-lod';

const at=(z:number,scale=1):Placed=>({position:[0,0.4,z],scale});

test('tiers get coarser with distance and never come back', () => {
  let previous=0;
  for(let z=1.9-1;z>-400;z-=1.5){
    const tier=lodTier(at(z),1.1);
    assert.ok(tier>=previous,`z=${z}`);
    previous=tier;
  }
  assert.equal(previous,3);
});

test('thresholds are inclusive on the detailed side', () => {
  const height=1.1,place=(size:number):Placed=>{
    // The vista spread stretches z, so solve for the depth that yields this size.
    let near=1.9,far=-2000;
    for(let i=0;i<60;i++){const mid=(near+far)/2;if(viewSize({position:[0,0.4,mid]},height)>size)near=mid;else far=mid;}
    return {position:[0,0.4,(near+far)/2]};
  };
  assert.equal(lodTier(place(LOD_TIERS[0]*1.001),height),0);
  assert.equal(lodTier(place(LOD_TIERS[0]*.999),height),1);
  assert.equal(lodTier(place(LOD_TIERS[1]*.999),height),2);
  assert.equal(lodTier(place(LOD_TIERS[2]*1.001),height),2);
  assert.equal(lodTier(place(LOD_TIERS[2]*.999),height),3);
});

test('the LOD3 switch restores the two-tier behaviour', () => {
  const far=at(-300);
  assert.equal(lodTier(far,1.1,true),3);
  assert.equal(lodTier(far,1.1,false),2);
  assert.equal(lodTier(at(-300,1.5),1.1,false),2);
});

test('a bigger instance keeps a finer tier at the same distance', () => {
  assert.ok(lodTier(at(-60,3),1.1)<lodTier(at(-60,.3),1.1));
});

test('size follows height times scale over distance', () => {
  assert.equal(viewSize({position:[0,0.4,-8.1],scale:2},1.2),1.2*2/10);
});

test('thinning only drops tufts below the pixel floor and honours the switch', () => {
  const height=.6,tiny=at(-300,.5),near=at(-20,1);
  assert.ok(viewSize(tiny,height)<TALL_GRASS_MIN_SIZE);
  assert.equal(isVisibleGrass(tiny,height,true),false);
  assert.equal(isVisibleGrass(tiny,height,false),true);
  assert.equal(isVisibleGrass(near,height,true),true);
});
