/** CC0 Quaternius Stylized Nature MegaKit. Source IDs are recorded in assets/lobby-world/nature-sources.json. */
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url), sdk=createRequire(require.resolve('@gltf-transform/cli'));
const {NodeIO,Document}=sdk('@gltf-transform/core');
const {getBounds,mergeDocuments,unpartition,dedup}=sdk('@gltf-transform/functions');
const directory=process.argv[2];if(!directory)throw Error('Pass the source GLB directory.');
const io=new NodeIO(),result=new Document(),world=result.createScene('Natural vegetation');
const heights={'tree-a':10,'tree-c':8,'tree-d':9,'pine-a':11,'pine-b':13,bush:1.5,fern:1,grass:.42,'grass-wispy':.65,'tall-grass':1.25,'rock-a':2,'rock-b':1.5};
for(const [name,height]of Object.entries(heights)){
 const doc=await io.read(`${directory}/${name}.glb`),scene=doc.getRoot().listScenes()[0];
 const {min,max}=getBounds(scene),scale=height/(max[1]-min[1]);
 const root=doc.createNode(name).setScale([scale,scale,scale]).setTranslation([-(min[0]+max[0])/2*scale,-min[1]*scale,-(min[2]+max[2])/2*scale]);
 for(const node of scene.listChildren())root.addChild(node);scene.addChild(root);
 for(const material of doc.getRoot().listMaterials()){
  material.setMetallicFactor(0).setRoughnessFactor(1);
  if(material.getAlphaMode()==='BLEND')material.setAlphaMode('MASK').setAlphaCutoff(.4).setDoubleSided(true);
 }
 // Stable unique names after combining models with identical material slots.
 for(const mesh of doc.getRoot().listMeshes())mesh.setName(`${name}-geometry`);
 for(const node of doc.getRoot().listNodes())if(node!==root)node.setName(`${name}-${node.getName()}`);
 const mapped=mergeDocuments(result,doc),copied=mapped.get(scene);
 for(const node of copied.listChildren())world.addChild(node);copied.dispose();
}
await result.transform(unpartition(),dedup());await io.write('/tmp/natural-vegetation.glb',result);
execFileSync('pnpm',['exec','gltf-transform','optimize','/tmp/natural-vegetation.glb','public/lobby/world/natural-vegetation.glb','--compress','meshopt','--texture-compress','webp','--texture-size','512','--simplify','true','--simplify-ratio','.5','--simplify-error','.02','--join','false','--flatten','false'],{stdio:'inherit'});
