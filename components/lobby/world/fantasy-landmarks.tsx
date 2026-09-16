"use client";
import {useEffect,useMemo} from 'react';
import {useGLTF} from '@react-three/drei';
import {Box3,BufferGeometry,CatmullRomCurve3,Color,DoubleSide,Float32BufferAttribute,LatheGeometry,Mesh,MeshStandardMaterial,TubeGeometry,Vector2,Vector3} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ANCIENT_TREES,MUSHROOM_GROVES} from '@/lib/lobby/fantasy-landmarks';
import {distantPosition,vistaSpread} from '@/lib/lobby/world-distance';
import {worldHeight} from '@/lib/lobby/world-geography';
import {InstanceBatch,useBakedGeometry} from './art-directed-terrace';
import {applyOutdoorLight,useOutdoorLight} from './outdoor-lighting';
import {applyWorldWind} from './world-wind';

/** A full authored crown at landmark scale, with individually grounded buttress roots. */
export function AncientTrees({floorY}:{floorY:number}){
 const {scene}=useGLTF('/lobby/world/organic-tree_small_02.glb'),baked=useBakedGeometry(scene),light=useOutdoorLight();
 const resources=useMemo(()=>{
  scene.updateMatrixWorld(true);const bounds=new Box3().setFromObject(scene),size=bounds.getSize(new Vector3()),center=bounds.getCenter(new Vector3());
  const parts:{geometry:BufferGeometry;material:MeshStandardMaterial}[]=[],materials=new Map<MeshStandardMaterial,MeshStandardMaterial>();
  let bark:MeshStandardMaterial|undefined;
  scene.traverse(o=>{
   if(!(o instanceof Mesh))return;const source=o.material as MeshStandardMaterial,foliage=/leaves|twig/i.test(source.name);
   if(!materials.has(source)){
    const m=source.clone();m.metalness=0;m.envMapIntensity=.28;
    if(foliage){m.side=DoubleSide;m.alphaToCoverage=true;m.transparent=false;m.depthWrite=true;m.color.set('#d2e6c7');m.roughness=.85;
     m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      float leafValue=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
      diffuseColor.rgb=mix(vec3(.025,.085,.058),vec3(.32,.47,.19),smoothstep(.005,.24,leafValue));
     `);};m.customProgramCacheKey=()=> 'ancient-leaf-pigment-v1';}
    else bark=m;
    applyWorldWind(m,light,1,.42,foliage?.025:0);applyOutdoorLight(m,light,foliage?.18:0);materials.set(source,m);
   }
   const geometry=baked.get(o.name)!.clone();geometry.translate(-center.x,-bounds.min.y,-center.z).scale(1.65/size.y,1/size.y,1.45/size.y);parts.push({geometry,material:materials.get(source)!});
  });
  const roots:BufferGeometry[]=[];
  for(const tree of ANCIENT_TREES){
   const origin=distantPosition([tree.x,floorY+worldHeight(tree.x,tree.z),tree.z]),spread=vistaSpread(tree.z),factor=tree.height/88;
   for(let i=0;i<9;i++){
    const a=i/9*Math.PI*2,points:Vector3[]=[];
    for(let k=0;k<=6;k++){
     const t=k/6,r=(1.2+t*21)*factor,angle=a+Math.sin(t*3+i)*.16;
     const x=tree.x+Math.sin(angle)*r/spread,z=tree.z+Math.cos(angle)*r/spread;
     const y=(floorY+worldHeight(x,z))+(1-t)*(1-t)*9*factor-.3;
     points.push(new Vector3(origin[0]+Math.sin(angle)*r,y,origin[2]+Math.cos(angle)*r));
    }
    const curve=new CatmullRomCurve3(points),g=new TubeGeometry(curve,36,1,9,false),p=g.attributes.position;
    for(let j=0;j<=36;j++){const c=curve.getPointAt(j/36),radius=(Math.pow(1-j/36,1.5)*2.4+.13)*factor;
     for(let k=0;k<=9;k++){const n=j*10+k;p.setXYZ(n,c.x+(p.getX(n)-c.x)*radius,c.y+(p.getY(n)-c.y)*radius,c.z+(p.getZ(n)-c.z)*radius);}}
    g.computeVertexNormals();roots.push(g);
   }
  }
  const rootGeometry=mergeGeometries(roots)!;roots.forEach(g=>g.dispose());
  const rootMaterial=applyOutdoorLight(new MeshStandardMaterial({map:bark?.map,normalMap:bark?.normalMap,color:'#7a8067',roughness:.95,envMapIntensity:.18}),light);
  return {parts,rootGeometry,rootMaterial,dispose:()=>{parts.forEach(p=>p.geometry.dispose());materials.forEach(m=>m.dispose());rootGeometry.dispose();rootMaterial.dispose();}};
 },[scene,baked,light,floorY]);
 const placements=useMemo(()=>ANCIENT_TREES.map(t=>({position:[t.x,floorY+worldHeight(t.x,t.z)-.45,t.z] as [number,number,number],scale:t.height,yaw:t.yaw})),[floorY]);
 useEffect(()=>()=>resources.dispose(),[resources]);
 return <group name="ancient-jura-grove">{resources.parts.map((p,i)=><InstanceBatch key={i} geometry={p.geometry} material={p.material} placements={placements}/>)}<mesh geometry={resources.rootGeometry} material={resources.rootMaterial} raycast={()=>{}}/></group>;
}

/** Sculpted, asymmetrical mushroom groves mark the slimes' habitats. */
export function EnchantedGroves({floorY}:{floorY:number}){
 const light=useOutdoorLight();
 const resources=useMemo(()=>{
  const cap=new LatheGeometry([[0,1.84],[.25,1.84],[.58,1.79],[.92,1.66],[1.2,1.48],[1.36,1.32],[1.37,1.23],[1.3,1.18],[1.06,1.22],[.68,1.3],[.22,1.36],[0,1.36]].map(p=>new Vector2(...p)),64);
  const p=cap.attributes.position,colors:number[]=[],dark=new Color('#454e89'),rim=new Color('#9caaca'),top=new Color('#8e85ae');
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x),r=Math.hypot(x,z);
   p.setXYZ(i,x*(1+.035*Math.sin(a*5)),y+.045*Math.sin(a*3+.6)*r,z);
   const color=y<1.37?dark.clone().lerp(rim,Math.min(1,r/1.36)):top.clone().multiplyScalar(.9+.08*Math.sin(a*7+r*12));colors.push(color.r,color.g,color.b);
  }
  cap.setAttribute('color',new Float32BufferAttribute(colors,3));cap.computeVertexNormals();
  const stem=new LatheGeometry([[0,-.12],[.24,-.12],[.23,.04],[.18,.2],[.13,.55],[.14,1.04],[.24,1.37],[0,1.38]].map(p=>new Vector2(...p)),36);
  const sp=stem.attributes.position;for(let i=0;i<sp.count;i++)sp.setX(i,sp.getX(i)+Math.sin(sp.getY(i)*2.4)*.12);stem.computeVertexNormals();
  const gills:BufferGeometry[]=[];for(let i=0;i<42;i++){const a=i/42*Math.PI*2;const curve=new CatmullRomCurve3([new Vector3(Math.cos(a)*.2,1.35,Math.sin(a)*.2),new Vector3(Math.cos(a)*.72,1.27,Math.sin(a)*.72),new Vector3(Math.cos(a)*1.29,1.19,Math.sin(a)*1.29)]);gills.push(new TubeGeometry(curve,8,.012,4,false));}
  const gillGeometry=mergeGeometries(gills)!;gills.forEach(g=>g.dispose());
  const capMaterial=applyOutdoorLight(new MeshStandardMaterial({vertexColors:true,roughness:.39,envMapIntensity:.5}),light);
  const stemMaterial=applyOutdoorLight(new MeshStandardMaterial({color:'#c9c8a6',roughness:.7,envMapIntensity:.25}),light);
  const gillMaterial=applyOutdoorLight(new MeshStandardMaterial({color:'#abddd3',emissive:'#62a99f',emissiveIntensity:.18,roughness:.7}),light);gillMaterial.userData.worldEmissive=.18;
  const placements=MUSHROOM_GROVES.flatMap(([cx,cz],grove)=>Array.from({length:grove===4?3:6},(_,i)=>{
   const a=i*2.399+grove,r=i?1.6+Math.sqrt(i)*1.2:0,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;
   return {position:[x,floorY+worldHeight(x,z),z] as [number,number,number],scale:grove===4?.6+i*.16:i===0?6.8:2.3+(i%3)*.9,yaw:a};
  }));
  return {parts:[{geometry:cap,material:capMaterial},{geometry:stem,material:stemMaterial},{geometry:gillGeometry,material:gillMaterial}],placements};
 },[floorY,light]);
 useEffect(()=>()=>resources.parts.forEach(p=>{p.geometry.dispose();p.material.dispose();}),[resources]);
 return <group name="enchanted-mushroom-glades">{resources.parts.map((p,i)=><InstanceBatch key={i} geometry={p.geometry} material={p.material} placements={resources.placements}/>)}</group>;
}
