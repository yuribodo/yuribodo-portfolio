"use client";
import {distantPosition} from "@/lib/lobby/world-distance";
import { applyOutdoorLight, useOutdoorLight, type OutdoorLight } from "./outdoor-lighting";

import { useEffect, useMemo } from "react";
import { applyWorldWind } from "./world-wind";
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, InstancedMesh, MeshStandardMaterial, Object3D } from "three";
import { roadCenter, worldHeight, worldSlope, riverLevel } from "@/lib/lobby/world-geography";

// A sculpted blade with a curved tip; flowers have separate petals, centres,
// leaves and bent stems. No billboards or extra texture downloads.
function meadowGeometry(flower: boolean) {
  const positions:number[]=[], colors:number[]=[];
  const add=(a:number[],b:number[],c:number[],color:Color)=>{
    positions.push(...a,...b,...c);
    for(let i=0;i<3;i++)colors.push(color.r,color.g,color.b);
  };
  const dark=new Color('#809864'),light=new Color('#d1dc8f');
  if(!flower){
    for(let blade=0;blade<3;blade++)for(let i=0;i<4;i++){
      const t=i/4,u=(i+1)/4,w=.031*(1-t),v=.031*(1-u),angle=blade*2.4;
      const point=(x:number,y:number,z:number)=>[Math.cos(angle)*x+Math.sin(angle)*z+.11*Math.cos(angle),y*(.75+blade*.13),-Math.sin(angle)*x+Math.cos(angle)*z+.11*Math.sin(angle)];
      const a=point(-w,t,t*t*.23),b=point(w,t,t*t*.23),c=point(-v,u,u*u*.23),d=point(v,u,u*u*.23);
      const tint=dark.clone().lerp(light,t*.85);add(a,b,c,tint);add(b,d,c,tint);
    }
  }else{
    const stem=new Color('#86a75d'),white=new Color('white'),gold=new Color('#e6ad39');
    for(let i=0;i<3;i++){
      const t=i/3,u=(i+1)/3;
      const a=[t*t*.1-.008,t,0],b=[t*t*.1+.008,t,0],c=[u*u*.1-.008,u,0],d=[u*u*.1+.008,u,0];
      add(a,b,c,stem);add(b,d,c,stem);
    }
    for(const [height,side]of [[.35,-1],[.62,1]]){
      const center=[.1*height*height+side*.045,height+.06,0];
      for(let j=0;j<10;j++){
        const point=(a:number)=>[center[0]+Math.cos(a)*.07,height+.06+Math.cos(a)*side*.045,Math.sin(a)*.025];
        add(center,point(j/10*Math.PI*2),point((j+1)/10*Math.PI*2),stem);
      }
    }
    for(let petal=0;petal<6;petal++){
      const angle=petal*Math.PI/3;
      const point=(a:number)=>{
        const r=.075+Math.cos(a)*.067,w=Math.sin(a)*.057;
        return [.1+Math.cos(angle)*r-Math.sin(angle)*w,1+Math.pow(r/.15,2)*.035,Math.sin(angle)*r+Math.cos(angle)*w];
      };
      const center=[.1+Math.cos(angle)*.075,1.012,Math.sin(angle)*.075];
      for(let j=0;j<12;j++)add(center,point(j/12*Math.PI*2),point((j+1)/12*Math.PI*2),white);
      const centrePoint=(a:number)=>[.1+Math.cos(a)*.043,1.025,Math.sin(a)*.043];
      add([.1,1.045,0],centrePoint(angle),centrePoint(angle+Math.PI/3),gold);
    }
  }
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.setAttribute('color',new Float32BufferAttribute(colors,3));g.computeVertexNormals();
  return g;
}

function buildMeadow(floorY:number,light:OutdoorLight){
  let seed=80317;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  type Plant={x:number;z:number;y:number;size:number;yaw:number;tint:Color};
  const buckets=new Map<string,Plant[]>();
  const greens=['#b1c685','#82aa6f','#a9bb6e'], petals=['#eee7bb','#b7a3dd','#e3c25c'];
  for(let i=0;i<56000;i++){
    const a=random()*Math.PI*2,r=i<36000?Math.sqrt(4.4**2+random()*(18**2-4.4**2)):Math.sqrt(18**2+random()*(83**2-18**2));
    const x=Math.sin(a)*r,z=Math.cos(a)*r;
    if(Math.abs(x)<5.5&&z>-4.6&&z<4.35)continue;
    let route=Math.abs(x-Math.sin(z*.17)*1.6);
    if(z< -7)route=Math.abs(x-roadCenter(z));
    if(z>7){const t=(z-7)/138;route=Math.abs(x-(-12*t+Math.sin(t*Math.PI)*6));}
    if(route<1.05+random()*.35||worldSlope(x,z)>.72)continue;
    const y=worldHeight(x,z);if(y<riverLevel(z)+1)continue;
    const growth=Math.sin(x*.35+Math.sin(z*.21)*2)+Math.cos(z*.29-x*.11);
    if(growth<-.55&&random()>.13)continue;
    const flower=i%9===0&&growth>-.1;
    // Different flower colonies follow pockets in the meadow, not a colour mix per stem.
    const variety=Math.floor((Math.sin(x*.12)+Math.cos(z*.17)+2)*1.7)%3;
    const key=`${flower?'flowers':'grass'}:${Math.floor(x/32)}:${Math.floor(z/32)}`;
    const tint=new Color(flower?petals[variety]:greens[i%3]);
    (buckets.get(key)??(buckets.set(key,[]),buckets.get(key)!)).push({x,z,y:floorY+y-.015,size:flower?.16+random()*.14:.13+random()*.23,yaw:random()*Math.PI*2,tint});
  }
  const group=new Group(),blade=meadowGeometry(false),flower=meadowGeometry(true);
  const material=new MeshStandardMaterial({vertexColors:true,side:DoubleSide,roughness:1,envMapIntensity:.08});
  material.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\n normal *= faceDirection;');
    // Broad upward normals keep thin grass from flashing between black/white.
    shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\n objectNormal=normalize(vec3(normal.x*.3,1.0,normal.z*.3));');
  };
  material.customProgramCacheKey=()=> 'meadow-life-v1';
  applyWorldWind(material,light,1,.13,.008);
  applyOutdoorLight(material,light,.2);
  const transform=new Object3D();
  for(const [key,plants] of buckets){
    const mesh=new InstancedMesh(key.startsWith('flowers')?flower:blade,material,plants.length);
    plants.forEach((p,i)=>{transform.position.set(...distantPosition([p.x,p.y,p.z]));transform.rotation.set(0,p.yaw,0);transform.scale.set(p.size*1.6,p.size,p.size);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);mesh.setColorAt(i,p.tint);});
    mesh.computeBoundingSphere();mesh.raycast=()=>{};mesh.receiveShadow=true;group.add(mesh);
  }
  return {group,dispose:()=>{group.children.forEach(m=>(m as InstancedMesh).dispose());blade.dispose();flower.dispose();material.dispose();}};
}

export function MeadowLife({floorY}:{floorY:number}){
  const light=useOutdoorLight();
  const meadow=useMemo(()=>buildMeadow(floorY,light),[floorY,light]);
  useEffect(()=>()=>meadow.dispose(),[meadow]);
  return <primitive object={meadow.group} dispose={null}/>;
}
