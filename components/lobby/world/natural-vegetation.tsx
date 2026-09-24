"use client";
import { applyOutdoorLight, useOutdoorLight } from "./outdoor-lighting";

import { useGLTF } from "@react-three/drei";
import { applyWorldWind, windDepth } from "./world-wind";
import { useEffect, useMemo } from "react";
import { DoubleSide, Float32BufferAttribute, Mesh, MeshStandardMaterial, type MeshDepthMaterial } from "three";
import { InstanceBatch, useBakedGeometry } from "./art-directed-terrace";
import { ORGANIC_KINDS } from "./organic-vegetation";
import { plantCommunities } from "@/lib/lobby/plant-communities";


export function NaturalVegetation({floorY}:{floorY:number}){
  const light=useOutdoorLight();
  const {scene}=useGLTF('/lobby/world/natural-vegetation.glb');
  const originals=useBakedGeometry(scene);
  const {materials,geometries,depths}=useMemo(()=>{
    const depths=new Map<MeshStandardMaterial,MeshDepthMaterial>(),materials=new Map<MeshStandardMaterial,MeshStandardMaterial>();
    const geometries=new Map<string,ReturnType<typeof originals.get>>();
    scene.traverse(o=>{
      if(!(o instanceof Mesh))return;
      const source=o.material as MeshStandardMaterial;
      const leaf=/Leaves/.test(source.name), grass=source.name==='Grass', bark=/Bark/.test(source.name);
      const g=originals.get(o.name)!.clone();
      if(leaf){
        g.computeBoundingBox();const box=g.boundingBox!,p=g.attributes.position,normals:number[]=[],colors:number[]=[];
        const cx=(box.min.x+box.max.x)*.5,cy=(box.min.y+box.max.y)*.5,cz=(box.min.z+box.max.z)*.5;
        for(let i=0;i<p.count;i++){
          const x=p.getX(i)-cx,y=(p.getY(i)-cy)*.65+1.8,z=p.getZ(i)-cz,l=Math.hypot(x,y,z);
          normals.push(x/l,y/l,z/l);
          const value=.65+.35*(p.getY(i)-box.min.y)/Math.max(.1,box.max.y-box.min.y);colors.push(value,value,value);
        }
        g.setAttribute('normal',new Float32BufferAttribute(normals,3));g.setAttribute('color',new Float32BufferAttribute(colors,3));
      }
      geometries.set(o.name,g);
      if(materials.has(source))return;
      const m=source.clone();m.metalness=0;m.roughness=1;m.envMapIntensity=.12;
      if(leaf||grass){m.side=DoubleSide;m.alphaTest=leaf?.16:0;m.transparent=false;m.depthWrite=true;m.alphaToCoverage=true;m.color.set('white');}
      if(leaf)m.vertexColors=true;
      m.onBeforeCompile=shader=>{
        if(leaf||grass){
          shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
            #ifdef USE_MAP
              vec4 texel=texture2D(map,vMapUv);
              float value=dot(texel.rgb,vec3(.2126,.7152,.0722));
              vec3 pigment=mix(vec3(.045,.105,.045),vec3(.35,.49,.16),smoothstep(.015,.6,value));
              diffuseColor*=vec4(pigment,texel.a);
            #endif
          `);
          shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\n normal *= faceDirection;');
        }
      };
      m.customProgramCacheKey=()=>`natural-community-v1-${leaf}-${grass}-${bark}`;if(leaf||grass||bark){
        const height=grass?.6:8,bend=grass?.12:.58,flutter=leaf?.055:grass?.025:0;
        applyWorldWind(m,light,height,bend,flutter);
        depths.set(source,windDepth(m,light,height,bend,flutter));
      }
      applyOutdoorLight(m,light,leaf?.24:grass?.18:0);materials.set(source,m);
    });
    return {materials,geometries,depths};
  },[scene,originals,light]);
  const placements=useMemo(()=>plantCommunities(floorY),[floorY]);
  useEffect(()=>()=>{materials.forEach(m=>m.dispose());depths.forEach(m=>m.dispose());geometries.forEach(g=>g?.dispose());},[materials,geometries,depths]);
  return <group name="natural-plant-communities">{Object.entries(placements).flatMap(([region,placements])=>{
    const [kind,shadow]=region.split(':');if(ORGANIC_KINDS.has(kind))return [];
    const root=scene.getObjectByName(kind),meshes:Mesh[]=[];
    root?.traverse(o=>{if(o instanceof Mesh)meshes.push(o)});
    return meshes.map(mesh=><InstanceBatch key={`${region}:${mesh.name}`} geometry={geometries.get(mesh.name)!} material={materials.get(mesh.material as MeshStandardMaterial)!} placements={placements} shadows={shadow==='shadow'} depthMaterial={depths.get(mesh.material as MeshStandardMaterial)}/>);
  })}</group>;
}
