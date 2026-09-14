import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
const require=createRequire(import.meta.url),sdk=createRequire(require.resolve('@gltf-transform/cli'));
const {NodeIO}=sdk('@gltf-transform/core'),{ALL_EXTENSIONS}=sdk('@gltf-transform/extensions');
const {draco,prune,dedup,resample,textureCompress}=sdk('@gltf-transform/functions');
const draco3d=sdk('draco3dgltf'),sharp=createRequire(require.resolve('next/package.json'))('sharp');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.encoder':await draco3d.createEncoderModule()});
for(const name of (process.argv[3]?[process.argv[3]]:['deer','stag'])){
 const doc=await io.read(`${process.argv[2]}/textured-${name}.glb`);
 await doc.transform(prune(),dedup(),resample(),textureCompress({encoder:sharp,targetFormat:'webp',quality:92}),draco());
 const buffer=await io.writeBinary(doc);await fs.writeFile(`public/lobby/world/wildlife-${name}.glb`,buffer);
 console.log(name,buffer.byteLength,doc.getRoot().listAnimations().map(a=>a.getName()));
}
