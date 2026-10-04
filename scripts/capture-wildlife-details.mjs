/** Isolated visual inspection of the actual shipped models, rigs and materials. */
import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--use-angle=gl','--enable-gpu']});
try{
 const page=await browser.newPage({viewport:{width:1360,height:860}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__three/**',async route=>{
  const relative=new URL(route.request().url()).pathname.slice('/__three/'.length);
  const file=path.resolve('node_modules/three',relative);
  if(!file.startsWith(path.resolve('node_modules/three')+path.sep))return route.abort();
  await route.fulfill({body:await fs.readFile(file),contentType:file.endsWith('.wasm')?'application/wasm':'text/javascript'});
 });
 await page.route('**/__wildlife-review',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}canvas{display:block}aside{position:fixed;left:36px;top:28px;font:14px system-ui;color:#233b38}b{display:block;font-size:23px;margin-bottom:6px}</style><script type="importmap">{"imports":{"three":"/__three/build/three.module.js","three/addons/":"/__three/examples/jsm/"}}</script></head><body><aside><b>Fauna · modelos usados no cenário</b>Cervos texturizados e dragão com rig de voo</aside><script type="module">
 import * as T from 'three';import {GLTFLoader}from'three/addons/loaders/GLTFLoader.js';import{DRACOLoader}from'three/addons/loaders/DRACOLoader.js';
 const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;document.body.appendChild(renderer.domElement);
 const scene=new T.Scene();scene.background=new T.Color('#d7e5df');scene.add(new T.HemisphereLight('#d5ecff','#857c58',2));const sun=new T.DirectionalLight('#fff0d0',3);sun.position.set(-4,8,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8});sun.shadow.normalBias=.025;scene.add(sun);
 const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:'#809272',roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
 const camera=new T.PerspectiveCamera(38,innerWidth/innerHeight,.1,100);camera.position.set(7,5.2,14);camera.lookAt(0,2.1,0);
 const draco=new DRACOLoader().setDecoderPath('/__three/examples/jsm/libs/draco/');const loader=new GLTFLoader().setDRACOLoader(draco);const mixers=[];
 for(const [name,height,x,z]of [['stag',3.4,-2,0],['deer',2.1,1.7,.5],['dragon',6.4,0,-3]]){
  const gltf=await loader.loadAsync('/lobby/world/wildlife-'+name+'.glb'),model=gltf.scene;model.updateMatrixWorld(true);const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3());const scale=height/(name==='dragon'?size.x:size.y);model.scale.multiplyScalar(scale);model.position.set(x,-box.min.y*scale+(name==='dragon'?4.3:0),z);model.rotation.y=name==='dragon'?.2:-.75;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false;}});scene.add(model);
  const clip=gltf.animations.find(a=>a.name===(name==='dragon'?'Dragon_Flying':'Idle_2'));if(clip){const mixer=new T.AnimationMixer(model);mixer.clipAction(clip).play();mixer.update(name==='dragon'?2.5:.8);mixers.push(mixer);}
 }
 const clock=new T.Clock();renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05);mixers.forEach(m=>m.update(dt));renderer.render(scene,camera)});window.reviewReady=true;
 </script></body></html>`}));
 await page.goto((process.env.WORLD_REVIEW_URL||'http://localhost:3002')+'/__wildlife-review');
 await page.waitForFunction(()=>window.reviewReady,{timeout:90000});await page.waitForTimeout(2000);
 await page.screenshot({path:'docs/design/isekai-world/implementation/wildlife-details.png'});
 console.log(JSON.stringify({errors}));if(errors.length)process.exitCode=1;
}finally{await browser.close();}
