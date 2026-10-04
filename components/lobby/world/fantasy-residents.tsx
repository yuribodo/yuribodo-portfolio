"use client";
import {useEffect,useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import {BufferGeometry,CapsuleGeometry,CatmullRomCurve3,Group,InstancedMesh,LatheGeometry,MeshPhysicalMaterial,MeshStandardMaterial,Object3D,SphereGeometry,TubeGeometry,Vector2,Vector3} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {FANTASY_RESIDENTS,residentPose} from '@/lib/lobby/wildlife-habitats';
import {applyOutdoorLight,useOutdoorLight} from './outdoor-lighting';

function merge(parts:BufferGeometry[]){const result=mergeGeometries(parts)!;parts.forEach(p=>p.dispose());return result;}
function oval(x:number,y:number,z:number,sx:number,sy:number,sz:number){return new SphereGeometry(1,20,14).scale(sx,sy,sz).translate(x,y,z);}
function arc(points:number[][],radius:number){return new TubeGeometry(new CatmullRomCurve3(points.map(p=>new Vector3(...p))),20,radius,6,false);}
/** Authored slime and leaf-spirit silhouettes, with shared instanced facial geometry. */
export function FantasyResidents({floorY}:{floorY:number}){
 const light=useOutdoorLight();
 const life=useMemo(()=>{
  const group=new Group();group.name='slime-colonies-and-leaf-spirits';
  const gel=applyOutdoorLight(new MeshPhysicalMaterial({color:'#73d9f3',roughness:.19,metalness:0,clearcoat:1,clearcoatRoughness:.12,envMapIntensity:.8}),light);
  gel.onBeforeCompile=((previous)=>((shader,renderer)=>{
   previous.call(gel,shader,renderer);
   shader.vertexShader='varying float gelHeight;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n gelHeight=position.y;');
   shader.fragmentShader='varying float gelHeight;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.rgb*=mix(vec3(.28,.66,.86),vec3(.87,1.0,1.0),smoothstep(0.0,1.05,gelHeight));');
  }))(gel.onBeforeCompile);
  gel.customProgramCacheKey=()=> 'fantasy-jelly-v1';
  const porcelain=applyOutdoorLight(new MeshStandardMaterial({color:'#d5e6c0',roughness:.45,envMapIntensity:.45}),light);
  const ink=applyOutdoorLight(new MeshStandardMaterial({color:'#163b50',roughness:.48}),light);
  const leaf=applyOutdoorLight(new MeshStandardMaterial({color:'#73b686',roughness:.58}),light,.16);
  const jelly=new LatheGeometry([[0,0],[.42,.008],[.76,.065],[.94,.20],[1,.38],[.97,.53],[.88,.70],[.71,.88],[.46,1.01],[.19,1.065],[0,1.075]].map(p=>new Vector2(...p)),64);
  // Preserve the lathe's analytic meridian normals, including its seamless wrap.
  const eyes=merge([-1,1].map(s=>arc([[s*.42,.48,.885],[s*.3,.43,.94],[s*.17,.46,.964]],.018)));
  const spirit=merge([oval(0,.61,0,.28,.38,.22),oval(0,1.01,.02,.43,.36,.32),oval(-.21,.12,.015,.12,.18,.13),oval(.21,.12,.015,.12,.18,.13),new CapsuleGeometry(.085,.3,4,10).rotateZ(-.45).translate(-.33,.6,0),new CapsuleGeometry(.085,.3,4,10).rotateZ(.45).translate(.33,.6,0)]);
  const spiritFace=merge([oval(-.16,1.02,.316,.075,.1,.018),oval(.16,1.02,.316,.075,.1,.018),oval(0,.87,.323,.035,.025,.016)]);
  const ears=merge([oval(0,0,0,.095,.28,.032).rotateZ(.55).translate(-.16,1.43,0),oval(0,0,0,.1,.25,.035).rotateZ(-.6).translate(.16,1.44,0)]);
  const collections=[{kind:'slime',parts:[[jelly,gel],[eyes,ink]]},{kind:'spirit',parts:[[spirit,porcelain],[spiritFace,ink],[ears,leaf]]}] as const;
  const batches=collections.map(({kind,parts})=>{
   const residents=FANTASY_RESIDENTS.filter(r=>r.kind===kind);
   const meshes=parts.map(([geometry,material],i)=>{const m=new InstancedMesh(geometry,material,residents.length);m.name=`${kind}-${i}`;m.frustumCulled=false;m.raycast=()=>{};m.castShadow=i===0;group.add(m);return m;});
   return {residents,meshes};
  });
  const transform=new Object3D();
  const update=(time:number)=>batches.forEach(({residents,meshes})=>{
   residents.forEach((resident,i)=>{const pose=residentPose(resident,time,floorY),scale=resident.height/(resident.kind==='slime'?1.075:1.68);transform.position.set(...pose.position);transform.rotation.set(0,pose.yaw,pose.tilt,'YXZ');transform.scale.set(scale/Math.sqrt(pose.stretch),scale*pose.stretch,scale/Math.sqrt(pose.stretch));transform.updateMatrix();meshes.forEach(m=>m.setMatrixAt(i,transform.matrix));});
   meshes.forEach(m=>{m.instanceMatrix.needsUpdate=true;});
  });
  update(light.time.value);
  return {group,update,dispose:()=>{batches.forEach(b=>b.meshes.forEach(m=>{m.dispose();m.geometry.dispose();}));[gel,porcelain,ink,leaf].forEach(m=>m.dispose());}};
 },[floorY,light]);
 useFrame(()=>life.update(light.time.value));useEffect(()=>()=>life.dispose(),[life]);
 return <primitive object={life.group} dispose={null}/>;
}
