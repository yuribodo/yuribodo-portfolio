"use client";
import {RIVER_STOPS} from '@/lib/lobby/riverbank-habitats';
import {characterClearing} from '@/lib/lobby/world-characters';
import {HAMLETS} from "@/lib/lobby/fantasy-landmarks";
import {FANTASY_RESIDENTS} from "@/lib/lobby/wildlife-habitats";
import {distantPosition,vistaSpread} from "@/lib/lobby/world-distance";
import { applyOutdoorLight, useOutdoorLight } from "./outdoor-lighting";

import { useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo } from "react";
import { BoxGeometry,Mesh, MeshStandardMaterial } from "three";
import { VillageSmoke } from "./village-smoke";
import { LivingMill } from "./living-mill";
import { WorldBoundary } from "./world-boundary";
import { InstanceBatch, useBakedGeometry } from "./art-directed-terrace";
import { VISTA_STREAMS,vistaStream,riverCenter, riverWidth, roadCenter, worldHeight, worldSlope } from "@/lib/lobby/world-geography";

function settlementPlacements(floorY: number) {
  type Placement = { position: [number, number, number]; scale: number; yaw: number };
  const regions: Record<string, Placement[]> = {};
  let seed = 8173;
  const random = () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
  const add = (name: string, x: number, z: number, scale = 1, yaw = 0) => {
    if(characterClearing(x,z))return;
    if(z<0&&VISTA_STREAMS.some((_,i)=>Array.from({length:41},(_,j)=>vistaStream(i,j/40)).some(s=>Math.hypot(x-s.x,z-s.z)<s.width*.5+2.2)))return;
    const key = `${name}:${z < 0 ? 'front' : 'rear'}`;
    (regions[key] ??= []).push({ position: [x,floorY+worldHeight(x,z)-.15,z],scale:scale*(z<0?2.1:1),yaw });
  };
  // Varied street frontage leaves room for a market square and river crossings.
  for (let row = 0; row < 18; row++) {
    const z = -87-row*9.5;
    for (const side of [-1,1]) {
      if (row===1 || row===6) continue;
      const x = roadCenter(z)+side*(6.5+random()*2);
      if (Math.abs(x-riverCenter(z))<riverWidth(z)+3 || worldSlope(x,z)>.58) continue;
      const kind = row%5===0?'inn':row%3===0?'house-a':row%2?'house-b':'house-c';
      add(kind,x,z+(random()-.5)*2,.85+random()*.16,side>0?-Math.PI/2:Math.PI/2);
      if (row%2===0) add('house-b',x+side*7,z+3,.8,-side*Math.PI/2+.12);
    }
  }
  // Small farmsteads occupy the upper edge of the cultivated terraces.
  for(const [x,z]of [[-61,-153],[-59,-185],[-58,-220],[-59,-255]]){
    if(worldSlope(x,z)<.65){add('house-b',x,z,.9,.35);add('house-a',x-5,z+4,1.4,-.2);}
  }
  // Hillside hamlets have a square and irregular lanes, rather than a single
  // miniature ribbon of roofs along the river. Local model scale stays consistent.
  for(const [cx,cz,angle]of HAMLETS){
    for(let ring=0;ring<2;ring++)for(let i=0;i<9;i++){
      if(i===2||i===6)continue;
      const a=i/9*Math.PI*2+angle,r=ring?11:6;
      const x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r*.72;
      if(worldSlope(x,z)>1.6||FANTASY_RESIDENTS.some(r=>Math.hypot(r.x-x,r.z-z)<3.5))continue;
      add(i%4===0?'inn':i%3===0?'house-a':i%2?'house-b':'house-c',x,z,1.0+random()*.24,-a+Math.PI/2);
    }
    add('well',cx,cz,1.2);
    add('tower',cx-3,cz-8,1.15,.1);
    add('market',cx+2,cz+1,1.2,.5);
  }
  for(const {z,side}of RIVER_STOPS){
    const x=riverCenter(z)+side*(riverWidth(z)+8);
    add('house-b',x,z,1.0,side*Math.PI/2);
    add('market',x+side*1.2,z+4,.8,side*Math.PI/2);
  }
  add('market',-77,-97,1.15,.5);
  add('well',-71,-95,1.1);
  const squareZ=-144, squareX=roadCenter(squareZ);
  add('well',squareX-3,squareZ);
  for(let i=0;i<4;i++)add('market',squareX-5-i%2*4,squareZ-4+Math.floor(i/2)*5,1,Math.PI/2);
  add('tower',roadCenter(-120)-18,-120,1,.2);
  add('mill',roadCenter(-182)-24,-182,1,.35);
  for(let row=0;row<4;row++)for(let col=0;col<5;col++){
    const x=-84+col*8.5,z=123+row*10;
    if(worldSlope(x,z)>.55)continue;
    add(col%3===0?'inn':(col+row)%2?'house-c':'house-b',x,z,.8+random()*.2,Math.PI+.22);
  }
  add('mill',-93,140,1.1,Math.PI+.3);
  return regions;
}

