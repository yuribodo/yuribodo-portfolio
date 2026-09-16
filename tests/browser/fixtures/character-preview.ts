import { Scene, WebGLRenderer, PerspectiveCamera, HemisphereLight, DirectionalLight, Color, Mesh, PlaneGeometry, MeshStandardMaterial, Box3, Vector3, Bone } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { createCharacterInstance } from '../../../lib/lobby/character-instance';

const scene=new Scene();scene.background=new Color('#bac9bd');
const renderer=new WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);document.body.appendChild(renderer.domElement);
const camera=new PerspectiveCamera(38,innerWidth/innerHeight,.01,100);camera.position.set(0,1.7,6);camera.lookAt(0,1.3,0);
scene.add(new HemisphereLight('#d7efff','#596245',2));const sun=new DirectionalLight('#fff1d3',3);sun.position.set(-3,6,4);scene.add(sun);
const ground=new Mesh(new PlaneGeometry(50,50),new MeshStandardMaterial({color:'#778771',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.012;scene.add(ground);
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
let current:ReturnType<typeof createCharacterInstance>|null=null,last=performance.now(),paused=false;
const probe={
 async load(id:string){
  if(current){scene.remove(current.root);current.dispose();current=null;}
  const asset=await loader.loadAsync('/lobby/world/characters/'+id+'.glb');
  const instance=createCharacterInstance(asset.scene,asset.animations,{size:id==='going-merry'?3.8:id==='snorlax'?1.5:2.6,sizeAxis:id==='going-merry'?'x':'y',clip:asset.animations[0]?.name});
  current=instance;instance.root.rotation.y=id==='going-merry'?.65:0;scene.add(instance.root);
  const extent=new Box3().setFromObject(instance.root).getSize(new Vector3());
  camera.position.set(0,id==='snorlax'?3.8:1.7,Math.max(6,extent.x*1.5));camera.lookAt(0,1.3,0);
  if(id==='snorlax')instance.root.rotation.y=Math.PI;
  renderer.render(scene,camera);
  return {animations:asset.animations.map(a=>({name:a.name,duration:a.duration})),size:new Box3().setFromObject(instance.root).getSize(new Vector3()).toArray()};
 },
 pause(value:boolean){paused=value;},
 turn(yaw:number){if(current)current.root.rotation.y=yaw;},
 pose(){const values:number[]=[];current?.root.traverse(o=>{if(o instanceof Bone)values.push(...o.quaternion.toArray());});return values;}
};
Object.assign(window,{characterPreview:probe});
function frame(now:number){if(!paused)current?.update((now-last)/1000);last=now;renderer.render(scene,camera);requestAnimationFrame(frame);}requestAnimationFrame(frame);
