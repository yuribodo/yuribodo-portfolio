/** Licensed wildlife (see wildlife-sources.json): preserve authored rigs, merge same-skin primitives,
 * bake the material palette into vertex colors and retain only ambient clips.
 * Usage: node scripts/build-wildlife.mjs [source-directory]
 */
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import {Matrix4,Quaternion,Vector3} from 'three';
const require=createRequire(import.meta.url),sdk=createRequire(require.resolve('@gltf-transform/cli'));
const {NodeIO}=sdk('@gltf-transform/core');
const {joinPrimitives,prune,resample,dedup,draco}=sdk('@gltf-transform/functions');
const {ALL_EXTENSIONS}=sdk('@gltf-transform/extensions'),draco3d=sdk('draco3dgltf');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.encoder':await draco3d.createEncoderModule()});
const manifest=JSON.parse(await fs.readFile('assets/lobby-world/wildlife-sources.json','utf8'));
for(const [name,source]of Object.entries(manifest).filter(([name])=>name==='dragon')){
 const input=process.argv[2]?new Uint8Array(await fs.readFile(`${process.argv[2]}/wildlife-${name}.glb`)):new Uint8Array(await (await fetch(source.url)).arrayBuffer());
 const doc=await io.readBinary(input),root=doc.getRoot(),buffer=root.listBuffers()[0];
 for(const animation of root.listAnimations()){
  const label=animation.getName();
  if(name==='dragon'?!/\|(Dragon_Flying)$/.test(label):!/^(Eating|Walk|Idle|Idle_2)$/.test(label))animation.dispose();
 }
 if(name==='dragon'){
  // Author a gentle flap/glide cycle on the supplied rig. Hinge axes are
  // converted from model space into each bone's bind space, never guessed Euler axes.
  const flight=doc.createAnimation('Dragon_Flying');
  const times=Float32Array.from({length:97},(_,i)=>i/12);
  const input=doc.createAccessor().setType('SCALAR').setArray(times).setBuffer(buffer);
  for(const node of root.listNodes()){
   const label=node.getName();
   if(!/^(Arm\.[LR]|Forearm\.[LR]|Tail\.00[1-7]|Jaw\.001|Spine\.007)$/.test(label))continue;
   const isWing=/Arm|Forearm/.test(label),worldAxis=new Vector3(isWing?0:label==='Jaw.001'?1:0,isWing||label==='Jaw.001'?0:1,isWing?1:0);
   const matrix=new Matrix4().fromArray(node.getWorldMatrix()),worldQ=new Quaternion();
   matrix.decompose(new Vector3(),worldQ,new Vector3());worldAxis.applyQuaternion(worldQ.invert());
   const bind=new Quaternion().fromArray(node.getRotation()),values=[];
   for(const time of times){
    const phase=time/8*Math.PI*2,flap=Math.sin(phase*3)*Math.pow(.5+.5*Math.cos(phase),2);
    let angle=0;
    if(isWing)angle=(label.endsWith('L')?1:-1)*(label.startsWith('Arm')?.16+flap*.43:.07+Math.sin(phase*3-.5)*.14*Math.pow(.5+.5*Math.cos(phase),2));
    else if(label==='Jaw.001')angle=-.30;
    else angle=Math.sin(phase+(Number(label.slice(-1))||0)*.45)*.035;
    values.push(...bind.clone().multiply(new Quaternion().setFromAxisAngle(worldAxis,angle)).toArray());
   }
   const output=doc.createAccessor().setType('VEC4').setArray(new Float32Array(values)).setBuffer(buffer);
   const sampler=doc.createAnimationSampler().setInput(input).setOutput(output).setInterpolation('LINEAR');
   flight.addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath('rotation').setSampler(sampler));
  }
 }
 const material=doc.createMaterial('wildlife-pigment').setRoughnessFactor(.92).setMetallicFactor(0);
 for(const mesh of root.listMeshes()){
  const primitives=mesh.listPrimitives();
  for(const p of primitives){
   const color=p.getMaterial().getBaseColorFactor().slice(0,3),count=p.getAttribute('POSITION').getCount();
   const colors=new Float32Array(count*3);
   for(let i=0;i<count;i++)colors.set(color,i*3);
   p.setAttribute('COLOR_0',doc.createAccessor().setType('VEC3').setArray(colors).setBuffer(buffer));
   p.setMaterial(material);
  }
  if(primitives.length>1){const joined=joinPrimitives(primitives);primitives.forEach(p=>p.dispose());mesh.addPrimitive(joined);}
 }
 await doc.transform(resample(),dedup(),prune(),draco());
 const output=await io.writeBinary(doc);await fs.writeFile(`public/lobby/world/wildlife-${name}.glb`,output);
 console.log(name,output.byteLength,root.listAnimations().map(a=>a.getName()));
}
