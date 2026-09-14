"use client";
import {useEffect,useMemo} from 'react';
import {useGLTF,useTexture} from '@react-three/drei';
import {BufferGeometry,Color,Float32BufferAttribute,Mesh,MeshStandardMaterial,DoubleSide} from 'three';
import {InstanceBatch,useBakedGeometry} from './art-directed-terrace';
import {applyOutdoorLight,useOutdoorLight} from './outdoor-lighting';

/** A continuous eroded shell with an uneven crown and undercut shoulders. */
function islandGeometry(){
 const positions:number[]=[],colors:number[]=[],uv:number[]=[],indices:number[]=[];
 const segments=128,rings=38;
 const rock=new Color('#a0a59b'),deep=new Color('#455460'),grass=new Color('#7b9450');
 for(let j=0;j<=rings;j++){
  const t=j/rings;
  // Eroded ledges taper at different depths around the crown. Angular
  // buttresses and an off-centre root avoid a rotationally symmetric cone.
  const v=Math.max(0,(t-.25)/.75);
  const radius=t<.25?t/.25*9:9*Math.pow(1-v,.9);
  for(let i=0;i<=segments;i++){
   const a=i/segments*Math.PI*2;
   const edge=1+.20*Math.sin(a*3+.7)+.13*Math.cos(a*5-.3)+.065*Math.sin(a*11);
   const fracture=Math.abs(Math.sin(a*6.5+.4))*1.3+Math.abs(Math.sin(a*11.5))* .35;
   const ledge=1+.12*Math.sin(v*26+a*.0)+.12*Math.sin(v*14+a*3);
   const r=radius*edge*ledge-fracture*Math.sin(Math.PI*v);
   const depth=15.0*(1+.16*Math.sin(a*3+.8)+.10*Math.cos(a*5));
   const y=t<.25?.18+Math.sin(a*4)*.22*(radius/9):.18-depth*v;
   positions.push(Math.sin(a)*r*1.2+v*v*4,y+Math.sin(a*7)*.4*(radius/9),Math.cos(a)*r*.88-v*v*2);
   uv.push(i/segments,t);
   const tint=t<.25?grass.clone().multiplyScalar(.83+.15*Math.sin(a*3+radius*.6)):rock.clone().lerp(deep,Math.pow(v,.7));
   tint.multiplyScalar(.93+.07*Math.sin(y*2.0+a*2));colors.push(tint.r,tint.g,tint.b);
   if(j<rings&&i<segments){const n=j*(segments+1)+i;indices.push(n,n+segments+1,n+1,n+1,n+segments+1,n+segments+2);}
  }
 }
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('color',new Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
export function SkyIsland(){
 const texture=useTexture('/lobby/world/rock-face-color.webp'),light=useOutdoorLight();
 const {geometry,material}=useMemo(()=>{
  const geometry=islandGeometry(),material=new MeshStandardMaterial({map:texture,vertexColors:true,roughness:1,envMapIntensity:.12,side:DoubleSide});
  material.onBeforeCompile=shader=>{
   shader.vertexShader='varying vec3 vIslandPoint;varying vec3 vIslandNormal;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vIslandPoint=position;vIslandNormal=normal;');
   shader.fragmentShader='varying vec3 vIslandPoint;varying vec3 vIslandNormal;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
    vec3 weights=pow(abs(normalize(vIslandNormal)),vec3(4.0));weights/=dot(weights,vec3(1.0));
    vec3 stone=texture2D(map,fract(vIslandPoint.yz*.14)).rgb*weights.x+texture2D(map,fract(vIslandPoint.xz*.14)).rgb*weights.y+texture2D(map,fract(vIslandPoint.xy*.14)).rgb*weights.z;
    float detail=dot(stone,vec3(.2126,.7152,.0722));
    diffuseColor.rgb*=.66+smoothstep(.01,.5,detail)*.55;
   `);
  };
  material.customProgramCacheKey=()=> 'eroded-sky-island-v2';applyOutdoorLight(material,light);return {geometry,material};
 },[texture,light]);
 useEffect(()=>()=>{geometry.dispose();material.dispose();},[geometry,material]);
 return <mesh name="continuous-sky-island" geometry={geometry} material={material} raycast={()=>{}}/>;
}
export function SkyGarden({terraces=false}:{terraces?:boolean}){
 const {scene}=useGLTF('/lobby/world/natural-vegetation.glb'),geometries=useBakedGeometry(scene),light=useOutdoorLight();
 const materials=useMemo(()=>{
  const map=new Map<MeshStandardMaterial,MeshStandardMaterial>();scene.traverse(o=>{
   if(!(o instanceof Mesh)||map.has(o.material as MeshStandardMaterial))return;
   const source=o.material as MeshStandardMaterial,m=source.clone();m.roughness=1;m.envMapIntensity=.1;
   if(/Leaves/.test(m.name)){m.side=DoubleSide;m.alphaTest=.2;m.transparent=false;m.alphaToCoverage=true;m.color.set('#afca85');}
   applyOutdoorLight(m,light);map.set(source,m);
  });return map;
 },[scene,light]);
 const placements=useMemo(()=>{
  const result:Record<string,{position:[number,number,number];scale:number;yaw:number}[]>={};
  const rings=terraces?[[12.1,4.85,18],[9.95,8.85,16],[7.95,12.45,12]]:[[6.6,.15,12]];
  for(const [r,y,count]of rings)for(let i=0;i<count;i++){
   const a=i/count*Math.PI*2+.3,kind=i%3?'bush':'tree-d';
   (result[kind]??=[]).push({position:[Math.sin(a)*r,y,Math.cos(a)*r],scale:terraces?(kind==='bush'?.4:.16):(kind==='bush'?1.3:.62),yaw:a});
  }
  return result;
 },[terraces]);
 useEffect(()=>()=>materials.forEach(m=>m.dispose()),[materials]);
 return <group name="sky-terrace-gardens">{Object.entries(placements).flatMap(([kind,plants])=>{
  const meshes:Mesh[]=[];scene.getObjectByName(kind)?.traverse(o=>{if(o instanceof Mesh)meshes.push(o)});
  return meshes.map(mesh=><InstanceBatch key={mesh.name} geometry={geometries.get(mesh.name)!} material={materials.get(mesh.material as MeshStandardMaterial)!} placements={plants}/>);
 })}</group>;
}
