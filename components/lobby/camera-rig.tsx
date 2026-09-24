"use client";
import {PerspectiveCamera} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {forwardRef,useEffect,useImperativeHandle,useRef} from 'react';
import {Vector3,type PerspectiveCamera as Camera} from 'three';
import {useReducedMotion} from '@/hooks/use-reduced-motion';
import {DESK_CAMERA,DESK_TARGET} from '@/lib/lobby/world-view';
import type {LobbyState} from './use-lobby-state';

export interface CameraRigHandle {getCamera:()=>Camera|null}
interface CameraRigProps {state:LobbyState;fov?:number}
const base=new Vector3(DESK_CAMERA.x,DESK_CAMERA.y,DESK_CAMERA.z);
const target=new Vector3(DESK_TARGET.x,DESK_TARGET.y,DESK_TARGET.z);
/** The first release stays seated and forward-facing. The existing subtle
 * pointer parallax remains; the monitor transition owns the camera on entry. */
const CameraRig=forwardRef<CameraRigHandle,CameraRigProps>(function CameraRig({state,fov=50},ref){
 const cameraRef=useRef<Camera>(null),drift=useRef({x:0,y:0}),reducedMotion=useReducedMotion();
 useImperativeHandle(ref,()=>({getCamera:()=>cameraRef.current}),[]);
 useEffect(()=>{cameraRef.current?.lookAt(target);},[]);
 useEffect(()=>{
  if(state==='booting'||state==='loading'||reducedMotion)return;
  const move=(event:MouseEvent)=>{drift.current={x:event.clientX/window.innerWidth*2-1,y:1-event.clientY/window.innerHeight*2};};
  const reset=()=>{drift.current={x:0,y:0};};
  window.addEventListener('mousemove',move);window.addEventListener('blur',reset);document.addEventListener('mouseleave',reset);
  return ()=>{window.removeEventListener('mousemove',move);window.removeEventListener('blur',reset);document.removeEventListener('mouseleave',reset);};
 },[state,reducedMotion]);
 useFrame((_,delta)=>{
  const camera=cameraRef.current;if(!camera||state==='booting')return;
  const t=1-Math.exp(-6.3*Math.min(delta,.1));
  camera.position.x+=(base.x+drift.current.x*.06-camera.position.x)*t;
  camera.position.y+=(base.y+drift.current.y*.06-camera.position.y)*t;
  camera.lookAt(target);
 });
 return <PerspectiveCamera ref={cameraRef} makeDefault position={base} fov={fov} near={.05} far={3200}/>;
});
export default CameraRig;
