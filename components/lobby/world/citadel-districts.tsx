"use client";
import {useEffect,useMemo} from 'react';
import {useGLTF} from '@react-three/drei';
import {Mesh,MeshStandardMaterial} from 'three';
import {InstanceBatch,useBakedGeometry} from './art-directed-terrace';
import {applyOutdoorLight,useOutdoorLight} from './outdoor-lighting';

/** Inhabited ledges follow the six authored districts of the citadel mesh. */
export function CitadelDistricts(){
 const {scene}=useGLTF('/lobby/world/valley-village.glb'),geometries=useBakedGeometry(scene),light=useOutdoorLight();
 const material=useMemo(()=>applyOutdoorLight(new MeshStandardMaterial({vertexColors:true,roughness:1,envMapIntensity:.12}),light),[light]);
 const districts=useMemo(()=>{
  const groups:Record<string,{position:[number,number,number];scale:number;yaw:number}[]>={};
  for(const [level,radius,height,count]of [[0,12.25,4.78,20],[1,10.07,8.78,16],[2,8.05,12.38,12],[3,6.07,15.63,8]]){
   for(let i=0;i<count;i++){
    if((i+level)%7===0)continue;
    const a=i/count*Math.PI*2+level*.19,kind=i%5===0?'inn':i%3?'house-a':'house-b';
    (groups[kind]??=[]).push({position:[Math.sin(a)*radius,height,Math.cos(a)*radius],scale:kind==='house-a'?.31:.17,yaw:a+(i%2?0:Math.PI)});
   }
  }
  return groups;
 },[]);
 useEffect(()=>()=>material.dispose(),[material]);
 return <group name="citadel-inhabited-terraces">{Object.entries(districts).flatMap(([kind,placements])=>{
  const meshes:Mesh[]=[];scene.getObjectByName(kind)?.traverse(o=>{if(o instanceof Mesh)meshes.push(o)});
  return meshes.map(mesh=><InstanceBatch key={mesh.name} geometry={geometries.get(mesh.name)!} material={material} placements={placements}/>);
 })}</group>;
}
