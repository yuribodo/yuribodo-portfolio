import {CatmullRomCurve3,TubeGeometry,Vector3,type BufferGeometry} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {distantPosition} from './world-distance';
import {DESK_CAMERA} from './world-view';
import impostorBake from './ancient-tree-impostor.json';

export const HAMLETS=[[-72,-108,.25],[-62,-149,-.2],[74,-150,.45],[-38,-226,.1]] as const;
export const ANCIENT_TREES=[{x:-38,z:-252,height:88,yaw:.25},{x:-93,z:-185,height:47,yaw:2.1}] as const;
export const MUSHROOM_GROVES=[[-66,-107],[-51,-143],[58,-151],[-44,-223],[-10,-25],[-63,-100]] as const;

/** One switch for the ancient trees and the far mushroom gills. True draws each crown as one baked card (scripts/bake-ancient-tree-impostor.mjs)
 * and far mushrooms with 2-segment gills; false restores the 991k-triangle GLB crowns and every full gill.
 * The seated camera moves 6 cm against 550-760 m, so one view per tree is exact. */
export const ANCIENT_TREE_IMPOSTOR=true;
/** Mushrooms farther than this (m, spread-adjusted, from the seated camera) draw their gills as 2-segment tubes, a quarter of the triangles with the same
 * rim tips. Dropping them outright is visible: the tips glint along the cap rims. The unspread near grove stays whole; Infinity restores every gill. */
export const MUSHROOM_GILL_RANGE=ANCIENT_TREE_IMPOSTOR?200:Infinity;
export function mushroomDistance(x:number,z:number){
 const [px,,pz]=distantPosition([x,0,z]);return Math.hypot(px-DESK_CAMERA.x,pz-DESK_CAMERA.z);
}
export const hasFullGills=(x:number,z:number)=>mushroomDistance(x,z)<=MUSHROOM_GILL_RANGE;

/** `colorGain` scales the baked image to the mesh's mean colour in the live camera (scripts/ab-ancient-tree-impostor.mjs measures it).
 * Rectangle of the baked plane, in metres from the tree's root: u runs screen-right, v up. `distance` is the camera-to-plane distance and
 * `depthRange` the metres the shade image's alpha spans (+-) behind and in front of that plane. */
export interface ImpostorFrame{u0:number;u1:number;v0:number;v1:number;width:number;height:number;distance:number;depthRange:number;colorGain:readonly number[];origin:readonly number[]}
export const IMPOSTOR_FRAMES:readonly ImpostorFrame[]=impostorBake.trees;
/** cloudVisibility of the shade image; the sun image is 1. */
export const IMPOSTOR_SHADE_COVER=impostorBake.shadeCover;
export const impostorUrl=(tree:number,state:'sun'|'shade')=>`/lobby/world/ancient-tree-${tree}-${state}.webp`;

/** The card is the vertical plane through a tree's root, square to the horizontal line from the seated camera, which is the plane the bake was projected onto.
 * Its mesh sits on the root with local x screen-right and local y metres up, so the wind sees the same root as the full crown. */
export function impostorYaw(origin:readonly[number,number,number],camera:{x:number;z:number}=DESK_CAMERA){
 return Math.atan2(camera.x-origin[0],camera.z-origin[2]);
}

/** The mushroom's 42 radial gill tubes under the cap; `segments` is the tube length resolution (8 up close, 2 beyond MUSHROOM_GILL_RANGE).
 * Both end on the same rim tip, which is what glints at a distance. */
export function gillGeometry(segments:number):BufferGeometry{
 const tubes:BufferGeometry[]=[];
 for(let i=0;i<42;i++){
  const a=i/42*Math.PI*2,curve=new CatmullRomCurve3([new Vector3(Math.cos(a)*.2,1.35,Math.sin(a)*.2),new Vector3(Math.cos(a)*.72,1.27,Math.sin(a)*.72),new Vector3(Math.cos(a)*1.29,1.19,Math.sin(a)*1.29)]);
  tubes.push(new TubeGeometry(curve,segments,.012,4,false));
 }
 const merged=mergeGeometries(tubes)!;tubes.forEach(t=>t.dispose());return merged;
}
