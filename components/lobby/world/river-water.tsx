"use client";
import {spreadLandscape} from "./landscape-distance";
import { applyOutdoorLight, useOutdoorLight } from "./outdoor-lighting";
import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {BufferGeometry,Float32BufferAttribute,MeshPhysicalMaterial} from 'three';
import {riverLevel,riverCenter,riverWidth,worldHeight} from '@/lib/lobby/world-geography';

export function RiverWater({active}:{active:boolean}){
  const light=useOutdoorLight();
  const elapsed=useRef(0);
  const {geometry,material,advance}=useMemo(()=>{
    const positions:number[]=[],uv:number[]=[],depth:number[]=[],indices:number[]=[];
    const across=20,along=540;
    for(let j=0;j<=along;j++){
      const z=-496+j*1.84,center=riverCenter(z),width=riverWidth(z);
      for(let i=0;i<=across;i++){
        const x=center+(i/across*2-1)*width;
        positions.push(x,riverLevel(z),z);uv.push(i/across,j/along);
        depth.push(Math.max(0,riverLevel(z)-worldHeight(x,z)));
        if(i<across&&j<along){const a=j*(across+1)+i;indices.push(a,a+across+1,a+1,a+1,a+across+1,a+across+2);}
      }
    }
    const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
    geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));geometry.setAttribute('riverDepth',new Float32BufferAttribute(depth,1));
    geometry.setIndex(indices);spreadLandscape(geometry);
    const time={value:0};
    const material=new MeshPhysicalMaterial({color:'#287e7d',roughness:.26,metalness:0,ior:1.333,clearcoat:0,envMapIntensity:1.1});
    material.onBeforeCompile=shader=>{
      shader.uniforms.riverTime=time;
      shader.vertexShader=`uniform float riverTime;attribute float riverDepth;varying float vDepth;varying vec3 vWaterWorld;\n`+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`
        #include <begin_vertex>
        vDepth=riverDepth;vWaterWorld=(modelMatrix*vec4(position,1.0)).xyz;
        transformed.y+=sin(position.x*.6+position.z*.24-riverTime*.8)*.035+sin(position.z*1.2+riverTime*1.4)*.018;
      `);
      shader.fragmentShader=`uniform float riverTime;varying float vDepth;varying vec3 vWaterWorld;
        float waterHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        // Value and analytic derivatives: irregular advected ripples without a grid
        // of sine-wave highlights or three extra finite-difference noise evaluations.
        vec3 waterNoise(vec2 p){
          vec2 cell=floor(p),f=fract(p),u=f*f*(3.0-2.0*f),du=6.0*f*(1.0-f);
          float a=waterHash(cell),b=waterHash(cell+vec2(1,0));
          float c=waterHash(cell+vec2(0,1)),d=waterHash(cell+vec2(1,1));
          float k=a-b-c+d;
          return vec3(a+(b-a)*u.x+(c-a)*u.y+k*u.x*u.y,
            du*vec2(b-a+k*u.y,c-a+k*u.x));
        }
      `+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`
        #include <color_fragment>
        float deep=smoothstep(.0,2.2,vDepth);
        vec3 shallow=vec3(.09,.23,.16),channel=vec3(.012,.083,.086);
        diffuseColor.rgb=mix(shallow,channel,deep);
        float current=waterNoise(vWaterWorld.xz*vec2(1.8,.22)+vec2(0,riverTime*.12)).x;
        float shore=1.0-smoothstep(.06,.6,vDepth);
        float foam=shore*smoothstep(.52,.78,current)*.48;
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.55,.72,.63),foam);
      `);
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`
        #include <normal_fragment_maps>
        vec2 flow=vWaterWorld.xz;
        vec3 broad=waterNoise(flow*vec2(.44,.23)+vec2(riverTime*.024,riverTime*.085));
        vec3 ripple=waterNoise(flow*vec2(1.35,.73)+vec2(-riverTime*.075,riverTime*.15)+broad.x*.6);
        vec3 fine=waterNoise(flow*vec2(4.1,2.3)+vec2(riverTime*.06,riverTime*.28));
        float distanceToWater=length(vViewPosition);
        float fineFade=1.0-smoothstep(35.0,150.0,distanceToWater);
        vec2 gradient=broad.yz*.044+ripple.yz*.052+fine.yz*.024*fineFade;
        normal=normalize(mat3(viewMatrix)*normalize(vec3(-gradient.x,1.0,-gradient.y)));

      `);
    };
    material.customProgramCacheKey=()=> 'living-river-reflections-v3';
    applyOutdoorLight(material,light);
    return {geometry,material,advance:(t:number)=>{time.value=t;}};
  },[light]);
  useFrame((_,delta)=>{if(active){elapsed.current+=Math.min(delta,.1);advance(elapsed.current);}});
  useEffect(()=>()=>{geometry.dispose();material.dispose();},[geometry,material]);
  return <mesh name="reflective-river" geometry={geometry} material={material} raycast={()=>{}}/>;
}
