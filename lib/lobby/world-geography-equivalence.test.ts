import test from 'node:test';
import assert from 'node:assert/strict';
import * as current from './world-geography';

// Verbatim copy of world-geography.ts as it stood before the hoisting rewrite
// (only the export keywords are dropped). The rewrite must match it bit for bit.
// --- legacy begin ---
/** One continuous height field for terrain, water banks, roads and buildings.
 * Scene units follow the existing desk. Elevations are relative to its feet.
 */
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

// Smooth, deterministic noise gives the land irregular shoulders and hollows.
// The same surface positions scenery and water, avoiding floating vegetation.
function noise(x: number, z: number) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const hash = (a: number, b: number) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  const u = smooth(0, 1, x - ix), v = smooth(0, 1, z - iz);
  return (hash(ix, iz) * (1-u) + hash(ix+1, iz) * u) * (1-v)
    + (hash(ix, iz+1) * (1-u) + hash(ix+1, iz+1) * u) * v;
}

function surfaceRelief(x: number, z: number) {
  const outsidePaving = smooth(5.8, 9, Math.hypot(x / 1.15, z));
  return outsidePaving * ((noise(x*.42,z*.42)-.5)*.42 + (noise(x*1.1,z*1.1)-.5)*.12);
}

function terraceHeight(x: number, z: number) {
  const distance = Math.hypot(x / 1.2, z - 1);
  const edge = Math.max(0, distance - 6);
  const valley = -Math.pow(edge, 1.12) * 0.26;
  const hills = Math.sin(x * 0.16) * Math.cos(z * 0.13) * Math.min(edge * 0.13, 2.8);
  const plateau = (cx: number, cz: number, w: number, h: number) => h * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / w ** 2);
  const ridges = plateau(-20, -24, 12, 6) + plateau(27, -35, 17, 9) + plateau(-32, 18, 15, 8);
  return -0.13 + valley + hills * 0.5 + ridges * Math.min(1, edge / 12) * 0.45 + surfaceRelief(x, z);
}

function riverCenter(z: number) { return 22 + Math.sin(z * 0.014) * 28 + Math.sin(z * 0.035 + 0.8) * 8; }
function riverWidth(z: number) { return 5.5 + (1 + Math.sin(z * 0.023)) * 2.2; }
const RIVER_LEVEL = -31;
/** The front gorge drops below the terrace; the rear valley keeps its elevation. */
function riverLevel(z:number){return RIVER_LEVEL-25*smooth(24,80,-z);}
const RIVER_LEVEL_GLSL='(-31.0-25.0*smoothstep(24.0,80.0,-p.z))';

const VISTA_STREAMS=[{x:-67,z:-121,width:4.8,source:-12},{x:72,z:-170,width:5.2,source:-10}] as const;
function vistaStream(index:number,t:number){
  const stream=VISTA_STREAMS[index],end=riverCenter(stream.z);
  const drop=smooth(.28,.34,t)*.56+smooth(.69,.77,t)*.44;
  return {x:stream.x+(end-stream.x)*t,z:stream.z+Math.sin(t*Math.PI)*2,
    y:stream.source+(riverLevel(stream.z)-stream.source)*drop,width:stream.width*(.85+t*.3)};
}
function streamLand(height:number,x:number,z:number){
  for(let i=0;i<VISTA_STREAMS.length;i++){
    const stream=VISTA_STREAMS[i],end=riverCenter(stream.z),t=(x-stream.x)/(end-stream.x);
    if(t<=0||t>=1||Math.abs(z-stream.z)>12)continue;
    const sample=vistaStream(i,t),d=Math.abs(z-sample.z);
    const blend=(1-smooth(sample.width*.5,sample.width*.5+5,d))*smooth(0,.08,t)*(1-smooth(.96,1,t));
    // Leave clearance for the coarser triangulated ground beneath fast drops.
    // The water strip samples the profile more densely than the valley mesh.
    height=height*(1-blend)+(sample.y-2.8)*blend;
  }
  return height;
}

