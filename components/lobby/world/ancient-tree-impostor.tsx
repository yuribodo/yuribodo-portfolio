"use client";
import {useEffect,useMemo} from 'react';
import {useTexture} from '@react-three/drei';
import {Color,Mesh,MeshBasicMaterial,NoColorSpace,PlaneGeometry,ShaderChunk} from 'three';
import {ANCIENT_TREES,IMPOSTOR_FRAMES,IMPOSTOR_SHADE_COVER,impostorUrl,impostorYaw} from '@/lib/lobby/fantasy-landmarks';
import {onLobbyRelease} from '@/lib/lobby/release-assets';
import {distantPosition} from '@/lib/lobby/world-distance';
import {worldHeight} from '@/lib/lobby/world-geography';
import {DESK_CAMERA} from '@/lib/lobby/world-view';
import {arrivalShaded,cloudShader,useOutdoorLight} from './outdoor-lighting';
import {applyWorldWind} from './world-wind';

const URLS=ANCIENT_TREES.flatMap((_,i)=>[impostorUrl(i,'sun'),impostorUrl(i,'shade')]);
/** The template URLs are not literals the release test can see, so this module releases its own cache entries. */
onLobbyRelease(()=>useTexture.clear(URLS));
/** Sharpens the sample by a mip level and a quarter, so the crown's leaf-scale pixel texture keeps the mesh's high-pass energy instead of blurring. */
const MIP_BIAS=-1.25;

/** The images hold display-encoded pixels and are sampled raw: texture filtering then averages encoded values like the mesh's MSAA resolve does,
 * where a decoding sampler would average in linear light and read the high-contrast crown several percent brighter.
 * Each crown is one card holding what the full mesh draws from the seated desk: a sun image and a full-cloud image, blended by the live cloud field.
 * The shade image's alpha holds each pixel's depth behind the card, so the cloud field and the fog see the crown's real shape.
 * The arrival fade, the transition dimmer and the wind root work as they do on the mesh. */
export function AncientTreeCards({floorY}:{floorY:number}){
 const light=useOutdoorLight(),sources=useTexture(URLS);
 const cards=useMemo(()=>ANCIENT_TREES.map((tree,i)=>{
  const frame=IMPOSTOR_FRAMES[i],[sun,shade]=[sources[i*2],sources[i*2+1]].map(source=>{const t=source.clone();t.colorSpace=NoColorSpace;t.anisotropy=4;return t;});
  const geometry=new PlaneGeometry(frame.u1-frame.u0,frame.v1-frame.v0,1,8).translate((frame.u0+frame.u1)/2,(frame.v0+frame.v1)/2,0);
  const material=new MeshBasicMaterial({map:sun,alphaToCoverage:true,toneMapped:false});
  material.userData.worldBaseColor=new Color('white');material.userData.preloadTextures=[shade];
  material.onBeforeCompile=shader=>{
   shader.uniforms.outdoorTime=light.time;shader.uniforms.shadeMap={value:shade};
   if(light.arrival)shader.uniforms.outdoorArrival=light.arrival;
   shader.vertexShader='varying vec3 cardWorld;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n cardWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
   shader.fragmentShader=`varying vec3 cardWorld;\nuniform sampler2D shadeMap;\nfloat cardDepth;\n${light.arrival?`uniform float outdoorArrival;
    bool cardArrived(){return outdoorArrival>=1.0||fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))<outdoorArrival;}\n`:''}${cloudShader}${shader.fragmentShader}`;
   if(light.arrival)shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\n if(!cardArrived())discard;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`diffuseColor*=texture2D(map,vMapUv,${MIP_BIAS.toFixed(2)});
    if(diffuseColor.a<.004)discard;
    vec4 shadeTexel=texture2D(shadeMap,vMapUv,${MIP_BIAS.toFixed(2)});
    cardDepth=(shadeTexel.a-.5)*${(2*frame.depthRange).toFixed(1)};
    // The crown's sun term is the only thing the cloud field touches: blend the two images by how much of it is left at this pixel's real depth.
    float coverage=cloudVisibility(cardWorld+(cardWorld-vec3(${DESK_CAMERA.x.toFixed(2)},${DESK_CAMERA.y.toFixed(2)},${DESK_CAMERA.z.toFixed(2)}))*(cardDepth/${frame.distance.toFixed(3)}));
    diffuseColor.rgb=mix(diffuseColor.rgb,shadeTexel.rgb*diffuse,clamp((1.0-coverage)/${(1-IMPOSTOR_SHADE_COVER).toFixed(3)},0.0,1.0));
    diffuseColor.rgb*=vec3(${frame.colorGain.map(v=>v.toFixed(3)).join(',')});`)
    .replace('#include <colorspace_fragment>','')
    .replace('#include <fog_fragment>',ShaderChunk.fog_fragment.replaceAll('vFogDepth','(vFogDepth+cardDepth)'));
  };
  material.customProgramCacheKey=()=>`ancient-impostor-v1-${frame.distance}-${frame.depthRange}-${frame.colorGain.join('-')}${light.arrival?'-arrival':''}`;applyWorldWind(material,light,tree.height,.42);
  if(light.arrival)arrivalShaded.add(material);
  const origin=distantPosition([tree.x,floorY+worldHeight(tree.x,tree.z)-.45,tree.z]);
  const mesh=new Mesh(geometry,material);mesh.name='ancient-tree-impostor';mesh.position.set(...origin);mesh.rotation.y=impostorYaw(origin);mesh.raycast=()=>{};
  return {mesh,dispose:()=>{geometry.dispose();material.dispose();sun.dispose();shade.dispose();}};
 }),[sources,light,floorY]);
 useEffect(()=>()=>cards.forEach(c=>c.dispose()),[cards]);
 return <group name="ancient-tree-impostors">{cards.map(c=><primitive key={c.mesh.uuid} object={c.mesh} dispose={null}/>)}</group>;
}
