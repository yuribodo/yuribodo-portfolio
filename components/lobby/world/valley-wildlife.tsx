"use client";
import {distantPosition} from "@/lib/lobby/world-distance";
import {useEffect,useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import {BufferGeometry,Color,DoubleSide,Float32BufferAttribute,Group,InstancedBufferAttribute,InstancedMesh,MeshStandardMaterial,Object3D,Shape,ShapeGeometry,SphereGeometry} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {worldHeight} from '@/lib/lobby/world-geography';
import {applyOutdoorLight,useOutdoorLight,type OutdoorLight} from './outdoor-lighting';

function animalGeometry(butterfly:boolean){
 const parts:BufferGeometry[]=[];
 const append=(geometry:BufferGeometry,hinge:number)=>{
  const count=geometry.attributes.position.count;
  geometry.setAttribute('wingSide',new Float32BufferAttribute(new Float32Array(count).fill(hinge),1));parts.push(geometry);
 };
 for(const side of [-1,1]){
  const shape=new Shape();
  if(butterfly){
   shape.moveTo(.005,-.025);shape.bezierCurveTo(.025,-.11,.125,-.14,.115,-.07);
   shape.bezierCurveTo(.12,-.025,.085,.008,.05,.012);
   shape.bezierCurveTo(.115,.032,.084,.1,.045,.065);shape.quadraticCurveTo(.015,.055,.005,.015);
  }else{
   shape.moveTo(.035,-.13);shape.quadraticCurveTo(.23,-.13,.38,-.04);
   shape.bezierCurveTo(.46,.02,.6,.18,.68,.27);shape.quadraticCurveTo(.46,.19,.35,.17);
   // A swept outer wing with separated feather tips, not a triangular chevron.
   for(let i=0;i<5;i++){const x=.35-i*.055;shape.lineTo(x,.20-i*.018);shape.lineTo(x-.025,.15-i*.016);}
   shape.quadraticCurveTo(.12,.10,.035,.11);
  }
  shape.closePath();const g=new ShapeGeometry(shape,9);g.rotateX(Math.PI/2);g.scale(side,1,1);append(g,side);
 }
 const body=new SphereGeometry(1,10,8);body.scale(butterfly?.008:.045,butterfly?.008:.05,butterfly?.065:.22);append(body,0);
 if(!butterfly){const head=new SphereGeometry(.052,10,8);head.translate(0,.02,-.23);append(head,0);}
 const geometry=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());return geometry;
}

