/** Verify the shipped asset, including the loop seam and actual animated joints. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
const require=createRequire(import.meta.url),sdk=createRequire(require.resolve('@gltf-transform/cli'));
const {NodeIO}=sdk('@gltf-transform/core'),{ALL_EXTENSIONS}=sdk('@gltf-transform/extensions');
const {MeshoptDecoder}=sdk('meshoptimizer');
await MeshoptDecoder.ready;
const file='public/lobby/world/toothless-flight.glb';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const doc=await io.read(file),root=doc.getRoot(),clips=root.listAnimations();
assert.equal(clips.length,1);assert.equal(clips[0].getName(),'Toothless_Flight');
const moving=new Set();let duration=0;
for(const channel of clips[0].listChannels()){
 const sampler=channel.getSampler(),times=sampler.getInput().getArray(),output=sampler.getOutput(),values=output.getArray(),size=output.getElementSize();
 assert.equal(times[0],0,'animation must start at zero, with no rest-pose gap');
 duration=Math.max(duration,times.at(-1));
 const first=Array.from(values.slice(0,size)),last=Array.from(values.slice(-size));
 const error=Math.max(...first.map((v,i)=>Math.abs(v-last[i])));
 const signError=channel.getTargetPath()==='rotation'?Math.max(...first.map((v,i)=>Math.abs(v+last[i]))):Infinity;
 assert.ok(Math.min(error,signError)<.001,`loop seam: ${channel.getTargetNode().getName()}`);
 const span=Array.from(values).some((v,i)=>Math.abs(v-first[i%size])>.01);
 if(span)moving.add(channel.getTargetNode().getName());
}
assert.ok(Math.abs(duration-10.8)<.001);
for(const name of ['MainWing1.R','MainWing10.R','MainWing1.L','MainWing10.L','Tail7','FlightRoot']){
 assert.ok(moving.has(name),`missing motion in ${name}`);
}
assert.ok(root.listSkins().length>0,'original skinned mesh must survive export');
for(const name of ['Body','Toothless eyes'])assert.ok(root.listMaterials().find(m=>m.getName()===name)?.getBaseColorTexture(),`missing ${name} texture`);
assert.ok(root.listMaterials().find(m=>m.getName()==='Body').getNormalTexture(),'missing skin normal map');
for(const texture of root.listTextures())assert.ok(texture.getSize().every(n=>n<=2048),'oversized texture');
const bytes=(await fs.stat(file)).size;assert.ok(bytes<2_000_000,'unexpected download size regression');
console.log(JSON.stringify({bytes,duration,movingJoints:moving.size,textures:root.listTextures().length,loopSeam:'passed'}));
