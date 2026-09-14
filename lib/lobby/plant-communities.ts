import {riverbankPlants} from "./riverbank-habitats";
import {HAMLETS,ANCIENT_TREES} from "./fantasy-landmarks";
import { FANTASY_RESIDENTS } from "./wildlife-habitats";
import { vistaSpread } from "./world-distance";
import { riverLevel, riverCenter, riverWidth, roadCenter, worldHeight, worldSlope } from "./world-geography";

export const FORECOURT_BEDS=[[-2.35,-2.7],[2.35,-2.7]] as const;

type Placement = {position:[number,number,number];scale:number;yaw:number};
function buildPlantCommunities(floorY:number) {
  let seed=41927;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const regions:Record<string,Placement[]>={};
  function clear(x:number,z:number,tree=false){
    if(tree&&(HAMLETS.some(([cx,cz])=>Math.hypot(x-cx,z-cz)<15)||ANCIENT_TREES.some(t=>Math.hypot(x-t.x,z-t.z)<9)))return false;
    if(tree&&FANTASY_RESIDENTS.some(a=>Math.hypot(a.x-x,a.z-z)<3.1))return false;
    const distance=Math.hypot(x,z);
    if(Math.abs(x)<5.2&&z>-4.7&&z<5.1)return false;
    if(distance<30&&Math.abs(x-Math.sin(z*.17)*1.6)<1.25)return false;
    if(z< -7&&Math.abs(x-roadCenter(z))<(tree?3.8:2.1))return false;
    const t=(z-7)/138,rearX=-12*t+Math.sin(t*Math.PI)*6;
    if(z>7&&z<148&&Math.abs(x-rearX)<(tree?4:2.1))return false;
    if(Math.hypot(x+12,z-160)<23)return false;
    if(z< -80&&z> -270&&Math.abs(x-roadCenter(z))<20)return false;
    if(x> -61&&x< -20&&z> -280&&z< -138)return false;
    if(x> -92&&x< -38&&z>117&&z<166)return false;
    return true;
  }
  function add(kind:string,x:number,z:number,scale:number,yaw=random()*Math.PI*2){
    const y=worldHeight(x,z);if(y<riverLevel(z)+.5)return;
    const shadow=kind.startsWith('tree')&&Math.hypot(x,z)<16?'shadow':'plain';
    const key=`${kind}:${shadow}:${Math.floor(x/64)}:${Math.floor(z/64)}`;
    (regions[key]??=[]).push({position:[x,floorY+y-.04,z],scale,yaw});
  }
  for(const [x,z,scale]of [[-7,-2,1.15],[10,-12,1.25],[-10,13,1.1],[12,19,1.2]])add(x<0?'tree-c':'tree-a',x,z,scale);
  for(const [cx,cz]of FORECOURT_BEDS)for(let i=0;i<7;i++){
    const a=i/7*Math.PI*2,kind=i%3?'bush':'fern';
    const key=`${kind}:plain:forecourt`;
    (regions[key]??=[]).push({position:[cx+Math.sin(a)*.38,floorY+.22,cz+Math.cos(a)*.34],scale:kind==='bush'?.40:.5,yaw:a});
  }
  // Woodland edges grow in groups: tall crowns, younger trees, shrub understory.
  const woodlandEdges=[
    [-32,52],[-45,76],[-58,100],[-76,118],[-95,140],[-40,215],[0,218],[42,226],
    [58,112],[80,145],[106,175],[142,206],[-154,187],[-185,213],[-170,245],
    [-30,-60],[-47,-86],[-65,-117],[-82,-150],[-105,-185],[-128,-217],
    [52,-92],[75,-127],[96,-161],[116,-197],[141,-225],[160,-267],
    [-174,-260],[-195,-290],[-120,-310],[-65,-330],[15,-330],[85,-340],
  ];
  for(let grove=0;grove<woodlandEdges.length;grove++){
    const [cx,cz]=woodlandEdges[grove];
    for(let j=0;j<52;j++){
      const theta=random()*Math.PI*2,r=Math.sqrt(random())*(19+grove%4*3);
      const x=cx+Math.sin(theta)*r,z=cz+Math.cos(theta)*r;
      if(!clear(x,z,true)||worldSlope(x,z)/vistaSpread(z)>.65)continue;
      const distance=Math.hypot(x,z),altitude=worldHeight(x,z);
      const kind=distance>170?(j%5?'pine-b':'pine-a'):altitude>0?(j%3?'pine-b':'tree-d'):j%3?'tree-d':'tree-c';
      add(kind,x,z,(.68+random()*.58)*(z< -80?2.0:1));
      if(j%5===0&&distance<120)add('bush',x+2,z+1,.7+random()*.5);
    }
  }
  // The first slope is a meadow, not a bare ramp between desk and valley.
  for(let i=0;i<14000;i++){
    const angle=random()*Math.PI*2,r=i<6500?4.8+Math.sqrt(random())*16:16+Math.sqrt(random())*42;
    const x=Math.sin(angle)*r,z=Math.cos(angle)*r;
    if(!clear(x,z)||worldSlope(x,z)>1)continue;
    const growth=Math.sin(x*.19+Math.sin(z*.1))+Math.cos(z*.16);
    if(growth<-.8&&random()>.3)continue;
    const kind=i%31===0?'fern':i%17===0?'grass-wispy':'grass';
    if(kind==='grass'&&i%12!==0)continue;
    add(kind,x,z,kind==='fern'?.18+random()*.15:kind==='grass-wispy'?.2+random()*.16:.4+random()*.3);
    if(i%79===0)add('bush',x,z,.4+random()*.55);
    if(i%151===0)add(i%2?'rock-a':'rock-b',x,z,.25+random()*.5);
  }
  // Small embedded stones expose the ground scale along the worn trail.
  // Keep the centre walkable; these share the existing rock meshes/materials.
  for(let i=0;i<420;i++){
    const z=(i%2?1:-1)*(7+random()*32);
    const t=(z-7)/138;
    const center=z< -7?roadCenter(z):z>7?-12*t+Math.sin(t*Math.PI)*6:Math.sin(z*.17)*1.6;
    const x=center+(i%3?1:-1)*(.8+random()*2.1);
    add(i%2?'rock-a':'rock-b',x,z,.035+random()*.09);
  }
  // Reeds follow the waterline, with bushes and irregular stones on the bank.
  for(let i=0;i<1350;i++){
    const z=-57-random()*235,side=i%2?1:-1;
    const x=riverCenter(z)+side*(riverWidth(z)+.7+random()*3.7);
    if(!clear(x,z))continue;
    add(i%9===0?'bush':'tall-grass',x,z,.55+random()*.65);
    if(i%37===0)add('rock-b',x,z,.5+random()*.45);
  }
  // Compact groves make readable habitats at the expanded world scale. Their
  // footprint is measured in world metres, leaving open glades between crowns.
  const habitats=[
    [-74,-108,29],[-62,-139,25],[-88,-154,38],[-111,-172,37],
    [-45,-178,22],[-78,-224,33],[-100,-268,40],[-48,-307,38],
    [-12,-312,31],[32,-298,29],[48,-346,36],
    [67,-146,28],[94,-148,30],[98,-186,35],[122,-229,36],
    [138,-288,38],[-164,-299,39],[-205,-342,34],
  ];
  for(let grove=0;grove<habitats.length;grove++){
    const [cx,cz,extent]=habitats[grove],spread=vistaSpread(cz);
    for(let i=0;i<66;i++){
      const angle=random()*Math.PI*2,r=Math.sqrt(random())*extent/spread;
      const x=cx+Math.cos(angle)*r,z=cz+Math.sin(angle)*r*.76;
      if(!clear(x,z,true)||worldSlope(x,z)/spread>.65)continue;
      const kind=grove%3===0?(i%4?'tree-d':'tree-c'):(i%5?'pine-b':'tree-d');
      add(kind,x,z,1.65+random()*1.15);
      if(i%3===0){
        add('bush',x+1/spread,z,.85+random()*.9);
        add('rock-b',x-1.4/spread,z+.8/spread,.45+random()*.55);
      }
    }
  }
  // Forest masses follow the shoulders of the valley, with open river corridors.
  // Crown sizes are in world metres; spreading terrain must not miniaturize trees.
  const deepGroves=[[-96,-135],[-114,-168],[-87,-206],[-63,-252],[-43,-272],
    [-79,-311],[-104,-357],[-146,-291],[-171,-347],[-134,-405],[-83,-428],
    [80,-169],[94,-210],[68,-246],[56,-280],[83,-321],[121,-350],[153,-397],
    [-22,-357],[21,-382],[-28,-451],[35,-480]];
  for(const [cx,cz]of deepGroves)for(let i=0;i<95;i++){
    const a=random()*Math.PI*2,r=Math.sqrt(random())*(14+random()*12);
    const x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r*.72;
    if(!clear(x,z,true)||worldSlope(x,z)/vistaSpread(z)>.72)continue;
    add(i%4?'tree-d':'pine-b',x,z,1.5+random()*1.6);
  }
  // Low shrubs at meadow edges keep the animals' open clearings legible.
  for(const animal of FANTASY_RESIDENTS)for(let i=0;i<12;i++){
    const angle=random()*Math.PI*2,r=(7+random()*7)/vistaSpread(animal.z);
    const x=animal.x+Math.cos(angle)*r,z=animal.z+Math.sin(angle)*r;
    if(clear(x,z)&&worldSlope(x,z)<.7)add(i%3?'bush':'fern',x,z,.5+random()*.6);
  }
  // Outcrops interrupt the clean mesa edges and shelter shrub pockets.
  const outcrops=[[-56,-101],[-46,-113],[-39,-129],[-81,-158],[-96,-198],[-109,-239],[-77,-290],[55,-131],[64,-151],[103,-213],[118,-257]];
  for(const [cx,cz]of outcrops)for(let i=0;i<6;i++){
    const spread=vistaSpread(cz),x=cx+(random()-.5)*19/spread,z=cz+(random()-.5)*13/spread;
    if(!clear(x,z)||FANTASY_RESIDENTS.some(a=>Math.hypot(a.x-x,a.z-z)<3)||worldHeight(x,z)<riverLevel(z)+2)continue;
    const scale=1.5+random()*2.8,kind=i%2?'rock-a':'rock-b';
    const key=`${kind}:plain:outcrops`;
    (regions[key]??=[]).push({position:[x,floorY+worldHeight(x,z)-scale*.28,z],scale,yaw:random()*Math.PI*2});
    add('bush',x+2/spread,z-1/spread,.9+random()*.7);
  }
  // Riparian growth is independent of the town's broad tree exclusion zone.
  // Keep actual bridge approaches, landings and waterfall channels open.
  for(const {kind,...plant}of riverbankPlants(floorY)){
    const key=`${kind}:plain:riverbank`;(regions[key]??=[]).push(plant);
  }
  return regions;
}



// Every vegetation kit and the terrain AO read the same deterministic layout.
// Rebuilding the full scatter for each species stalls the desk's first frame.
// Consumers treat these placements as immutable; transforms belong to their meshes.
const communityCache=new Map<number,ReturnType<typeof buildPlantCommunities>>();
export function plantCommunities(floorY:number){
  let communities=communityCache.get(floorY);
  if(!communities){
    communities=buildPlantCommunities(floorY);
    if(communityCache.size>=3)communityCache.delete(communityCache.keys().next().value!);
    communityCache.set(floorY,communities);
  }
  return communities;
}
