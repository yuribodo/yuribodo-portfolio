/** Pack the Blender canopy views and retain the authored nearby mesh. */
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sdk=createRequire(require.resolve('@gltf-transform/cli'));
const sharp=createRequire(require.resolve('next/package.json'))('sharp');
const {NodeIO}=sdk('@gltf-transform/core'),{ALL_EXTENSIONS}=sdk('@gltf-transform/extensions');
const {prune,dedup,textureCompress,draco}=sdk('@gltf-transform/functions'),draco3d=sdk('draco3dgltf');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.encoder':await draco3d.createEncoderModule()});
const names=process.argv[3]?[process.argv[3]]:['tree_small_02','pine_tree_01'];
for(const name of names){
 const source=process.argv[2],meta=JSON.parse(await fs.readFile(`${source}/${name}.json`,'utf8'));
 const composite=Array.from({length:8},(_,i)=>({input:`${source}/${name}-${i}.png`,left:i*512,top:0}));
 await sharp({create:{width:4096,height:512,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(composite).webp({quality:94,alphaQuality:100}).toFile(`public/lobby/world/canopy-${name}.webp`);
 await fs.writeFile(`public/lobby/world/canopy-${name}.json`,JSON.stringify(meta)+'\n');
 const doc=await io.read(`${source}/${name}-near.glb`);
 await doc.transform(prune(),dedup(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[2048,2048],quality:90}),draco());
 const bytes=await io.writeBinary(doc);await fs.writeFile(`public/lobby/world/organic-${name}.glb`,bytes);
 console.log(name,meta,bytes.byteLength);
}