function frontLandforms(x:number,z:number){
  const front=smooth(35,85,-z);
  if(front===0)return 0;
  const wx=x+(noise(x*.024,z*.024)-.5)*12,wz=z+(noise(x*.031+7,z*.031)-.5)*10;
  const mesa=(cx:number,cz:number,rx:number,rz:number,h:number)=>{
    const r=Math.hypot((wx-cx)/rx,(wz-cz)/rz);
    return h*(1-smooth(.60,1.0,r));
  };
  const peak=(cx:number,cz:number,rx:number,rz:number,h:number)=>{
    const r=Math.hypot((wx-cx)/rx,(wz-cz)/rz);
    const crest=1-r+(noise(wx*.032,wz*.019)-.5)*.32;
    const ribs=Math.abs(noise(wx*.10,wz*.075)*2-1);
    return h*Math.pow(Math.max(0,crest),1.25)*(1-.22*ribs);
  };
  return front*(mesa(-78,-139,58,70,32)+mesa(89,-169,65,85,36)
    +peak(-174,-320,145,100,75)+peak(155,-340,160,110,100)
    +peak(-70,-450,180,125,145)+peak(65,-550,220,130,185)
    +peak(-230,-700,220,160,155)+peak(180,-750,240,190,225));
}

function roadCenter(z: number) {
  const distance = Math.max(0, -z - 7);
  const blend = smooth(0, 60, distance);
  return Math.sin(z * 0.07) * 1.5 * (1 - blend) + (riverCenter(z) - riverWidth(z) - 9) * blend;
}

function worldHeight(x: number, z: number): number {
  const distance = Math.hypot(x, z);
  if (distance < 32) return terraceHeight(x, z);
  const riverDistance = Math.abs(x - riverCenter(z));
  const bank = smooth(riverWidth(z) * .8, riverWidth(z) + 9, riverDistance);
  const hills = 5 * Math.sin(x * .033 + Math.sin(z * .011)) * Math.cos(z * .028)
    + 2 * Math.sin(x * .079 + z * .051);
  let height = riverLevel(z) - 2 + bank * (9 + hills);
  // Hillsides rise away from the valley; ridges are separated by saddles.
  const ridge = (cx: number, cz: number, radius: number, h: number) =>
    h * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / radius ** 2)
      * (0.85 + 0.10 * Math.sin(x * .13 + Math.sin(z * .09)) + 0.05 * Math.sin(z * .19 + x * .1));
  height += .4 * (ridge(-115, -105, 44, 32) + ridge(133, -156, 51, 48)
    + ridge(-170, -258, 57, 65) + ridge(160, -335, 65, 92)
    + ridge(-80, -380, 73, 80) + ridge(40, -480, 82, 104)
    + ridge(-180, 180, 85, 72) + ridge(160, 240, 78, 83)
    + ridge(-350, 0, 100, 110) + ridge(345, -30, 90, 99));
  // A connected hill under the existing rear academy (no separate plinth).
  const academy = ridge(-12, 160, 58, 6);
  height += academy;
  // Eroded ribs break the broad hill silhouettes without disturbing the town,
  // river channel or the approved near terrace.
  const wild = smooth(26, 65, riverDistance) * smooth(80, 170, distance);
  const wx = x + (noise(x*.019,z*.019)-.5)*28;
  const wz = z + (noise(x*.019+71,z*.019)-.5)*28;
  const drainage = Math.abs(noise(wx*.038,wz*.038)*2-1);
  height += wild * (12*(noise(wx*.024,wz*.024)-.5) - 7*drainage
    + 3*(noise(wx*.09,wz*.09)-.5));
  height += frontLandforms(x,z);
  height += bank * surfaceRelief(x, z);
  height=streamLand(height,x,z);
  // Ridges must not fill the river bed. Keep one submerged channel through
  // both sides of the valley, with soft banks into the surrounding landform.
  const channel=1-smooth(riverWidth(z)*.65,riverWidth(z)+4,riverDistance);
  height=height*(1-channel)+(riverLevel(z)-1.8)*channel;
  const blend = smooth(32, 78, distance);
  return terraceHeight(x, z) * (1 - blend) + height * blend;
}

function worldSlope(x: number, z: number) {
  return Math.hypot(worldHeight(x + 1, z) - worldHeight(x - 1, z), worldHeight(x, z + 1) - worldHeight(x, z - 1)) / 2;
}
// --- legacy end ---

// mulberry32: a tiny deterministic generator, so a failure names a reproducible sample.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const same = (a: number, b: number) => Object.is(a, b);
function check(name: string, x: number, z: number) {
  const h = current.worldHeight(x, z), expected = worldHeight(x, z);
  assert.ok(same(h, expected), `worldHeight(${x}, ${z}) [${name}]: ${h} !== ${expected}`);
}

