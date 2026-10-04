import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Box3,BufferGeometry,Float32BufferAttribute,Frustum,Matrix4,PerspectiveCamera,PlaneGeometry,Vector3,type BufferAttribute} from 'three';
import {landGeometry,spreadLandscape} from '@/components/lobby/world/landscape-distance';
import {VALLEY_AXIS} from './valley-terrain-grid';
import {unpackTerrainData} from './terrain-data-format';
import {TERRAIN_DATA_URL} from './terrain-data-manifest';
import {distantPosition} from './world-distance';
import {DESK_CAMERA,DESK_TARGET} from './world-view';

// Pre-optimisation implementations, kept verbatim as the bit-exact reference.
function referenceSpread(geometry:BufferGeometry,keepDomain=false){
 const vertices=geometry.attributes.position;
 if(keepDomain){const domain:number[]=[];for(let i=0;i<vertices.count;i++)domain.push(vertices.getX(i),vertices.getY(i),vertices.getZ(i));geometry.setAttribute('landDomain',new Float32BufferAttribute(domain,3));geometry.computeVertexNormals();geometry.setAttribute('landDomainNormal',geometry.attributes.normal.clone());}
 for(let i=0;i<vertices.count;i++)vertices.setXYZ(i,...distantPosition([vertices.getX(i),vertices.getY(i),vertices.getZ(i)]));
 vertices.needsUpdate=true;geometry.computeVertexNormals();
 geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
function referenceLand(heights:Float32Array){
 const axis=VALLEY_AXIS,positions:number[]=[],indices:number[]=[],uv:number[]=[];
 let sample=0;
 for(const z of axis)for(const x of axis){const y=heights[sample++];positions.push(x,y,z);uv.push((x+85)/170,(85-z)/170);}
 const n=axis.length;
 for(let z=0;z<n-1;z++)for(let x=0;x<n-1;x++){
  if(axis[x]>=-85&&axis[x+1]<=85&&axis[z]>=-85&&axis[z+1]<=85)continue;
  const a=z*n+x,b=a+1,c=a+n,d=c+1;indices.push(a,c,b,b,c,d);
 }
 const geometry=new BufferGeometry();
 geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 return referenceSpread(geometry,true);
}
function nearPlane(heights:Float32Array){
 const geometry=new PlaneGeometry(170,170,288,288);geometry.rotateX(-Math.PI/2);
 for(let i=0;i<geometry.attributes.position.count;i++)geometry.attributes.position.setY(i,heights[i]);
 return geometry;
}

const shipped=gunzipSync(readFileSync(`public${TERRAIN_DATA_URL}`));
const baked=unpackTerrainData(shipped.buffer.slice(shipped.byteOffset,shipped.byteOffset+shipped.byteLength) as ArrayBuffer);
const bytes=(attribute:BufferAttribute|undefined)=>Buffer.from(attribute!.array.buffer,attribute!.array.byteOffset,attribute!.array.byteLength);
function assertSameAttributes(actual:BufferGeometry,expected:BufferGeometry,names:string[]){
 for(const name of names){
  assert.equal(actual.attributes[name].itemSize,expected.attributes[name].itemSize,name);
  assert.ok(bytes(actual.attributes[name] as BufferAttribute).equals(bytes(expected.attributes[name] as BufferAttribute)),`${name} differs`);
 }
 assert.deepEqual(actual.boundingBox,expected.boundingBox);
 assert.deepEqual(actual.boundingSphere,expected.boundingSphere);
}

test('near terrain spread is bit-identical to the original mapping',()=>{
 const actual=spreadLandscape(nearPlane(baked.near),true),expected=referenceSpread(nearPlane(baked.near),true);
 assertSameAttributes(actual,expected,['position','normal','uv','landDomain','landDomainNormal']);
 assert.ok(bytes(actual.index!).equals(bytes(expected.index!)));
});

test('merged settlement geometry spreads without a domain attribute',()=>{
 const make=()=>{const g=new PlaneGeometry(400,900,40,90);g.rotateX(-Math.PI/2);g.translate(30,0,-200);
  for(let i=0;i<g.attributes.position.count;i++)g.attributes.position.setY(i,Math.sin(i*.37)*20);return g.toNonIndexed();};
 const actual=spreadLandscape(make()),expected=referenceSpread(make());
 assert.equal(actual.attributes.landDomain,undefined);
 assertSameAttributes(actual,expected,['position','normal','uv']);
});

const land=landGeometry(baked.far),reference=referenceLand(baked.far);

test('far terrain keeps positions, normals, uv and landDomain bit-identical',()=>{
 assertSameAttributes(land,reference,['position','normal','uv','landDomain','landDomainNormal']);
});

/** Frustum of the seated camera, with parallax, at the given aspect. */
function cameraFrustum(aspect:number,x:number,y:number,z:number){
 const camera=new PerspectiveCamera(50,aspect,.05,3200);
 camera.position.set(x,y,z);camera.lookAt(new Vector3(DESK_TARGET.x,DESK_TARGET.y,DESK_TARGET.z));
 camera.updateMatrixWorld();camera.updateProjectionMatrix();
 return new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
}

test('far terrain only drops whole quads that no seated or diving camera can see',()=>{
 const full=reference.index!.array as Uint32Array,kept=land.index!.array as Uint32Array;
 const position=reference.attributes.position.array as Float32Array;
 const keptQuads=new Set<string>();
 for(let i=0;i<kept.length;i+=6)keptQuads.add(kept.slice(i,i+6).join());
 assert.equal(kept.length%6,0);
 const dropped:number[][]=[];
 for(let i=0;i<full.length;i+=6){
  const quad=full.slice(i,i+6);
  if(!keptQuads.delete(quad.join()))dropped.push([quad[0],quad[2],quad[1],quad[5]]);
 }
 assert.equal(keptQuads.size,0,'kept quads must be a subset of the original grid, in order');
 assert.ok(dropped.length>full.length/6*.3,'the rear half of the grid is dropped');
 assert.ok(kept.length>0);
 // Parallax corners at the seated pose and the end of the forward dive.
 const poses=[-.06,.06].flatMap(x=>[.34,.46].flatMap(y=>[DESK_CAMERA.z,-.2].map(z=>[x,y,z] as const)));
 for(const floorY of [-.8,-1.5]){
  const boxes=dropped.map(quad=>{
   const box=new Box3(),point=new Vector3();
   for(const v of quad)box.expandByPoint(point.set(position[v*3],position[v*3+1]+floorY,position[v*3+2]));
   return box;
  });
  for(const aspect of [16/10,32/9,4])for(const [x,y,z] of poses){
   const frustum=cameraFrustum(aspect,x,y,z);
   const visible=boxes.findIndex(box=>frustum.intersectsBox(box));
   assert.equal(visible,-1,`quad ${dropped[visible]} is visible at aspect ${aspect.toFixed(2)}, camera ${x},${y},${z}`);
  }
 }
});
