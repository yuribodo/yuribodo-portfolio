import {type BufferGeometry,Float32BufferAttribute} from 'three';
import {distantPosition} from '@/lib/lobby/world-distance';
/** Ground and water share this mapping; authored UVs retain roads and banks. */
export function spreadLandscape(geometry:BufferGeometry,keepDomain=false){
 const vertices=geometry.attributes.position;
 if(keepDomain){const domain:number[]=[];for(let i=0;i<vertices.count;i++)domain.push(vertices.getX(i),vertices.getY(i),vertices.getZ(i));geometry.setAttribute('landDomain',new Float32BufferAttribute(domain,3));geometry.computeVertexNormals();geometry.setAttribute('landDomainNormal',geometry.attributes.normal.clone());}
 for(let i=0;i<vertices.count;i++)vertices.setXYZ(i,...distantPosition([vertices.getX(i),vertices.getY(i),vertices.getZ(i)]));
 vertices.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
