import React,{StrictMode,Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import {Canvas,useFrame} from '@react-three/fiber';
import {useGLTF} from '@react-three/drei';
import {Bone,Mesh} from 'three';
import {ValleyCreatures} from '@/components/lobby/world/valley-creatures';
import {OutdoorLighting,useOutdoorLight} from '@/components/lobby/world/outdoor-lighting';

declare global {interface Window {flightProbe:{time:number;visible:boolean;values:number[]}[]}}
useGLTF.setDecoderPath('/__three/examples/jsm/libs/draco/');
const records:Window['flightProbe']=[];let last=-1;
function Probe(){
 const light=useOutdoorLight();
 useFrame(({scene})=>{
  const root=scene.getObjectByName('valley-toothless');
  if(!root||light.time.value-last<.3)return;
  last=light.time.value;const values:number[]=[];
  root.traverse(o=>{if(o instanceof Bone)values.push(...o.quaternion.toArray());if(o instanceof Mesh&&o.morphTargetInfluences)values.push(...o.morphTargetInfluences);});
  records.push({time:last,visible:root.visible,values});window.flightProbe=records;
 });
 return null;
}
createRoot(document.getElementById('root')!).render(
 <Canvas onCreated={({camera})=>camera.lookAt(0,30,-280)} camera={{position:[0,30,0],fov:60,far:2000}}>
  <color attach="background" args={['#bfd8de']}/><ambientLight intensity={1.6}/><directionalLight position={[20,60,20]} intensity={3}/>
  <StrictMode><OutdoorLighting active><Suspense fallback={null}><ValleyCreatures/><Probe/></Suspense></OutdoorLighting></StrictMode>
 </Canvas>,
);
