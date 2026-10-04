"use client";
import {distantPosition} from "@/lib/lobby/world-distance";
import {useEffect,useMemo,useRef} from 'react';
import {useGLTF} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {Mesh,MeshStandardMaterial,Vector3} from 'three';
import {useBakedGeometry} from './art-directed-terrace';
import {applyOutdoorLight,useOutdoorLight} from './outdoor-lighting';

export function LivingMill({position,scale=1,yaw=0}:{position:[number,number,number];scale?:number;yaw?:number}){
 const {scene}=useGLTF('/lobby/world/living-mill.glb'),light=useOutdoorLight(),rotor=useRef<Mesh>(null);
 const baked=useBakedGeometry(scene);
 const {body,blades,pivot,material}=useMemo(()=>{
  const source=scene.getObjectByName('rotor')!;
  scene.updateMatrixWorld(true);
  const pivot=source.getWorldPosition(new Vector3());
  const blades=baked.get('rotor')!.clone().translate(-pivot.x,-pivot.y,-pivot.z);
  return {body:baked.get('body')!,blades,pivot,material:applyOutdoorLight(new MeshStandardMaterial({vertexColors:true,roughness:1,envMapIntensity:.1}),light)};
 },[scene,baked,light]);
 useFrame(()=>{if(rotor.current)rotor.current.rotation.z=-light.time.value*.24+yaw;});
 useEffect(()=>()=>{blades.dispose();material.dispose();},[blades,material]);
 return <group name="working-windmill" position={distantPosition(position)} scale={scale} rotation={[0,yaw,0]}>
  <mesh geometry={body} material={material} raycast={()=>{}}/>
  <mesh ref={rotor} position={pivot} geometry={blades} material={material} raycast={()=>{}}/>
 </group>;
}
