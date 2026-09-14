"use client";
import { applyOutdoorLight, useOutdoorLight } from "./outdoor-lighting";

import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { applyWorldWind } from "./world-wind";
import { DoubleSide, Mesh, MeshStandardMaterial } from "three";
import { InstanceBatch, useBakedGeometry } from "./art-directed-terrace";
import { roadCenter, worldHeight } from "@/lib/lobby/world-geography";

type Placement={position:[number,number,number];scale:number;yaw:number};
function colonies(floorY:number){
  let seed=183;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const flowers:Placement[]=[],bushes:Placement[]=[];
  const beds=[[-2.8,5.1,1.3],[3.6,5.7,1.6],[-5.6,8,2],[5,10,2.2],[-7,-8,2.2],[8,-10,2.4],[-11,18,3],[10,22,3.2],[-17,-27,4],[18,-30,4],[-60,-110,2.4],[-65,-125,2.8],[-57,-132,3.1],[-74,-144,3.6],[78,-170,3.4],[88,-155,2.8],[-84,-185,4]];
  for(const [cx,cz,radius]of beds){
    const bushesHere=radius>2?2:1;
    for(let i=0;i<42;i++){
      const angle=random()*Math.PI*2,r=Math.sqrt(random())*radius;
      const x=cx+Math.cos(angle)*r,z=cz+Math.sin(angle)*r;
      if(Math.abs(x)<5&&z<4.35&&z>-4.7)continue;
      const t=(z-7)/138,center=z>7?-12*t+Math.sin(t*Math.PI)*6:z< -7?roadCenter(z):Math.sin(z*.17)*1.6;
      if(Math.abs(x-center)<1.45)continue;
      flowers.push({position:[x,floorY+worldHeight(x,z)-.02,z],scale:.58+random()*.55,yaw:random()*Math.PI*2});
    }
    for(let i=0;i<bushesHere;i++){
      const x=cx+(i-.5)*radius,z=cz+radius*.7;
      bushes.push({position:[x,floorY+worldHeight(x,z)-.04,z],scale:.6+random()*.35,yaw:random()*Math.PI*2});
    }
  }
  return {flowers,'flower-bush':bushes};
}

export function FlowerColonies({floorY}:{floorY:number}){
  const light=useOutdoorLight();
  const {scene}=useGLTF('/lobby/world/meadow-flowers.glb'),geometries=useBakedGeometry(scene);
  const {materials}=useMemo(()=>{
    const materials=new Map<MeshStandardMaterial,MeshStandardMaterial>();
    scene.traverse(o=>{
      if(!(o instanceof Mesh)||materials.has(o.material as MeshStandardMaterial))return;
      const source=o.material as MeshStandardMaterial,m=source.clone();
      m.side=DoubleSide;m.alphaTest=.2;m.alphaToCoverage=true;m.transparent=false;m.roughness=1;m.envMapIntensity=.12;
      m.customProgramCacheKey=()=> 'flower-colonies-v1';applyWorldWind(m,light,.65,.12,.012);applyOutdoorLight(m,light,.16);materials.set(source,m);
    });
    return {materials};
  },[scene,light]);
  const placements=useMemo(()=>colonies(floorY),[floorY]);
  useEffect(()=>()=>materials.forEach(m=>m.dispose()),[materials]);
  return <group name="flower-colonies">{Object.entries(placements).flatMap(([name,plants])=>{
    const meshes:Mesh[]=[];scene.getObjectByName(name)?.traverse(o=>{if(o instanceof Mesh)meshes.push(o)});
    return meshes.map(mesh=><InstanceBatch key={mesh.name} geometry={geometries.get(mesh.name)!} material={materials.get(mesh.material as MeshStandardMaterial)!} placements={plants}/>);
  })}</group>;
}
