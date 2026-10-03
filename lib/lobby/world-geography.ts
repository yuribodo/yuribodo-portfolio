/** One continuous height field for terrain, water banks, roads and buildings.
 * Scene units follow the existing desk. Elevations are relative to its feet.
 */
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

// Smooth, deterministic noise gives the land irregular shoulders and hollows.
// The same surface positions scenery and water, avoiding floating vegetation.
const hash = (a: number, b: number) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
function noise(x: number, z: number) {
  const ix = Math.floor(x), iz = Math.floor(z);
  // x - floor(x) is already in [0, 1], so smooth(0, 1, f) reduces to f*f*(3-2f).
  const fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return (hash(ix, iz) * (1-u) + hash(ix+1, iz) * u) * (1-v)
    + (hash(ix, iz+1) * (1-u) + hash(ix+1, iz+1) * u) * v;
}

const reliefNoise = (x: number, z: number) => (noise(x*.42,z*.42)-.5)*.42 + (noise(x*1.1,z*1.1)-.5)*.12;
function surfaceRelief(x: number, z: number) {
  const outsidePaving = smooth(5.8, 9, Math.hypot(x / 1.15, z));
  return outsidePaving * reliefNoise(x, z);
}

// Gaussian plateaus and ridges share one table layout: cx, cz, radius^2, height.
const PLATEAUS = new Float64Array([-20, -24, 12 ** 2, 6, 27, -35, 17 ** 2, 9, -32, 18, 15 ** 2, 8]);
function terraceWith(x: number, z: number, relief: number) {
  const distance = Math.hypot(x / 1.2, z - 1);
  const edge = Math.max(0, distance - 6);
  const valley = -Math.pow(edge, 1.12) * 0.26;
  const hills = Math.sin(x * 0.16) * Math.cos(z * 0.13) * Math.min(edge * 0.13, 2.8);
  let ridges = 0;
  for (let i = 0; i < PLATEAUS.length; i += 4)
    ridges += PLATEAUS[i + 3] * Math.exp(-((x - PLATEAUS[i]) ** 2 + (z - PLATEAUS[i + 1]) ** 2) / PLATEAUS[i + 2]);
  return -0.13 + valley + hills * 0.5 + ridges * Math.min(1, edge / 12) * 0.45 + relief;
}
export function terraceHeight(x: number, z: number) { return terraceWith(x, z, surfaceRelief(x, z)); }

export function riverCenter(z: number) { return 22 + Math.sin(z * 0.014) * 28 + Math.sin(z * 0.035 + 0.8) * 8; }
export function riverWidth(z: number) { return 5.5 + (1 + Math.sin(z * 0.023)) * 2.2; }
export const RIVER_LEVEL = -31;
/** The front gorge drops below the terrace; the rear valley keeps its elevation. */
export function riverLevel(z:number){return RIVER_LEVEL-25*smooth(24,80,-z);}
export const RIVER_LEVEL_GLSL='(-31.0-25.0*smoothstep(24.0,80.0,-p.z))';

export const VISTA_STREAMS=[{x:-67,z:-121,width:4.8,source:-12},{x:72,z:-170,width:5.2,source:-10}] as const;
const STREAM_END=VISTA_STREAMS.map(stream=>riverCenter(stream.z));
const STREAM_LEVEL=VISTA_STREAMS.map(stream=>riverLevel(stream.z));
export function vistaStream(index:number,t:number){
  const stream=VISTA_STREAMS[index],end=STREAM_END[index];
  const drop=smooth(.28,.34,t)*.56+smooth(.69,.77,t)*.44;
  return {x:stream.x+(end-stream.x)*t,z:stream.z+Math.sin(t*Math.PI)*2,
    y:stream.source+(STREAM_LEVEL[index]-stream.source)*drop,width:stream.width*(.85+t*.3)};
}
function streamLand(height:number,x:number,z:number){
  for(let i=0;i<VISTA_STREAMS.length;i++){
    const stream=VISTA_STREAMS[i],t=(x-stream.x)/(STREAM_END[i]-stream.x);
    if(t<=0||t>=1||Math.abs(z-stream.z)>12)continue;
    // vistaStream's z, y and width without the per-sample object.
    const sampleZ=stream.z+Math.sin(t*Math.PI)*2,width=stream.width*(.85+t*.3);
    const drop=smooth(.28,.34,t)*.56+smooth(.69,.77,t)*.44;
    const sampleY=stream.source+(STREAM_LEVEL[i]-stream.source)*drop,d=Math.abs(z-sampleZ);
    const blend=(1-smooth(width*.5,width*.5+5,d))*smooth(0,.08,t)*(1-smooth(.96,1,t));
    // Leave clearance for the coarser triangulated ground beneath fast drops.
    // The water strip samples the profile more densely than the valley mesh.
    height=height*(1-blend)+(sampleY-2.8)*blend;
  }
  return height;
}

