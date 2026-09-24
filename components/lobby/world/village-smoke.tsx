"use client";
import {useEffect,useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import {InstancedBufferAttribute,InstancedBufferGeometry,PlaneGeometry,ShaderMaterial,UniformsLib,UniformsUtils} from 'three';
import {useOutdoorLight} from './outdoor-lighting';

/** Sparse chimney wisps, anchored to the model's highest compact masonry cap. */
export function VillageSmoke({chimneys}:{chimneys:[number,number,number][]}){
 const light=useOutdoorLight();
 const {geometry,material,setDimmer}=useMemo(()=>{
  const quad=new PlaneGeometry(1,1),geometry=new InstancedBufferGeometry();
  geometry.index=quad.index!.clone();for(const [name,attribute]of Object.entries(quad.attributes))geometry.setAttribute(name,attribute.clone());quad.dispose();
  const anchors:number[]=[],seeds:number[]=[];
  for(let i=0;i<chimneys.length;i++)for(let j=0;j<18;j++){anchors.push(...chimneys[i]);seeds.push(j/18,i*1.713+j*.37);}
  geometry.setAttribute('smokeAnchor',new InstancedBufferAttribute(new Float32Array(anchors),3));
  geometry.setAttribute('smokeSeed',new InstancedBufferAttribute(new Float32Array(seeds),2));geometry.instanceCount=seeds.length/2;
  const dimmer={value:1};
  const material=new ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,fog:true,
   uniforms:{...UniformsUtils.clone(UniformsLib.fog),smokeTime:light.time,smokeDimmer:dimmer},
   vertexShader:`uniform float smokeTime;attribute vec3 smokeAnchor;attribute vec2 smokeSeed;varying vec2 vSmokeUv;varying float vSmokeAge;
    #include <fog_pars_vertex>
    void main(){
     vSmokeUv=uv;float age=fract(smokeTime*.074+smokeSeed.x);vSmokeAge=age;
     vec3 center=smokeAnchor+vec3(age*age*3.4+sin(age*8.0+smokeSeed.y)*age*.3,age*5.5,age*1.1);
     vec4 mvPosition=viewMatrix*vec4(center,1.0);
     float size=.24+age*2.0;
     mvPosition.xy+=position.xy*size;
     gl_Position=projectionMatrix*mvPosition;
     #include <fog_vertex>
    }`,
   fragmentShader:`uniform float smokeDimmer;varying vec2 vSmokeUv;varying float vSmokeAge;
    #include <fog_pars_fragment>
    void main(){
     vec2 p=vSmokeUv*2.0-1.0;
     float shape=exp(-dot(p,p)*3.8)*(1.0-smoothstep(.55,1.0,length(p)));
     float fibre=.72+.28*sin(p.x*9.0+sin(p.y*7.0)*2.0+vSmokeAge*11.0);
     float opacity=shape*fibre*smoothstep(0.0,.12,vSmokeAge)*(1.0-smoothstep(.45,1.0,vSmokeAge))*.19*smokeDimmer;
     if(opacity<.002)discard;
     gl_FragColor=vec4(vec3(.63,.65,.65)*smokeDimmer,opacity);
     #include <fog_fragment>
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
    }`});
  material.userData.setWorldDimmer=(ratio:number)=>{dimmer.value=ratio;};
  return {geometry,material,setDimmer:(ratio:number)=>{dimmer.value=ratio;}};
 },[chimneys,light]);
 useFrame(({scene})=>setDimmer(scene.userData.worldDimmer??1));
 useEffect(()=>()=>{geometry.dispose();material.dispose();},[geometry,material]);
 return <mesh name="village-chimney-wisps" geometry={geometry} material={material} frustumCulled={false} raycast={()=>{}}/>;
}