function createWildlife(floorY:number,light:OutdoorLight){
 const group=new Group(),transform=new Object3D(),owned:BufferGeometry[]=[],materials:MeshStandardMaterial[]=[];
 const flocks: {mesh:InstancedMesh;butterfly:boolean;count:number}[]=[];
 const beds=[[-3.1,-6.4],[4,-7],[-5.8,-9],[5.8,-10],[-3.4,6.2],[3.5,6.8],[-5.3,8],[5.7,9],[-8.1,12],[7.5,13],[-11,19],[10,21]];
 for(const butterfly of [false,true]){
  const count=butterfly?beds.length:42,geometry=animalGeometry(butterfly);owned.push(geometry);
  const phases=Float32Array.from({length:count},(_,i)=>i*2.399);
  geometry.setAttribute('flightPhase',new InstancedBufferAttribute(phases,1));
  const material=new MeshStandardMaterial({color:butterfly?'#eedaa1':'#384d56',side:DoubleSide,roughness:.85,envMapIntensity:.15});
  material.onBeforeCompile=shader=>{
   shader.uniforms.wildlifeTime=light.time;
   shader.vertexShader='uniform float wildlifeTime; attribute float wingSide; attribute float flightPhase; varying vec3 vAnimal;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    vAnimal=position;
    float phase=wildlifeTime*${butterfly?'32.0':'6.0'}+flightPhase;
    float glide=${butterfly?'1.0':'smoothstep(-.3,.6,sin(wildlifeTime*.43+flightPhase))'};
    float wingAngle=(${butterfly?'.65+sin(phase)*.8':'.10+sin(phase)*.52*glide'})*wingSide;
    transformed.xy=mat2(cos(wingAngle),sin(wingAngle),-sin(wingAngle),cos(wingAngle))*transformed.xy;
   `);
   if(butterfly){
    shader.fragmentShader='varying vec3 vAnimal;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
     float outer=smoothstep(.065,.108,abs(vAnimal.x));
     float veins=pow(.5+.5*sin(atan(vAnimal.z,abs(vAnimal.x))*17.0),18.0)*.30;
     diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.10,.065,.045),outer*.82+veins);
     float spots=pow(.5+.5*cos(vAnimal.z*240.0),14.0)*smoothstep(.077,.09,abs(vAnimal.x));
     diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.94,.88,.7),spots*.65);
     if(abs(vAnimal.x)<.009)diffuseColor.rgb*=.22;
    `);
   }
  };
  material.customProgramCacheKey=()=>`valley-wildlife-v1-${butterfly}`;
  applyOutdoorLight(material,light,butterfly?.12:0);materials.push(material);
  const mesh=new InstancedMesh(geometry,material,count);mesh.name=butterfly?'meadow-butterflies':'valley-swallows';
  mesh.frustumCulled=false;mesh.raycast=()=>{};
  if(butterfly)for(let i=0;i<count;i++)mesh.setColorAt(i,new Color(['#ffe2a0','#d5d4fa','#efc17c'][i%3]));
  group.add(mesh);flocks.push({mesh,butterfly,count});
 }
 const update=(t:number)=>{
  for(const {mesh,butterfly,count}of flocks){
   for(let i=0;i<count;i++){
    const phase=i*2.399;
    if(butterfly){
     const [cx,cz]=beds[i],angle=t*.48+phase;
     const x=cx+Math.sin(angle)*.8,z=cz+Math.sin(angle*.71+phase)*.65;
     const hover=.30+.24*(.5+.5*Math.sin(t*1.2+phase));
     transform.position.set(...distantPosition([x,floorY+worldHeight(x,z)+hover,z]));
     transform.rotation.set(Math.sin(t*1.8+phase)*.18,Math.atan2(Math.cos(angle),Math.cos(angle*.71+phase)*.58)+Math.PI,Math.cos(angle)*.25);
     transform.scale.setScalar(.5+(i%3)*.10);
    }else{
     const flock=Math.floor(i/7),index=i%7;
     const centers=[[25,10,-74],[-22,14,83],[-105,21,-255],[48,17,-175],[115,27,-395],[-140,30,-510]];
     const [cx,cy,cz]=centers[flock],angle=t*(.055+flock*.004)+flock*1.7-index*.065;
     const radius=28+flock*5+index*1.5;
     transform.position.set(cx+Math.cos(angle)*radius,cy+index*.32+Math.sin(t*.4+phase)*.8,cz+Math.sin(angle)*radius*.7);
     transform.rotation.set(0,Math.atan2(-Math.sin(angle),Math.cos(angle)*.7)+Math.PI,-.12+Math.sin(t*.43+phase)*.09);
     transform.scale.setScalar((.7+(index%3)*.1)*(flock>1?1.25:1));
    }
    transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);
   }
   mesh.instanceMatrix.needsUpdate=true;
  }
 };
 update(0);
 return {group,update,dispose:()=>{flocks.forEach(f=>f.mesh.dispose());owned.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
export function ValleyWildlife({floorY}:{floorY:number}){
 const light=useOutdoorLight(),wildlife=useMemo(()=>createWildlife(floorY,light),[floorY,light]);
 useFrame(()=>wildlife.update(light.time.value));
 useEffect(()=>()=>wildlife.dispose(),[wildlife]);
 return <primitive object={wildlife.group} dispose={null}/>;
}