// Peaks beyond r = 1.2 radii contribute exactly +0: crest = 1 - r + noise*.32 <= 0,
// so the noise taps are skipped there.
function mesa(wx:number,wz:number,cx:number,cz:number,rx:number,rz:number,h:number){
  const r=Math.hypot((wx-cx)/rx,(wz-cz)/rz);
  return h*(1-smooth(.60,1.0,r));
}
function peak(wx:number,wz:number,cx:number,cz:number,rx:number,rz:number,h:number){
  const r=Math.hypot((wx-cx)/rx,(wz-cz)/rz);
  if(r>1.2)return 0;
  const crest=1-r+(noise(wx*.032,wz*.019)-.5)*.32;
  const ribs=Math.abs(noise(wx*.10,wz*.075)*2-1);
  return h*Math.pow(Math.max(0,crest),1.25)*(1-.22*ribs);
}
function frontLandforms(x:number,z:number,front:number){
  const wx=x+(noise(x*.024,z*.024)-.5)*12,wz=z+(noise(x*.031+7,z*.031)-.5)*10;
  return front*(mesa(wx,wz,-78,-139,58,70,32)+mesa(wx,wz,89,-169,65,85,36)
    +peak(wx,wz,-174,-320,145,100,75)+peak(wx,wz,155,-340,160,110,100)
    +peak(wx,wz,-70,-450,180,125,145)+peak(wx,wz,65,-550,220,130,185)
    +peak(wx,wz,-230,-700,220,160,155)+peak(wx,wz,180,-750,240,190,225));
}

export function roadCenter(z: number) {
  const distance = Math.max(0, -z - 7);
  const blend = smooth(0, 60, distance);
  return Math.sin(z * 0.07) * 1.5 * (1 - blend) + (riverCenter(z) - riverWidth(z) - 9) * blend;
}

// Everything worldHeight needs from z alone. worldSlope's four taps and callers
// that sweep x along a row hit this single-entry memo.
let memoZ = NaN, memoCenter = 0, memoWidth = 0, memoLevel = 0, memoFront = 0;
let memoSinHill = 0, memoCosHill = 0, memoSinRidge = 0, memoRidgeZ = 0;
function loadZ(z: number) {
  memoZ = z; memoCenter = riverCenter(z); memoWidth = riverWidth(z); memoLevel = riverLevel(z); memoFront = smooth(35, 85, -z);
  memoSinHill = Math.sin(z * .011); memoCosHill = Math.cos(z * .028); memoSinRidge = Math.sin(z * .09); memoRidgeZ = z * .19;
}

// Hillsides rise away from the valley; ridges are separated by saddles.
const RIDGES = new Float64Array([-115, -105, 44 ** 2, 32, 133, -156, 51 ** 2, 48,
  -170, -258, 57 ** 2, 65, 160, -335, 65 ** 2, 92, -80, -380, 73 ** 2, 80, 40, -480, 82 ** 2, 104,
  -180, 180, 85 ** 2, 72, 160, 240, 78 ** 2, 83, -350, 0, 100 ** 2, 110, 345, -30, 90 ** 2, 99]);
const ACADEMY = [-12, 160, 58 ** 2, 6] as const;

export function worldHeight(x: number, z: number): number {
  const distance = Math.hypot(x, z);
  if (distance < 32) return terraceHeight(x, z);
  if (!Object.is(z, memoZ)) loadZ(z);
  const riverDistance = Math.abs(x - memoCenter);
  const bank = smooth(memoWidth * .8, memoWidth + 9, riverDistance);
  const hills = 5 * Math.sin(x * .033 + memoSinHill) * memoCosHill
    + 2 * Math.sin(x * .079 + z * .051);
  let height = memoLevel - 2 + bank * (9 + hills);
  // Every ridge scales by the same wobble, which depends on (x, z) only.
  const wobble = 0.85 + 0.10 * Math.sin(x * .13 + memoSinRidge) + 0.05 * Math.sin(memoRidgeZ + x * .1);
  let ridges = 0;
  for (let i = 0; i < RIDGES.length; i += 4)
    ridges += RIDGES[i + 3] * Math.exp(-((x - RIDGES[i]) ** 2 + (z - RIDGES[i + 1]) ** 2) / RIDGES[i + 2]) * wobble;
  height += .4 * ridges;
  // A connected hill under the existing rear academy (no separate plinth).
  height += ACADEMY[3] * Math.exp(-((x - ACADEMY[0]) ** 2 + (z - ACADEMY[1]) ** 2) / ACADEMY[2]) * wobble;
  // Eroded ribs break the broad hill silhouettes without disturbing the town,
  // river channel or the approved near terrace.
  const wild = smooth(26, 65, riverDistance) * smooth(80, 170, distance);
  // wild = 0 adds a signed zero, which only matters when height is itself zero.
  if (wild !== 0 || height === 0) {
    const wx = x + (noise(x*.019,z*.019)-.5)*28;
    const wz = z + (noise(x*.019+71,z*.019)-.5)*28;
    const drainage = Math.abs(noise(wx*.038,wz*.038)*2-1);
    height += wild * (12*(noise(wx*.024,wz*.024)-.5) - 7*drainage
      + 3*(noise(wx*.09,wz*.09)-.5));
  }
  height += memoFront === 0 ? 0 : frontLandforms(x, z, memoFront);
  // distance >= 32 puts the paving fade at exactly 1.
  const relief = reliefNoise(x, z);
  height += bank * relief;
  height=streamLand(height,x,z);
  // Ridges must not fill the river bed. Keep one submerged channel through
  // both sides of the valley, with soft banks into the surrounding landform.
  const channel=1-smooth(memoWidth*.65,memoWidth+4,riverDistance);
  height=height*(1-channel)+(memoLevel-1.8)*channel;
  const blend = smooth(32, 78, distance);
  // Past the blend the terrace term is terrace * 0, i.e. a signed zero again.
  if (blend === 1 && height !== 0 && distance < 1e100) return height;
  return terraceWith(x, z, relief) * (1 - blend) + height * blend;
}

export function worldSlope(x: number, z: number) {
  return Math.hypot(worldHeight(x + 1, z) - worldHeight(x - 1, z), worldHeight(x, z + 1) - worldHeight(x, z - 1)) / 2;
}
