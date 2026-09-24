"use client";
import {useEffect,useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import {BoxGeometry,BufferGeometry,Float32BufferAttribute,Group,Mesh,MeshStandardMaterial,CatmullRomCurve3,TubeGeometry,Vector3,DoubleSide} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RIVER_STOPS} from '@/lib/lobby/riverbank-habitats';
import {riverCenter,riverWidth,riverLevel,worldHeight} from '@/lib/lobby/world-geography';
import {distantPosition,vistaSpread} from '@/lib/lobby/world-distance';
import {applyOutdoorLight,useOutdoorLight} from './outdoor-lighting';

/** Small working river landings: steps follow the bank, piles reach the bed,
 * clinker hulls sit in the water. Everything uses local world metres. */
export function RiverLandings({floorY}:{floorY:number}){
 const light=useOutdoorLight();
 const life=useMemo(()=>{
  const group=new Group(),geometries:BufferGeometry[]=[],materials:MeshStandardMaterial[]=[];
  const material=(color:string)=>{const m=applyOutdoorLight(new MeshStandardMaterial({color,roughness:.87,envMapIntensity:.2,side:DoubleSide}),light);materials.push(m);return m;};
  const wood=material('#756044'),dark=material('#3e3829'),hull=material('#88533a'),rope=material('#bba77a');
  const boats:{root:Group;base:number;phase:number}[]=[];
  const batch=(parts:BufferGeometry[],mat:MeshStandardMaterial,parent:Group)=>{if(!parts.length)return;const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());geometries.push(g);const m=new Mesh(g,mat);m.raycast=()=>{};m.receiveShadow=true;parent.add(m);};
  const plank=(parts:BufferGeometry[],x:number,y:number,z:number,w:number,h:number,d:number)=>parts.push(new BoxGeometry(w,h,d).translate(x,y,z));
  for(const [index,{z,side}]of RIVER_STOPS.entries()){
   const x=riverCenter(z)+side*(riverWidth(z)+1.7),base=distantPosition([x,floorY+riverLevel(z),z]);
   const landing=new Group();landing.position.set(...base);landing.rotation.y=side>0?0:Math.PI;group.add(landing);
   const boards:BufferGeometry[]=[],piles:BufferGeometry[]=[],lines:BufferGeometry[]=[];
   // Deck extends from the dry lip into the river. Its short landward staircase
   // is sampled against terrain, so it cannot hang above a steep bank.
   for(let i=0;i<17;i++)plank(boards,-8+i*.62,1,0,.58,.2,3.9);
   for(const px of [-7.6,-3,1.6])for(const pz of [-1.65,1.65])plank(piles,px,-.8,pz,.27,5.4,.27);
   for(let i=0;i<11;i++){
    const localX=2.6+i*.65,designX=x+side*localX/vistaSpread(z),height=floorY+worldHeight(designX,z)-base[1]+.18;
    plank(boards,localX,height,0,.67,.25,2.8);
   }
   for(const pz of [-1.7,1.7]){
    const points=[new Vector3(-7.6,1.75,pz),new Vector3(-5.3,1.42,pz),new Vector3(-3,1.75,pz)];lines.push(new TubeGeometry(new CatmullRomCurve3(points),20,.045,5,false));
   }
   // Weathered cross braces and mooring ropes, merged into shared draws.
   for(const px of [-6,-1.5])plank(piles,px,.73,0,4.2,.3,.25);
   batch(boards,wood,landing);batch(piles,dark,landing);batch(lines,rope,landing);
   const boat=new Group();boat.position.set(-6,.12,6.4);boat.rotation.y=Math.PI/2+.08;landing.add(boat);boats.push({root:boat,base:.12,phase:index*3.1});
   const strips:BufferGeometry[]=[],ribs:BufferGeometry[]=[],trim:BufferGeometry[]=[];
   // Five overlapping curved strakes on each side form an open hull with a
   // raised bow and stern, rather than a solid toy boat or flat silhouette.
   const point=(t:number,v:number,side:number)=>{const f=Math.pow(Math.max(0,Math.sin(Math.PI*t)),.7);return new Vector3((t-.5)*7.8,-.52+v*.94+Math.pow(Math.abs(t-.5)*2,4)*.55,side*f*(.26+v*.88));};
   for(const side of [-1,1])for(let row=0;row<5;row++){
    const vertices:number[]=[],indices:number[]=[],g=new BufferGeometry();
    for(let i=0;i<=40;i++)for(const v of [row/5,(row+1)/5+.012])vertices.push(...point(i/40,v,side).toArray());
    for(let i=0;i<40;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
    g.setAttribute('position',new Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();g.setAttribute('uv',new Float32BufferAttribute(new Float32Array(vertices.length/3*2),2));strips.push(g);
   }
   for(const side of [-1,1])trim.push(new TubeGeometry(new CatmullRomCurve3(Array.from({length:31},(_,i)=>point(i/30,1,side))),48,.075,6,false));
   for(const x of [-1.8,0,1.8])plank(ribs,x,.18,0,.5,.13,1.72);
   plank(ribs,0,-.36,0,5,.13,.75);
   batch(strips,hull,boat);batch(ribs,wood,boat);batch(trim,dark,boat);
  }
  const update=(time:number)=>boats.forEach(({root,base,phase})=>{root.position.y=base+Math.sin(time*.85+phase)*.055;root.rotation.x=Math.sin(time*.65+phase)*.018;root.rotation.z=Math.sin(time*.73+phase)*.013;});
  return {group,update,dispose:()=>{geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
 },[floorY,light]);
 useFrame(()=>life.update(light.time.value));useEffect(()=>()=>life.dispose(),[life]);
 return <primitive object={life.group} dispose={null}/>;
}
