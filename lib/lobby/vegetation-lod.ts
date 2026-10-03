import {distantPosition} from './world-distance';
import {DESK_CAMERA} from './world-view';

/** Flip to false to compare against the previous look and cost. */
export const VEGETATION_LOD3=true;
/** Flip to false to draw every tall-grass tuft again. */
export const THIN_TALL_GRASS=true;

/** Height/distance thresholds for the `~lod1`..`~lod3` meshes baked by
 * scripts/build-vegetation-lods.mjs, whose error budgets assume these sizes
 * (at 1440x900/50deg a ratio of 1/N is about 965/N px). The seated camera barely
 * moves, so each instance keeps one tier for good. */
export const LOD_TIERS=[1/12,1/48,1/96] as const;
/** Tufts shorter than this (about 2 px at 1440x900) are specks inside the alpha-to-coverage grain. */
export const TALL_GRASS_MIN_SIZE=1/480;

export interface Placed{position:readonly[number,number,number];scale?:number}

/** Height over distance from the desk camera, where `height` is the unscaled model height. */
export function viewSize({position,scale=1}:Placed,height:number){
  const [x,y,z]=distantPosition(position);
  return height*scale/Math.hypot(x-DESK_CAMERA.x,y-DESK_CAMERA.y,z-DESK_CAMERA.z);
}

export function lodTier(plant:Placed,height:number,lod3=VEGETATION_LOD3){
  const size=viewSize(plant,height);
  return size>=LOD_TIERS[0]?0:size>=LOD_TIERS[1]?1:!lod3||size>=LOD_TIERS[2]?2:3;
}

export function isVisibleGrass(plant:Placed,height:number,thin=THIN_TALL_GRASS){
  return !thin||viewSize(plant,height)>=TALL_GRASS_MIN_SIZE;
}
