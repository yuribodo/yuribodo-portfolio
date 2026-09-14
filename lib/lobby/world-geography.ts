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

export function terraceHeight(x: number, z: number) {
  const distance = Math.hypot(x / 1.2, z - 1);
  const edge = Math.max(0, distance - 6);
  const valley = -Math.pow(edge, 1.12) * 0.26;
  const hills = Math.sin(x * 0.16) * Math.cos(z * 0.13) * Math.min(edge * 0.13, 2.8);
  const plateau = (cx: number, cz: number, w: number, h: number) => h * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / w ** 2);
  const ridges = plateau(-20, -24, 12, 6) + plateau(27, -35, 17, 9) + plateau(-32, 18, 15, 8);
  return -0.13 + valley + hills * 0.5 + ridges * Math.min(1, edge / 12) * 0.45 + surfaceRelief(x, z);
}

export function riverCenter(z: number) { return 22 + Math.sin(z * 0.014) * 28 + Math.sin(z * 0.035 + 0.8) * 8; }
export function riverWidth(z: number) { return 5.5 + (1 + Math.sin(z * 0.023)) * 2.2; }
export const RIVER_LEVEL = -31;
/** The front gorge drops below the terrace; the rear valley keeps its elevation. */
export function riverLevel(z:number){return RIVER_LEVEL-25*smooth(24,80,-z);}
export const RIVER_LEVEL_GLSL='(-31.0-25.0*smoothstep(24.0,80.0,-p.z))';

export const VISTA_STREAMS=[{x:-67,z:-121,width:4.8,source:-12},{x:72,z:-170,width:5.2,source:-10}] as const;
export function vistaStream(index:number,t:number){
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

export function roadCenter(z: number) {
  const distance = Math.max(0, -z - 7);
  const blend = smooth(0, 60, distance);
  return Math.sin(z * 0.07) * 1.5 * (1 - blend) + (riverCenter(z) - riverWidth(z) - 9) * blend;
}

export function worldHeight(x: number, z: number): number {
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

export function worldSlope(x: number, z: number) {
  return Math.hypot(worldHeight(x + 1, z) - worldHeight(x - 1, z), worldHeight(x, z + 1) - worldHeight(x, z - 1)) / 2;
}
