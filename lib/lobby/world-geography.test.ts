import test from 'node:test';
import assert from 'node:assert/strict';
import { riverLevel, riverCenter, worldHeight, VISTA_STREAMS, vistaStream } from './world-geography';

test('the river remains submerged through the front and rear ridge systems',()=>{
  for(const side of [-1,1])for(let distance=90;distance<=490;distance+=5){
    const z=side*distance;
    assert.ok(worldHeight(riverCenter(z),z)<riverLevel(z)-.5,`dry river centre at z=${z}`);
  }
});

test('the near terrace blends continuously into the valley after channel carving',()=>{
  for(const radius of [32,78])for(let i=0;i<64;i++){
    const angle=i/64*Math.PI*2;
    const at=(r:number)=>worldHeight(Math.sin(angle)*r,Math.cos(angle)*r);
    assert.ok(Math.abs(at(radius-.0001)-at(radius+.0001))<.01,`height jump at radius=${radius}, angle=${angle}`);
  }
});

// Both banks must descend into the same river surface used by the water mesh.
test('the front gorge gains depth while the rear water stays level',()=>{
  assert.equal(riverLevel(160),-31);
  assert.equal(riverLevel(-160),-56);
  for(let z=-80;z< -24;z+=.25)assert.ok(riverLevel(z)<=riverLevel(z+.25));
  for(const z of [-24,-80])assert.ok(Math.abs(riverLevel(z-.0001)-riverLevel(z+.0001))<.001);
});


test('stepped tributaries stay above their carved beds and meet the main river',()=>{
  for(let stream=0;stream<VISTA_STREAMS.length;stream++){
    for(let step=10;step<=95;step++){
      const sample=vistaStream(stream,step/100);
      assert.ok(worldHeight(sample.x,sample.z)<sample.y-.5,`buried tributary ${stream} at ${step}%`);
    }
    const mouth=vistaStream(stream,1);
    assert.ok(Math.abs(mouth.x-riverCenter(mouth.z))<1e-9);
    assert.ok(Math.abs(mouth.y-riverLevel(mouth.z))<1e-9);
  }
});

// Sample the actual triangle spacing, not just the analytic height function:
// a fast drop can sit above that function while still being cut by a coarse face.
test('waterfall sheets clear the rendered valley triangles across their visible width',async()=>{
  const {VALLEY_AXIS:axis}=await import('./valley-terrain-grid');
  const {distantPosition}=await import('./world-distance');
  const locate=(v:number)=>{const i=axis.findIndex(a=>a>v);return [axis[i-1],axis[i]];};
  const vertex=(x:number,z:number)=>distantPosition([x,worldHeight(x,z),z]);
  function surface(p:number[],a:number[],b:number[],c:number[]){
    const det=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);
    const u=((b[2]-c[2])*(p[0]-c[0])+(c[0]-b[0])*(p[2]-c[2]))/det;
    const v=((c[2]-a[2])*(p[0]-c[0])+(a[0]-c[0])*(p[2]-c[2]))/det;
    return u>=-1e-6&&v>=-1e-6&&u+v<=1.000001?u*a[1]+v*b[1]+(1-u-v)*c[1]:null;
  }
  for(let stream=0;stream<2;stream++)for(let step=10;step<230;step++)for(const lateral of [-.42,0,.42]){
    const water=vistaStream(stream,step/240),z=water.z+water.width*lateral;
    const [x0,x1]=locate(water.x),[z0,z1]=locate(z),p=distantPosition([water.x,water.y,z]);
    const a=vertex(x0,z0),b=vertex(x1,z0),c=vertex(x0,z1),d=vertex(x1,z1);
    const ground=surface(p,a,c,b)??surface(p,b,c,d);
    assert.notEqual(ground,null);
    assert.ok(water.y+.18-ground!>.08,`water cut by ground: stream ${stream}, t=${step/240}, edge=${lateral}`);
  }
});
