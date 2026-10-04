"use client";
import {useEffect,useRef} from 'react';
import {useGLTF} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {AnimationMixer,Box3,Frustum,Matrix4,Sphere,Group,Mesh,MeshStandardMaterial,SkinnedMesh,Vector3,type AnimationClip,type Camera} from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {dragonPose} from '@/lib/lobby/wildlife-habitats';
import {applyOutdoorLight,useOutdoorLight,type OutdoorLight} from './outdoor-lighting';

/** Play the baked flight over Stuck On Saturn's original Toothless skin.
 * The authored clip coordinates the full wing chains, body, limbs and tail. */
export function createValleyDragon(source:Group,clip:AnimationClip,light:OutdoorLight,wingspan:number){
 const model=clone(source),root=new Group(),normalizer=new Group();
 const materials=new Map<MeshStandardMaterial,MeshStandardMaterial>();
 const mixer=new AnimationMixer(model);mixer.clipAction(clip).play();mixer.setTime(0);model.updateMatrixWorld(true);
 // Measure the posed skin in the clip's opening, extended-wing frame so
 // shoulder pivots and the long tail stay centered during the flight path.
 const bounds=new Box3().setFromObject(model,true),size=bounds.getSize(new Vector3()),center=bounds.getCenter(new Vector3());
 const scale=wingspan/size.x;normalizer.scale.setScalar(scale);normalizer.position.copy(center).multiplyScalar(-scale);
 normalizer.add(model);root.add(normalizer);
 model.traverse(o=>{
  if(!(o instanceof Mesh))return;
  const shade=(source:MeshStandardMaterial)=>{
   if(!materials.has(source)){
    const m=source.clone();m.metalness=0;m.envMapIntensity=.3;
    // Preserve the converted skin/eye roughness and let daylight shade the
    // dark membranes; black skin must not become a flat emissive silhouette.
    m.emissiveIntensity=0;applyOutdoorLight(m,light);materials.set(source,m);
   }return materials.get(source)!;
  };
  o.material=Array.isArray(o.material)?o.material.map(shade):shade(o.material);
  o.frustumCulled=false;o.raycast=()=>{};
 });
 return {root,animate:(time:number)=>mixer.setTime(time),dispose:()=>{
  mixer.stopAllAction();mixer.uncacheRoot(model);materials.forEach(m=>m.dispose());
  const skeletons=new Set<SkinnedMesh['skeleton']>();model.traverse(o=>{if(o instanceof SkinnedMesh)skeletons.add(o.skeleton)});skeletons.forEach(s=>s.dispose());
 }};
}
export function ValleyCreatures(){
 const light=useOutdoorLight(),asset=useGLTF('/lobby/world/toothless-flight.glb');
 const container=useRef<Group>(null),life=useRef<{update:(time:number,camera?:Camera)=>void}|null>(null);
 useEffect(()=>{
  const parent=container.current;if(!parent)return;
  const clip=asset.animations.find(clip=>clip.name==='Toothless_Flight');if(!clip)throw new Error('Toothless flight animation is missing');
  const dragon=createValleyDragon(asset.scene,clip,light,25);dragon.root.name='valley-toothless';
  const frustum=new Frustum(),projection=new Matrix4(),envelope=new Sphere(new Vector3(),27);
  const update=(time:number,camera?:Camera)=>{
   const pose=dragonPose(time,0);dragon.root.position.set(...pose.position);dragon.root.rotation.set(pose.pitch,pose.yaw,pose.bank,'YXZ');
   // Individual skinned/morph bounds are unreliable between poses. Cull the
   // entire dragon with a conservative flight envelope, including its wing tips.
   if(camera){camera.updateMatrixWorld();frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));envelope.center.copy(dragon.root.position);dragon.root.visible=frustum.intersectsSphere(envelope);}
   if(dragon.root.visible)dragon.animate(time);
  };
  parent.add(dragon.root);life.current={update};update(light.time.value);
  // Setup owns the mixer as well as its cleanup: React StrictMode's replay
  // must create a fresh playing action, never reuse an uncached/stopped mixer.
  return ()=>{life.current=null;parent.remove(dragon.root);dragon.dispose();};
 },[asset,light]);
 useFrame(({camera})=>life.current?.update(light.time.value,camera));
 return <group ref={container} name="dragon-flight-container"/>;
}