test('worldHeight is bit-identical to the legacy implementation on 240k random samples', () => {
  const next = rng(0x5eed), at = (span: number) => (next() * 2 - 1) * span;
  // Spans cover the terrace, the valley, the front landforms (z < -35) and the far rim.
  for (const span of [40, 90, 200, 500, 900])
    for (let i = 0; i < 48000; i++) check(`span ${span}`, at(span), at(span));
});

test('worldHeight matches on integer and half-integer grids, including both axes through zero', () => {
  for (let x = -120; x <= 120; x += 1.5) for (let z = -120; z <= 120; z += 1.5) check('grid', x, z);
  for (let v = -800; v <= 800; v += 2) { check('x axis', v, 0); check('z axis', 0, v); check('neg zero x', -0, v); check('neg zero z', v, -0); }
});

test('worldHeight matches at grid corners, region edges and extreme coordinates', () => {
  const edges = [0, 1, 31.999999, 32, 32.000001, 77.999999, 78, 78.000001, 80, 170, 26, 65, 35, 85, 24, 500, 1e4, 1e6, 1e12, 1e150, 1e200, 1e300];
  for (const a of edges) for (const b of edges) for (const sx of [-1, 1]) for (const sz of [-1, 1]) check('edges', sx * a, sz * b);
  for (const v of [NaN, Infinity, -Infinity]) { check('non-finite', v, 40); check('non-finite', 40, v); check('non-finite', v, v); }
});

test('worldHeight matches along the river banks, the tributaries and the front landforms', () => {
  for (let z = -900; z <= 400; z += 0.7) {
    const centre = riverCenter(z), width = current.riverWidth(z);
    for (const offset of [0, 0.3, 0.8, 1, 5.5, 7.7, 9, 26, 30, 65, 70, -0.8, -5, -26, -65])
      check('bank', centre + offset * (width / 5.5), z);
  }
  for (let stream = 0; stream < current.VISTA_STREAMS.length; stream++)
    for (let step = -5; step <= 105; step += 0.25) {
      const sample = vistaStream(stream, step / 100);
      for (const lateral of [-12, -4, -1, 0, 1, 4, 12, 13]) check('tributary', sample.x, sample.z + lateral);
    }
  const next = rng(77);
  for (let i = 0; i < 40000; i++) check('front', (next() * 2 - 1) * 700, -35 - next() * 800);
});

test('worldHeight is unaffected by what the z memo held before the call', () => {
  const next = rng(9);
  for (let i = 0; i < 20000; i++) {
    const x = (next() * 2 - 1) * 300, z = (next() * 2 - 1) * 300;
    current.worldHeight(x + 3, z + 0.5);
    check('memo', x, z); check('memo again', x + 1, z); check('memo -x', x - 1, z);
  }
});

test('worldSlope, the river curves and the tributary samples match the legacy functions', () => {
  const next = rng(31);
  for (let i = 0; i < 30000; i++) {
    const x = (next() * 2 - 1) * 400, z = (next() * 2 - 1) * 400;
    assert.ok(same(current.worldSlope(x, z), worldSlope(x, z)), `worldSlope(${x}, ${z})`);
    assert.ok(same(current.terraceHeight(x / 8, z / 8), terraceHeight(x / 8, z / 8)), `terraceHeight(${x / 8}, ${z / 8})`);
    assert.ok(same(current.riverCenter(z), riverCenter(z)) && same(current.riverWidth(z), riverWidth(z)) && same(current.riverLevel(z), riverLevel(z)));
    assert.ok(same(current.roadCenter(z), roadCenter(z)));
  }
  assert.equal(current.RIVER_LEVEL_GLSL, RIVER_LEVEL_GLSL);
  assert.equal(current.RIVER_LEVEL, RIVER_LEVEL);
  for (let stream = 0; stream < 2; stream++)
    for (let step = -10; step <= 110; step++) {
      const a = current.vistaStream(stream, step / 100), b = vistaStream(stream, step / 100);
      assert.ok(same(a.x, b.x) && same(a.y, b.y) && same(a.z, b.z) && same(a.width, b.width), `vistaStream ${stream} ${step}`);
    }
});
