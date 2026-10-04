"use client";
import { isReferenceHouse, settleOnTerrain, settlementKind, settlementPlacements, type FoundationPlacement } from "@/lib/lobby/settlement-placements";
import { distantPosition } from "@/lib/lobby/world-distance";
import { applyOutdoorLight, useOutdoorLight } from "./outdoor-lighting";

import { useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo } from "react";
import { BoxGeometry, Mesh, MeshStandardMaterial } from "three";
import { VillageSmoke } from "./village-smoke";
import { LivingMill } from "./living-mill";
import { WorldBoundary } from "./world-boundary";
import { InstanceBatch, useBakedGeometry } from "./art-directed-terrace";

/** Quaternius village buildings; the franchise-reference houses in the same layout render in ReferenceHouses. */
export function ValleyVillage({floorY}:{floorY:number}) {
  const light=useOutdoorLight();
  const {scene}=useGLTF('/lobby/world/valley-village.glb');
  const geometries=useBakedGeometry(scene);
  const material=useMemo(()=>applyOutdoorLight(new MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,envMapIntensity:.1}),light),[light]);
  const {placements,foundations}=useMemo(()=>{
    const placements=Object.fromEntries(Object.entries(settlementPlacements(floorY)).filter(([key])=>!isReferenceHouse(settlementKind(key))));
    const foundations:FoundationPlacement[]=[];
    for(const [key,plants]of Object.entries(placements)){
      if(!/^(house|inn|tower)/.test(key)||key.endsWith(':rear'))continue;
      const g=geometries.get(settlementKind(key));if(!g)continue;g.computeBoundingBox();
      foundations.push(...settleOnTerrain(plants,g.boundingBox!,floorY));
    }
    return {placements,foundations};
  },[floorY,geometries]);
  const foundationResources=useMemo(()=>({geometry:new BoxGeometry(1,1,1),material:applyOutdoorLight(new MeshStandardMaterial({color:'#939988',roughness:1,envMapIntensity:.15}),light)}),[light]);
  useEffect(()=>()=>{foundationResources.geometry.dispose();foundationResources.material.dispose();},[foundationResources]);
  const chimneys=useMemo(()=>{
    const positions:[number,number,number][]=[];
    for(const [key,plants] of Object.entries(placements)){
      if(!/^(inn|house-b|house-c):/.test(key))continue;
      const geometry=geometries.get(settlementKind(key));if(!geometry)continue;
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
    const object=scene.getObjectByName(settlementKind(key));
    const meshes:Mesh[]=[];object?.traverse(o=>{if(o instanceof Mesh)meshes.push(o)});
    if(key.startsWith('mill:')){
      const fallback=meshes.map(mesh=><InstanceBatch key={`${key}:${mesh.name}`} geometry={geometries.get(mesh.name)!} material={material} placements={placements}/>);
      return <WorldBoundary key={key} fallback={fallback}><Suspense fallback={fallback}>{placements.map((p,i)=><LivingMill key={i} {...p}/>)}</Suspense></WorldBoundary>;
    }
    return meshes.map(mesh=><InstanceBatch key={`${key}:${mesh.name}`} geometry={geometries.get(mesh.name)!} material={material} placements={placements}/>);
  })}</group>;
}
