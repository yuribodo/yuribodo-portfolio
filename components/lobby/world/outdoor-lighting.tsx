"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { ShaderChunk, type MeshStandardMaterial } from "three";

export const SUN_POSITION: [number, number, number] = [-52, 64, 38];
export const SUN_GLSL = "normalize(vec3(-52.0, 64.0, 38.0))";
export interface OutdoorLight { time: { value: number }; advance: (delta: number) => void }
const LightContext = createContext<OutdoorLight | null>(null);

/** One clock per world, including asynchronously loaded materials. */
export function OutdoorLighting({ active, children }: { active: boolean; children: ReactNode }) {
  const light = useMemo(() => {
    const time = { value: 0 };
    return { time, advance: (delta: number) => { time.value += Math.min(delta, .1); } };
  }, []);
  useFrame((_, delta) => { if (active) light.advance(delta); });
  return <LightContext.Provider value={light}>{children}</LightContext.Provider>;
}
export function useOutdoorLight() {
  const light = useContext(LightContext);
  if (!light) throw new Error("Outdoor material requires OutdoorLighting");
  return light;
}

// A projected, low-frequency cloud cover approximation. It attenuates sunlight,
// leaving sky fill and reflections intact; it is not a dark albedo overlay.
export const cloudShader = `
  uniform float outdoorTime;
  varying vec3 vOutdoorPosition;
  float cloudHash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float cloudNoise(vec2 p) {
    vec2 cell=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(cloudHash(cell),cloudHash(cell+vec2(1,0)),f.x),
      mix(cloudHash(cell+vec2(0,1)),cloudHash(cell+vec2(1,1)),f.x),f.y);
  }
  float cloudVisibility(vec3 world) {
    vec3 sun=${SUN_GLSL};
    vec2 projected=world.xz-sun.xz/sun.y*world.y;
    vec2 p=projected*.014+vec2(3.4,7.8)-vec2(outdoorTime*.011,outdoorTime*.004);
    float cover=cloudNoise(p)*.72+cloudNoise(p*2.13+5.7)*.28;
    return mix(1.0,.38,smoothstep(.43,.64,cover));
  }
`;

/** Compose with the material's existing wind/pigment shader. */
export function applyOutdoorLight<T extends MeshStandardMaterial>(material: T, light: OutdoorLight, translucency = 0): T {
  const previous = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms.outdoorTime = light.time;
    shader.vertexShader = "varying vec3 vOutdoorPosition;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <project_vertex>", `
      #include <project_vertex>
      vec4 outdoorPosition=vec4(transformed,1.0);
      #ifdef USE_BATCHING
        outdoorPosition=batchingMatrix*outdoorPosition;
      #endif
      #ifdef USE_INSTANCING
        outdoorPosition=instanceMatrix*outdoorPosition;
      #endif
      vOutdoorPosition=(modelMatrix*outdoorPosition).xyz;
    `);
    shader.fragmentShader = cloudShader + shader.fragmentShader;
    // Only the front vista was expanded. Keep the rear valley's original
    // atmospheric falloff instead of clearing its horizon with the new range.
    shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',
      ShaderChunk.fog_fragment.replaceAll('vFogDepth','(vFogDepth * mix(1.0,3.15,smoothstep(0.0,60.0,vOutdoorPosition.z)))'));
    let lighting = ShaderChunk.lights_fragment_begin;
    const start = lighting.indexOf("#if ( NUM_DIR_LIGHTS > 0 )");
    const end = lighting.indexOf("#if ( NUM_RECT_AREA_LIGHTS > 0 )");
    let sunlight = lighting.slice(start, end);
    sunlight = sunlight.replace("DirectionalLight directionalLight;", "DirectionalLight directionalLight; float outdoorSun; float throughLeaf; float wrappedLight;");
    sunlight = sunlight.replace("getDirectionalLightInfo( directionalLight, directLight );", `
      getDirectionalLightInfo( directionalLight, directLight );
      outdoorSun=step(.99,dot(directLight.direction,normalize(mat3(viewMatrix)*${SUN_GLSL})));
      directLight.color*=mix(1.0,cloudVisibility(vOutdoorPosition),outdoorSun);
    `);
    if (translucency > 0) sunlight = sunlight.replace(
      "RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );", `
      RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
      // Thin-leaf transmission: follows the light, view and shadow, never emissive.
      throughLeaf=pow(saturate(dot(geometryViewDir,-directLight.direction)),3.0);
      wrappedLight=saturate((dot(geometryNormal,directLight.direction)+.55)/1.55);
      reflectedLight.directDiffuse+=material.diffuseColor*directLight.color*
        (throughLeaf*.7+wrappedLight*.3)*${translucency.toFixed(3)}*outdoorSun;
    `);
    lighting = lighting.slice(0, start) + sunlight + lighting.slice(end);
    shader.fragmentShader = shader.fragmentShader.replace("#include <lights_fragment_begin>", lighting);
  };
  material.customProgramCacheKey = () => `${previousKey}-outdoor-light-v2-${translucency}`;
  return material;
}
