import test from 'node:test';
import assert from 'node:assert/strict';
import {distantPosition,vistaSpread} from './world-distance';
import {VISTA_STREAMS,vistaStream,riverCenter,riverLevel} from './world-geography';

test('expanding the vista leaves the desk, courtyard and rear coordinates intact',()=>{
 for(const p of [[0,0,0],[.6,.14,-.31],[-7,-1,-20],[10,4,-35],[-12,-26,160]] as const)
  assert.deepEqual(distantPosition(p),p);
 assert.equal(vistaSpread(-125),3);
});
test('the landscape mapping stays continuous and never folds back on itself',()=>{
 for(const edge of [-35,-125]){
  const a=distantPosition([30,-10,edge-.00001]),b=distantPosition([30,-10,edge+.00001]);
  assert.ok(Math.hypot(a[0]-b[0],a[2]-b[2])<.001);
 }
 for(let z=-900;z<0;z+=.5){
  const a=distantPosition([30,-10,z]),b=distantPosition([30,-10,z+.5]);
  assert.ok(a[2]<b[2]);assert.equal(a[1],-10);
 }
});
test('tributary mouths and main river retain the same world-space connection',()=>{
 for(let i=0;i<VISTA_STREAMS.length;i++){
  const mouth=vistaStream(i,1),a=distantPosition([mouth.x,mouth.y,mouth.z]);
  const b=distantPosition([riverCenter(mouth.z),riverLevel(mouth.z),mouth.z]);
  assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])<1e-8);
 }
});
