"use client";
import {spreadLandscape} from './landscape-distance';
import {useEffect,useMemo} from 'react';
import {BufferGeometry,Float32BufferAttribute,MeshStandardMaterial,DoubleSide,Vector3,Color,InstancedBufferAttribute,InstancedMesh,MeshBasicMaterial,Object3D,PlaneGeometry} from 'three';
import {VISTA_STREAMS,vistaStream} from '@/lib/lobby/world-geography';
import {distantPosition} from '@/lib/lobby/world-distance';
import {applyOutdoorLight,useOutdoorLight} from './outdoor-lighting';

/** Flow coordinates are metres along each expanded channel, never screen space. */
export function VistaStreams({floorY}:{floorY:number}){
 const light=useOutdoorLight();
 const {geometry,material}=useMemo(()=>{
  const positions:number[]=[],uv:number[]=[],indices:number[]=[],flow:number[]=[],progress:number[]=[];
  for(let stream=0;stream<VISTA_STREAMS.length;stream++){
   const steps=240,across=12,offset=positions.length/3;
   let distance=0,previous=new Vector3(...distantPosition([vistaStream(stream,0).x,vistaStream(stream,0).y,vistaStream(stream,0).z]));
   for(let j=0;j<=steps;j++){
    const t=j/steps,sample=vistaStream(stream,t),before=vistaStream(stream,Math.max(0,t-.002)),after=vistaStream(stream,Math.min(1,t+.002));
    const current=new Vector3(...distantPosition([sample.x,sample.y,sample.z]));distance+=current.distanceTo(previous);previous=current;
    const a=new Vector3(...distantPosition([before.x,before.y,before.z])),b=new Vector3(...distantPosition([after.x,after.y,after.z]));
    const steep=Math.abs(b.y-a.y)/Math.max(.01,Math.hypot(b.x-a.x,b.z-a.z));
    for(let i=0;i<=across;i++){
     // Above the maximum river displacement (.053), so the confluence cannot flicker.
     positions.push(sample.x,floorY+sample.y+.18,sample.z+(i/across-.5)*sample.width);
     uv.push(i/across,distance);flow.push(steep);progress.push(t);
     if(j<steps&&i<across){const a=offset+j*(across+1)+i;indices.push(a,a+1,a+across+1,a+1,a+across+2,a+across+1);}
    }
   }
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));geometry.setAttribute('cascade',new Float32BufferAttribute(flow,1));geometry.setAttribute('progress',new Float32BufferAttribute(progress,1));geometry.setIndex(indices);spreadLandscape(geometry);
  const material=new MeshStandardMaterial({color:'#76c5c9',roughness:.32,metalness:0,envMapIntensity:.6,side:DoubleSide,alphaTest:.015,alphaToCoverage:true});
  material.onBeforeCompile=shader=>{
   shader.uniforms.cascadeTime=light.time;
   shader.vertexShader='attribute float cascade;attribute float progress;varying float vCascade;varying float vProgress;varying vec2 vCascadeUv;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vCascade=cascade;vProgress=progress;vCascadeUv=uv;');
   shader.fragmentShader=`uniform float cascadeTime;varying float vCascade;varying float vProgress;varying vec2 vCascadeUv;
    float flowHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float flowNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(flowHash(i),flowHash(i+vec2(1,0)),f.x),mix(flowHash(i+vec2(0,1)),flowHash(i+vec2(1)),f.x),f.y);}
   `+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec2 q=vec2(vCascadeUv.x*18.0,vCascadeUv.y*.22-cascadeTime*1.6);
    float broad=flowNoise(q),fine=flowNoise(q*vec2(2.2,3.1)+broad);
    float falling=smoothstep(.08,.48,vCascade);
    float impact=exp(-pow((vProgress-.355)/.025,2.0))+exp(-pow((vProgress-.79)/.03,2.0));
    float foam=clamp(falling*(.3+.48*broad)+impact*(.38+.52*fine),0.0,.94);
    vec3 water=mix(vec3(.025,.14,.15),vec3(.11,.32,.33),broad*.42);
    diffuseColor.rgb=mix(water,vec3(.77,.89,.87),foam);
    float bank=smoothstep(0.0,.065+fine*.025,vCascadeUv.x)*smoothstep(0.0,.065+broad*.025,1.0-vCascadeUv.x);
    diffuseColor.a*=bank*smoothstep(0.0,.025,vProgress)*(1.0-smoothstep(.92,1.0,vProgress));
   `);
  };
  material.customProgramCacheKey=()=> 'terraced-tributaries-v2';applyOutdoorLight(material,light);
  return {geometry,material};
 },[floorY,light]);
 useEffect(()=>()=>{geometry.dispose();material.dispose();},[geometry,material]);
 return <group><mesh name="stepped-valley-waterfalls" geometry={geometry} material={material} raycast={()=>{}}/><CascadeMist floorY={floorY}/></group>;
}


function CascadeMist({floorY}:{floorY:number}){
 const light=useOutdoorLight();
 const resource=useMemo(()=>{
  const geometry=new PlaneGeometry(1,1),material=new MeshBasicMaterial({color:'#c7dbd5',transparent:true,depthWrite:false,opacity:.28});
  material.userData.worldBaseColor=new Color('#c7dbd5');
  material.onBeforeCompile=shader=>{
   shader.uniforms.mistTime=light.time;
   shader.vertexShader='uniform float mistTime;attribute float mistPhase;varying vec2 mistUv;varying float mistLife;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    mistUv=uv;mistLife=fract(mistTime*.16+mistPhase);
    transformed*=.65+mistLife*.8;transformed.y+=mistLife*.7;transformed.x+=sin(mistPhase*21.0)*mistLife*.4;
   `);
   shader.fragmentShader='varying vec2 mistUv;varying float mistLife;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec2 q=mistUv*2.0-1.0;float r=dot(q,q);
    diffuseColor.a*=exp(-r*3.0)*(1.0-smoothstep(.4,1.0,r))*sin(mistLife*3.14159265);
   `);
  };
  material.customProgramCacheKey=()=> 'cascade-spray-v1';
  const mesh=new InstancedMesh(geometry,material,48),transform=new Object3D(),phases=new Float32Array(48);
  let index=0;
  for(let stream=0;stream<2;stream++)for(const t of [.355,.79])for(let i=0;i<12;i++){
   const sample=vistaStream(stream,t),z=sample.z+(i/11-.5)*sample.width*.78,world=distantPosition([sample.x,floorY+sample.y+.5,z]);
   transform.position.set(...world);transform.rotation.y=Math.atan2(-world[0],-world[2]);transform.scale.set(3.2+i%3*.6,2.6+i%4*.4,1);transform.updateMatrix();mesh.setMatrixAt(index,transform.matrix);phases[index]=(i*.618+stream*.17+t)%1;index++;
  }
  geometry.setAttribute('mistPhase',new InstancedBufferAttribute(phases,1));mesh.computeBoundingSphere();mesh.raycast=()=>{};mesh.name='waterfall-impact-spray';
  return {mesh,dispose:()=>{mesh.dispose();geometry.dispose();material.dispose();}};
 },[floorY,light]);
 useEffect(()=>()=>resource.dispose(),[resource]);return <primitive object={resource.mesh} dispose={null}/>;
}
