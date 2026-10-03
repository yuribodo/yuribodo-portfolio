"use client";

import {Suspense,useEffect,useMemo} from 'react';
import {useGLTF} from '@react-three/drei';
import {Box3,DoubleSide,Mesh,MeshStandardMaterial,Vector3,type BufferGeometry,type MeshDepthMaterial} from 'three';
import {plantCommunities} from '@/lib/lobby/plant-communities';
import {lodTier} from '@/lib/lobby/vegetation-lod';
import {InstanceBatch,bakeGeometries} from './art-directed-terrace';
import {applyWorldWind,windDepth} from './world-wind';
import {WorldBoundary} from './world-boundary';
import {applyOutdoorLight,useOutdoorLight} from './outdoor-lighting';

export const ORGANIC_KINDS=new Set(['tree-a','tree-b','tree-c','tree-d','pine-a','pine-b','bush','fern','rock-a','rock-b']);
const NO_RAYCAST=()=>{};
const LOD_SUFFIXES=['~lod1','~lod2','~lod3'];
const KITS=[
 {url:'/lobby/world/organic-tree_small_02.glb',kinds:['tree-a','tree-b','tree-c','tree-d'],height:8,tree:true},
 {url:'/lobby/world/organic-pine_tree_01.glb',kinds:['pine-a','pine-b'],height:9,tree:true},
 {url:'/lobby/world/organic-shrub_02.glb',kinds:['bush'],height:1.1,tree:false},
 {url:'/lobby/world/organic-fern_02.glb',kinds:['fern'],height:.8,tree:false},
 {url:'/lobby/world/organic-rock_moss_set_01.glb',kinds:['rock-a','rock-b'],height:1.25,tree:false},
];
function OrganicKit({kit,floorY}:{kit:typeof KITS[number];floorY:number}){
 const {scene}=useGLTF(kit.url),light=useOutdoorLight();
 const resources=useMemo(()=>{
  // Kept out of hook state: the loader copy stays cached, and the baked buffers
  // below become the placed geometry itself instead of a second retained copy.
  const baked=bakeGeometries(scene),uses=new Map<string,number>();
  scene.traverse(o=>{if(o instanceof Mesh&&!o.name.includes('~lod'))for(const name of [o.name,...LOD_SUFFIXES.map(s=>o.name+s)])uses.set(name,(uses.get(name)??0)+1)});
  const materials=new Map<MeshStandardMaterial,MeshStandardMaterial>(),depths=new Map<MeshStandardMaterial,MeshDepthMaterial>();
  const variants:{far:boolean;meshes:{lods:BufferGeometry[];material:MeshStandardMaterial;depth?:MeshDepthMaterial}[]}[]=[];
  // Poly Haven packs include several separately placed specimens. Centre each
  // specimen on its own roots before installing the landscape instances.
  for(const root of scene.children){
   if(root.name.includes('~lod'))continue;
   const meshes:Mesh[]=[];root.traverse(o=>{if(o instanceof Mesh&&!o.name.includes('~lod'))meshes.push(o)});
   if(!meshes.length)continue;
   scene.updateMatrixWorld(true);
   const bounds=new Box3().setFromObject(root),size=bounds.getSize(new Vector3());
   const center=bounds.getCenter(new Vector3()),scale=kit.height/Math.max(.01,size.y);
   variants.push({far:root.name==='canopy-far',meshes:meshes.map(mesh=>{
    const source=mesh.material as MeshStandardMaterial;
    if(!materials.has(source)){
     const m=source.clone(),foliage=/leaves|twig|fern|shrub/i.test(source.name),rock=kit.kinds[0].startsWith('rock');
     m.metalness=0;m.envMapIntensity=.25;
     if(foliage){m.side=DoubleSide;m.alphaToCoverage=true;m.transparent=false;m.depthWrite=true;}
     if(!rock){
      applyWorldWind(m,light,kit.height,kit.tree?.2:.09,foliage?.018:0);
      depths.set(source,windDepth(m,light,kit.height,kit.tree?.2:.09,foliage?.018:0));
     }
     applyOutdoorLight(m,light,foliage?.18:0);materials.set(source,m);
    }
    const place=(name:string)=>{
     const source=baked.get(name),left=(uses.get(name)??1)-1;uses.set(name,left);
     return (left?source?.clone():source)?.translate(-center.x,-bounds.min.y,-center.z).scale(scale,scale,scale);
    };
    const lods=[place(mesh.name)!];
    for(const suffix of LOD_SUFFIXES)lods.push(place(mesh.name+suffix)??lods[lods.length-1]);
    return {lods,material:materials.get(source)!,depth:depths.get(source)};
   })});
  }
  return {variants,dispose:()=>{variants.forEach(v=>v.meshes.forEach(m=>new Set(m.lods).forEach(g=>g.dispose())));materials.forEach(m=>m.dispose());depths.forEach(m=>m.dispose());}};
 },[scene,kit,light]);
 const groups=useMemo(()=>{
  const groups:Record<string,ReturnType<typeof plantCommunities>[string]>={};
  const near=resources.variants.map((v,i)=>!v.far?i:-1).filter(i=>i>=0),far=resources.variants.findIndex(v=>v.far);
  for(const [region,placements]of Object.entries(plantCommunities(floorY))){
   const [kind,shadow]=region.split(':');if(!kit.kinds.includes(kind))continue;
   placements.forEach((p,i)=>{
    if(kit.tree&&Math.hypot(p.position[0],p.position[2])>32)return;
    const variant=kit.tree&&Math.hypot(p.position[0],p.position[2])>95&&far>=0?far:near[i%near.length];
    // Plain batches cull per instance, so grid cells only multiply draw calls.
    // Shadow casters cull as a whole mesh and keep their cells.
    const tier=lodTier(p,kit.height);
    const key=shadow==='shadow'?`${variant}:${tier}:${shadow}:${region}`:`${variant}:${tier}:${shadow}`;(groups[key]??=[]).push(p);
   });
  }
  return groups;
 },[floorY,kit,resources]);
 useEffect(()=>()=>resources.dispose(),[resources]);
 return <group name={`organic-${kit.kinds[0]}`} raycast={NO_RAYCAST}>{Object.entries(groups).flatMap(([key,placements])=>{
  const [variant,tier,shadow]=key.split(':');
  return resources.variants[Number(variant)].meshes.map((m,i)=><InstanceBatch key={`${key}:${i}`} geometry={m.lods[Number(tier)]} material={m.material} placements={placements} shadows={shadow==='shadow'} depthMaterial={m.depth}/>);
 })}</group>;
}
export function OrganicVegetation({floorY}:{floorY:number}){
 const kits=useMemo(()=>{
  const regions=Object.entries(plantCommunities(floorY));
  return KITS.filter(kit=>!kit.tree||regions.some(([key,plants])=>kit.kinds.includes(key.split(':')[0])&&plants.some(p=>Math.hypot(p.position[0],p.position[2])<=32)));
 },[floorY]);
 return <>{kits.map(kit=><WorldBoundary key={kit.url}><Suspense fallback={null}><OrganicKit kit={kit} floorY={floorY}/></Suspense></WorldBoundary>)}</>;
}