export function ValleyVillage({floorY}:{floorY:number}) {
  const light=useOutdoorLight();
  const {scene}=useGLTF('/lobby/world/valley-village.glb');
  const geometries=useBakedGeometry(scene);
  const material=useMemo(()=>applyOutdoorLight(new MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,envMapIntensity:.1}),light),[light]);
  const {placements,foundations}=useMemo(()=>{
    const placements=settlementPlacements(floorY),foundations:{position:[number,number,number];scale:[number,number,number];yaw:number}[]=[];
    for(const [key,plants]of Object.entries(placements)){
      if(!/^(house|inn|tower)/.test(key)||key.endsWith(':rear'))continue;
      const g=geometries.get(key.split(':')[0]);if(!g)continue;g.computeBoundingBox();const b=g.boundingBox!;
      for(const p of plants){
        const width=(b.max.x-b.min.x)*p.scale*.75,depth=(b.max.z-b.min.z)*p.scale*.75,spread=vistaSpread(p.position[2]),c=Math.cos(p.yaw),s=Math.sin(p.yaw);
        const heights=[worldHeight(p.position[0],p.position[2])];
        for(const x of [-width/2,width/2])for(const z of [-depth/2,depth/2])heights.push(worldHeight(p.position[0]+(x*c+z*s)/spread,p.position[2]+(-x*s+z*c)/spread));
        const top=Math.max(...heights)+.08,bottom=Math.min(...heights)-.35;
        p.position[1]=floorY+top-.04;
        foundations.push({position:[p.position[0],floorY+(top+bottom)/2,p.position[2]],scale:[width,top-bottom,depth],yaw:p.yaw});
      }
    }
    return {placements,foundations};
  },[floorY,geometries]);
  const foundationResources=useMemo(()=>({geometry:new BoxGeometry(1,1,1),material:applyOutdoorLight(new MeshStandardMaterial({color:'#939988',roughness:1,envMapIntensity:.15}),light)}),[light]);
  useEffect(()=>()=>{foundationResources.geometry.dispose();foundationResources.material.dispose();},[foundationResources]);
  const chimneys=useMemo(()=>{
    const positions:[number,number,number][]=[];
    for(const [key,plants] of Object.entries(placements)){
      if(!/^(inn|house-b|house-c):/.test(key))continue;
      const geometry=geometries.get(key.split(':')[0]);if(!geometry)continue;
      geometry.computeBoundingBox();const max=geometry.boundingBox!.max.y,p=geometry.attributes.position;
      let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
      for(let i=0;i<p.count;i++)if(p.getY(i)>max-.035){minX=Math.min(minX,p.getX(i));maxX=Math.max(maxX,p.getX(i));minZ=Math.min(minZ,p.getZ(i));maxZ=Math.max(maxZ,p.getZ(i));}
      // A long ridge is a roof, not a chimney. Do not emit smoke from it.
      if(maxX-minX>1.2||maxZ-minZ>1.2)continue;
      const x=(minX+maxX)/2,z=(minZ+maxZ)/2;
      for(const plant of plants.slice(0,2)){
        const c=Math.cos(plant.yaw),s=Math.sin(plant.yaw),base=distantPosition(plant.position);
        positions.push([base[0]+(x*c+z*s)*plant.scale,base[1]+max*plant.scale+.06,base[2]+(-x*s+z*c)*plant.scale]);
      }
    }
    return positions;
  },[geometries,placements]);
  useEffect(()=>()=>material.dispose(),[material]);
  return <group name="authored-valley-village"><InstanceBatch geometry={foundationResources.geometry} material={foundationResources.material} placements={foundations}/><VillageSmoke chimneys={chimneys}/>{Object.entries(placements).map(([key,placements])=>{
    const object=scene.getObjectByName(key.split(':')[0]);
    const meshes:Mesh[]=[];object?.traverse(o=>{if(o instanceof Mesh)meshes.push(o)});
    if(key.startsWith('mill:')){
      const fallback=meshes.map(mesh=><InstanceBatch key={`${key}:${mesh.name}`} geometry={geometries.get(mesh.name)!} material={material} placements={placements}/>);
      return <WorldBoundary key={key} fallback={fallback}><Suspense fallback={fallback}>{placements.map((p,i)=><LivingMill key={i} {...p}/>)}</Suspense></WorldBoundary>;
    }
    return meshes.map(mesh=><InstanceBatch key={`${key}:${mesh.name}`} geometry={geometries.get(mesh.name)!} material={material} placements={placements}/>);
  })}</group>;
}
