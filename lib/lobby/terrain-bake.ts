// Build-time generators. Keep these out of the client dependency graph.
import { PlaneGeometry } from 'three';
import { worldHeight } from './world-geography';
import { VALLEY_AXIS } from './valley-terrain-grid';
import { plantCommunities } from './plant-communities';
import { vistaSpread } from './world-distance';
import { trailMask } from './valley-trails';
import { type TerrainData } from './terrain-data-format';

export function canopyMask() {
  const size=512, extent=800, density=new Float32Array(size*size);
  for(const [key,plants] of Object.entries(plantCommunities(0))){
    if(!key.startsWith('tree')&&!key.startsWith('pine'))continue;
    for(const plant of plants){
      const [x,,z]=plant.position;
      const radius=(key.startsWith('pine')?3.1:4.2)*plant.scale/vistaSpread(z);
      const cx=(x+extent/2+1.3)/extent*size,cz=(z+extent/2-1.8)/extent*size,rr=radius/extent*size;
      for(let j=Math.max(0,Math.floor(cz-rr*2));j<Math.min(size,cz+rr*2);j++)
        for(let i=Math.max(0,Math.floor(cx-rr*2));i<Math.min(size,cx+rr*2);i++){
          const d=((i-cx)**2+(j-cz)**2)/(rr*rr);
          density[j*size+i]+=Math.exp(-d*1.8)*.65;
        }
    }
  }
  const data=new Uint8Array(size*size*4);
  for(let i=0;i<density.length;i++){const value=Math.round(255*(1-Math.min(.58,density[i])));data.set([value,value,value,255],i*4);}
  return data;
}

export function generateTerrainData(): TerrainData {
  const plane = new PlaneGeometry(170, 170, 288, 288);
  plane.rotateX(-Math.PI / 2);
  const positions = plane.attributes.position;
  const near = new Float32Array(positions.count);
  for (let i = 0; i < near.length; i++) near[i] = worldHeight(positions.getX(i), positions.getZ(i));
  plane.dispose();
  const far = new Float32Array(VALLEY_AXIS.length ** 2);
  let i = 0;
  for (const z of VALLEY_AXIS) for (const x of VALLEY_AXIS) far[i++] = worldHeight(x, z);
  return { near, far, canopy: canopyMask(), trails: trailMask() };
}
