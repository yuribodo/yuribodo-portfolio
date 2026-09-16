"use client";

import {useEffect,useMemo} from 'react';
import {useTexture} from '@react-three/drei';
import {Color,InstancedBufferAttribute,InstancedMesh,MeshBasicMaterial,Object3D,PlaneGeometry,ShaderChunk,SRGBColorSpace} from 'three';
import {plantCommunities} from '@/lib/lobby/plant-communities';
import {distantPosition} from '@/lib/lobby/world-distance';
import {cloudShader,useOutdoorLight} from './outdoor-lighting';
import {applyWorldWind} from './world-wind';

/** Individually rooted far-tree LODs, rendered from eight authored Blender views.
 * The camera turns from a fixed desk; tree origins preserve valley parallax and
 * depth occlusion. Nearby specimens retain their complete 3D canopy geometry.
 */
function CanopySpecies({floorY,pine}:{floorY:number;pine:boolean}){
 const source=useTexture(`/lobby/world/canopy-${pine?'pine_tree_01':'tree_small_02'}.webp`),light=useOutdoorLight();
 const resource=useMemo(()=>{
  const texture=source.clone();texture.colorSpace=SRGBColorSpace;texture.anisotropy=4;
  const placements=Object.entries(plantCommunities(floorY)).filter(([key])=>key.startsWith(pine?'pine-':'tree-')).flatMap(([,p])=>p).filter(p=>Math.hypot(p.position[0],p.position[2])>32);
  const height=pine?9:8,geometry=new PlaneGeometry(height*1.1,height*1.1,2,3);geometry.translate(0,height*.5,0);
  const frames=new Float32Array(placements.length),material=new MeshBasicMaterial({map:texture,alphaTest:.22,alphaToCoverage:true,toneMapped:false});
  material.userData.worldBaseColor=new Color('white');
  material.onBeforeCompile=shader=>{
   shader.uniforms.outdoorTime=light.time;
   shader.vertexShader='attribute float canopyFrame; varying vec3 canopyWorld;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n vMapUv.x=(vMapUv.x+canopyFrame)/8.0;');
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n canopyWorld=(modelMatrix*instanceMatrix*vec4(transformed,1.0)).xyz;');
   shader.fragmentShader='varying vec3 canopyWorld;\n'+cloudShader+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.rgb*=mix(.80,1.12,cloudVisibility(canopyWorld));');
   shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',ShaderChunk.fog_fragment.replaceAll('vFogDepth','(vFogDepth*mix(1.0,3.15,smoothstep(0.0,60.0,canopyWorld.z)))'));
  };
  material.customProgramCacheKey=()=> 'authored-canopy-atlas-v1';applyWorldWind(material,light,height,.18);
  const mesh=new InstancedMesh(geometry,material,placements.length),transform=new Object3D();
  placements.forEach((p,i)=>{
   const world=distantPosition(p.position),facing=Math.atan2(-world[0],-world[2]);
   const relative=((facing-p.yaw)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
   frames[i]=Math.round(relative/(Math.PI/4))%8;
   transform.position.set(...world);transform.rotation.y=facing;transform.scale.setScalar(p.scale);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);
  });
  geometry.setAttribute('canopyFrame',new InstancedBufferAttribute(frames,1));
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.name=pine?'distant-pine-canopies':'distant-broadleaf-canopies';mesh.raycast=()=>{};
  return {mesh,dispose:()=>{mesh.dispose();geometry.dispose();material.dispose();texture.dispose();}};
 },[source,light,floorY,pine]);
 useEffect(()=>()=>resource.dispose(),[resource]);
 return <primitive object={resource.mesh} dispose={null}/>;
}
export function DistantCanopies({floorY}:{floorY:number}){
 return <><CanopySpecies floorY={floorY} pine={false}/><CanopySpecies floorY={floorY} pine/></>;
}
