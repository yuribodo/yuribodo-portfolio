import { MeshDepthMaterial, RGBADepthPacking, type MeshStandardMaterial, type Material } from "three";
import type { OutdoorLight } from "./outdoor-lighting";

/** A gust travels across the landscape; yawed instances still bend downwind. */
export const windFunctions = `
  uniform float worldWindTime;
  vec3 meadowWind(vec3 point) {
    vec2 direction=normalize(vec2(.94,.35));
    float wave=sin(dot(point.xz,direction)*.32-worldWindTime*1.7);
    float pulse=smoothstep(-.65,.85,sin(dot(point.xz,direction)*.075-worldWindTime*.62));
    float strength=.22+pulse*(.45+.28*wave);
    return vec3(direction.x*strength,0.0,direction.y*strength);
  }
`;

export function applyWorldWind<T extends Material>(material:T,light:OutdoorLight,height:number,bend:number,flutter=0):T {
  const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
  material.onBeforeCompile=(shader,renderer)=>{
    previous.call(material,shader,renderer);
    shader.uniforms.worldWindTime=light.time;
    shader.vertexShader=windFunctions+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`
      #include <begin_vertex>
      mat4 plantTransform=modelMatrix;
      #ifdef USE_INSTANCING
        plantTransform=modelMatrix*instanceMatrix;
      #endif
      vec3 root=plantTransform[3].xyz;
      vec3 wind=meadowWind(root);
      float tip=pow(clamp(position.y/${height.toFixed(3)},0.0,1.0),1.6);
      wind*=tip*${bend.toFixed(3)};
      wind.x+=sin(worldWindTime*5.0+position.x*3.0+position.y*2.0+root.z)*tip*${flutter.toFixed(3)};
      // Inverse of the instance's orthogonal rotation/scale basis.
      transformed+=vec3(dot(wind,plantTransform[0].xyz)/dot(plantTransform[0].xyz,plantTransform[0].xyz),
        dot(wind,plantTransform[1].xyz)/dot(plantTransform[1].xyz,plantTransform[1].xyz),
        dot(wind,plantTransform[2].xyz)/dot(plantTransform[2].xyz,plantTransform[2].xyz));
    `);
  };
  material.customProgramCacheKey=()=>`${key}-travelling-wind-v1-${height}-${bend}-${flutter}`;
  return material;
}

/** The shadow silhouette bends with the visible leaves, using the same alpha. */
export function windDepth(source:MeshStandardMaterial,light:OutdoorLight,height:number,bend:number,flutter=0){
  return applyWorldWind(new MeshDepthMaterial({depthPacking:RGBADepthPacking,map:source.map,
    alphaMap:source.alphaMap,alphaTest:source.alphaTest,side:source.side}),light,height,bend,flutter);
}
