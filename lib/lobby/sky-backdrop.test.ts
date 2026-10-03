import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';
import {quantizeSkyRatio,rotationDelta,skyPoseChanged} from './sky-backdrop';
import {DESK_CAMERA,DESK_TARGET} from './world-view';

const target=new Vector3(DESK_TARGET.x,DESK_TARGET.y,DESK_TARGET.z);
const poseAt=(x:number,y:number,z:number=DESK_CAMERA.z)=>{
  const camera=new PerspectiveCamera(50,16/9,.05,3200);
  camera.position.set(x,y,z);camera.lookAt(target);camera.updateMatrixWorld();
  return camera.matrixWorld.elements;
};

test('sky ratio snaps to 1, 1.5 or 2',()=>{
  assert.equal(quantizeSkyRatio(.75,0),1);
  assert.equal(quantizeSkyRatio(1,0),1);
  assert.equal(quantizeSkyRatio(1.25,0),1.5);
  assert.equal(quantizeSkyRatio(2,0),2);
  assert.equal(quantizeSkyRatio(3,0),2);
  assert.equal(quantizeSkyRatio(Number.NaN,0),1);
});

test('sky ratio holds its level through a governor wobble',()=>{
  let level=quantizeSkyRatio(1.5,0);
  for(const live of [1.4,1.25,1.2,1.35,1.5])assert.equal(level=quantizeSkyRatio(live,level),1.5);
  assert.equal(quantizeSkyRatio(1.1,1.5),1);
  assert.equal(quantizeSkyRatio(1.4,1),1.5);
  assert.equal(quantizeSkyRatio(1.3,1),1);
});

test('governor ladder from native 2x causes one reallocation per ~0.5 of ratio, not per step',()=>{
  let level=0,changes=0;
  for(const live of [2,1.85,1.7,1.55,1.4,1.25,1.1,1,.9,.8,.75,.85,.95,1.05,1.15,1.25,1.35,1.45]){
    const next=quantizeSkyRatio(live,level);if(next!==level)changes++;level=next;
  }
  assert.ok(changes<=4,String(changes));
});

test('an identical pose never redraws and sub-threshold drift is absorbed',()=>{
  const drawn=poseAt(DESK_CAMERA.x,DESK_CAMERA.y);
  assert.equal(skyPoseChanged(drawn,poseAt(DESK_CAMERA.x,DESK_CAMERA.y)),false);
  assert.equal(skyPoseChanged(drawn,poseAt(DESK_CAMERA.x+1e-5,DESK_CAMERA.y)),false);
});

test('seated parallax extremes redraw, so the sky tracks real pointer motion',()=>{
  const drawn=poseAt(DESK_CAMERA.x,DESK_CAMERA.y);
  assert.equal(skyPoseChanged(drawn,poseAt(DESK_CAMERA.x+.06,DESK_CAMERA.y)),true);
  assert.equal(skyPoseChanged(drawn,poseAt(DESK_CAMERA.x,DESK_CAMERA.y-.06)),true);
});

test('the dive redraws: translation alone and the turn toward the monitor both trip it',()=>{
  const drawn=poseAt(DESK_CAMERA.x,DESK_CAMERA.y);
  assert.equal(skyPoseChanged(drawn,poseAt(DESK_CAMERA.x,DESK_CAMERA.y,DESK_CAMERA.z-1)),true);
  const turned=poseAt(DESK_CAMERA.x+.003,DESK_CAMERA.y);
  assert.equal(skyPoseChanged(drawn,turned),true);
});

test('rotationDelta approximates the turned angle',()=>{
  const a=new PerspectiveCamera(),b=new PerspectiveCamera();
  b.rotation.y=.001;a.updateMatrixWorld();b.updateMatrixWorld();
  const delta=rotationDelta(a.matrixWorld.elements,b.matrixWorld.elements);
  assert.ok(delta>.0009&&delta<.0011,String(delta));
});
