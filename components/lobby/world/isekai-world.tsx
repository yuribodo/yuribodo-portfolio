"use client";

import {RiverLandings} from './river-landings';
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import {
  Color,
  DoubleSide,
  PlaneGeometry,
  Mesh,
  MeshBasicMaterial,
  type Group,
  type MeshStandardMaterial,
} from "three";
import { WORLD_ASSETS } from "@/lib/lobby/world-assets";
import { WorldBoundary } from "./world-boundary";
import { TerraceTerrain, ValleyCliffs } from "./art-directed-terrace";

import { SkyIsland, SkyGarden } from "./sky-islands";
import { VistaStreams } from "./vista-streams";
import { CitadelDistricts } from "./citadel-districts";
import { FlowerColonies } from "./flower-colonies";
import { DistantCanopies } from "./distant-canopies";
import { OrganicVegetation } from "./organic-vegetation";
import { AncientTrees,EnchantedGroves } from "./fantasy-landmarks";
import { FantasyResidents } from "./fantasy-residents";
import { ValleyCreatures } from "./valley-creatures";
import { ValleyWildlife } from "./valley-wildlife";
import { MeadowLife } from "./meadow-life";
import { NaturalVegetation } from "./natural-vegetation";
import { LivingValley } from "./living-valley";
import { worldHeight } from "@/lib/lobby/world-geography";
import { OutdoorLighting, applyOutdoorLight, useOutdoorLight } from "./outdoor-lighting";
import { Atmosphere } from "./atmosphere";
import { ValleyVillage } from "./valley-village";
import { TerraceGarden } from "./terrace-garden";
import { TerraceArchitecture } from "./terrace-architecture";

interface WorldProps {
  floorY: number;
  active: boolean;
}

function ArchitecturalModel({ url, position, scale = 1, rotation = [0, 0, 0] }: {
  url: string; position: [number, number, number]; scale?: number; rotation?: [number, number, number];
}) {
  const light = useOutdoorLight();
  const { scene } = useGLTF(url);
  const { model, materials } = useMemo(() => {
    const model = scene.clone(true);
    const materials = new Map<MeshStandardMaterial, MeshStandardMaterial>();
    model.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.raycast = () => {};
      if(url===WORLD_ASSETS.chess&&/Eroded.island.shell|Island.crown|Island.tree/.test(object.name))object.visible=false;
      object.castShadow = object.receiveShadow = false;
      const adapt = (source: MeshStandardMaterial) => {
        if (materials.has(source)) return materials.get(source)!;
        const material = source.clone();
        material.envMapIntensity = 0.12;
        material.metalness = 0;
        material.roughness = 1;
        // All distant architecture shares matte pigments and colored recesses.
        const palette: Record<string, string> = {
          "Citadel limestone": "#c1c5b1", "Cut silver edges": "#a1b3ae",
          "Blue patinated metal": "#648797", "Gallery shadows": "#455f6b",
          "Aged brass details": "#a9ada0", "Window glass": "#658894",
          "Terrace gardens": "#668b49",
        };
        if (palette[source.name]) material.color.set(palette[source.name]);
        if (source.name === "Chess marble") {
          material.color.set("#9385b5"); material.roughness = 1; material.metalness = 0;
          material.roughnessMap = null; material.metalnessMap = null;
        }
        if (source.name === "Tree_Leaves") {
          material.color.set("#648747"); material.transparent = false; material.depthWrite = true;
          material.alphaTest = 0.4; material.alphaToCoverage = true; material.side = DoubleSide;
        }
        if (source.name === "Island rock") {
          material.color.set("#b7c4c4"); material.normalScale.setScalar(0.12);
          material.onBeforeCompile = (shader) => {
            shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `
              #ifdef USE_MAP
                vec3 rock = texture2D(map, vMapUv).rgb;
                float value = dot(rock, vec3(0.2126, 0.7152, 0.0722));
                vec3 pigment = mix(vec3(0.34, 0.41, 0.45), vec3(0.58, 0.63, 0.60), smoothstep(0.01, 0.6, value));
                diffuseColor.rgb *= pigment;
              #endif
            `);
          };
          material.customProgramCacheKey = () => "geological-island-paint-v1";
        }
        applyOutdoorLight(material, light);
        materials.set(source, material);
        return material;
      };
      object.material = Array.isArray(object.material) ? object.material.map(adapt) : adapt(object.material as MeshStandardMaterial);
    });
    return { model, materials };
  }, [scene, light, url]);
  useEffect(() => () => { for (const material of materials.values()) material.dispose(); }, [materials]);
  return <primitive object={model} position={position} scale={scale} rotation={rotation} dispose={null} />;
}

function Waterfall({ position, width, height, active }: {
  position: [number, number, number]; width: number; height: number; active: boolean;
}) {
  const time = useRef(0);
  const { geometry, material, updateFlow } = useMemo(() => {
    const geometry = new PlaneGeometry(width, height, 8, 32);
    const vertex = geometry.attributes.position;
    for (let i = 0; i < vertex.count; i++) {
      const fall = (height / 2 - vertex.getY(i)) / height;
      vertex.setX(i, vertex.getX(i) * (0.75 + fall * 0.65));
      vertex.setZ(i, 0.12 * Math.sin(fall * 7) + fall * fall * 0.5);
    }
    const flow = { value: 0 };
    const material = new MeshBasicMaterial({ color: "#b5e3eb", transparent: true, side: DoubleSide, depthWrite: false });
    material.userData.worldBaseColor = new Color("#b5e3eb");
    material.onBeforeCompile = (shader) => {
      shader.uniforms.fallTime = flow;
      shader.vertexShader = "varying vec2 vFallUv;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n vFallUv = uv;");
      shader.fragmentShader = "varying vec2 vFallUv; uniform float fallTime;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", `
        #include <color_fragment>
        float strand = pow(0.5 + 0.5 * sin(vFallUv.x * 75.0 + sin(vFallUv.y * 9.0 + fallTime * 2.0)), 3.0);
        float streak = 0.5 + 0.5 * sin(vFallUv.y * 90.0 + fallTime * 10.0 + vFallUv.x * 20.0);
        float edges = smoothstep(0.0, 0.15, vFallUv.x) * smoothstep(0.0, 0.15, 1.0 - vFallUv.x);
        diffuseColor.rgb *= 0.7 + strand * 0.3;
        diffuseColor.a = edges * smoothstep(0.0, 0.12, vFallUv.y) * (0.36 + strand * 0.42 + streak * 0.12);
      `);
    };
    material.customProgramCacheKey = () => "skybound-waterfall-v1";
    return { geometry, material, updateFlow: (time: number) => { flow.value = time; } };
  }, [width, height]);
  useFrame((_, delta) => { if (active) { time.current += Math.min(delta, 0.1); updateFlow(time.current); } });
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  return <mesh geometry={geometry} material={material} position={position} raycast={() => {}} />;
}

function ChessMonuments() {
  return <group position={[270, worldHeight(90,-320)-1.2, -960]} rotation={[0, -0.67, 0]} scale={7.5}>
    <ArchitecturalModel url={WORLD_ASSETS.chess} position={[0, 0, 0]} />

  </group>;
}


/** Used by the shared transition dimmer, including non-light-driven paint. */
export function dimWorldMaterials(group: Group, ratio: number) {
  group.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      material.userData.setWorldDimmer?.(ratio);
      const painted = material as MeshStandardMaterial;
      if (typeof material.userData.worldEmissive === "number") {
        painted.emissiveIntensity = material.userData.worldEmissive * ratio;
      }
      if (material instanceof MeshBasicMaterial && material.userData.worldBaseColor) {
        material.color.copy(material.userData.worldBaseColor).multiplyScalar(ratio);
      }
    }
  });
}

export default function IsekaiWorld({ floorY, active }: WorldProps) {
  return (
    <OutdoorLighting active={active}><group name="isekai-world">
      <WorldBoundary><Suspense fallback={null}><Atmosphere active={active} /></Suspense></WorldBoundary>
      <WorldBoundary><ValleyWildlife floorY={floorY} /></WorldBoundary>
      <WorldBoundary><Suspense fallback={null}><ValleyCreatures /></Suspense></WorldBoundary>
      <WorldBoundary><Suspense fallback={null}><AncientTrees floorY={floorY}/></Suspense></WorldBoundary>
      <WorldBoundary><EnchantedGroves floorY={floorY}/></WorldBoundary>
      <WorldBoundary><FantasyResidents floorY={floorY}/></WorldBoundary>
      <WorldBoundary><VistaStreams floorY={floorY} /></WorldBoundary>
      <WorldBoundary><RiverLandings floorY={floorY}/></WorldBoundary>
      <WorldBoundary><Suspense fallback={null}><ValleyVillage floorY={floorY} /></Suspense></WorldBoundary>
      <WorldBoundary><Suspense fallback={null}><LivingValley floorY={floorY} active={active} /></Suspense></WorldBoundary>
      <WorldBoundary><Suspense fallback={null}><NaturalVegetation floorY={floorY} /></Suspense></WorldBoundary>
      <WorldBoundary><Suspense fallback={null}><OrganicVegetation floorY={floorY} /></Suspense></WorldBoundary>
      <WorldBoundary><Suspense fallback={null}><DistantCanopies floorY={floorY} /></Suspense></WorldBoundary>
      <WorldBoundary><Suspense fallback={null}><FlowerColonies floorY={floorY} /></Suspense></WorldBoundary>
      <WorldBoundary><MeadowLife floorY={floorY} /></WorldBoundary>
      {/* Always-available ground makes missing optional assets graceful. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY - 0.2, 0.5]} receiveShadow>
        <planeGeometry args={[6, 6]} />
        <meshToonMaterial color="#849265" />
      </mesh>
      <WorldBoundary><Suspense fallback={null}><TerraceTerrain floorY={floorY} /></Suspense></WorldBoundary>
      <WorldBoundary><Suspense fallback={null}><TerraceArchitecture floorY={floorY} /></Suspense></WorldBoundary>
      <WorldBoundary><Suspense fallback={null}><TerraceGarden floorY={floorY} /></Suspense></WorldBoundary>
      <WorldBoundary><Suspense fallback={null}><ValleyCliffs floorY={floorY} /></Suspense></WorldBoundary>
      <WorldBoundary><Suspense fallback={null}><group position={[-282, 65, -930]} scale={4.6} rotation={[0,.12,0]}><ArchitecturalModel url={WORLD_ASSETS.aincrad} position={[0,0,0]} /><CitadelDistricts /><SkyGarden terraces /></group></Suspense></WorldBoundary>
      <WorldBoundary><Suspense fallback={null}><ChessMonuments /></Suspense></WorldBoundary>
      <WorldBoundary><Suspense fallback={null}>
        <group position={[150,55,-850]} scale={1.7} rotation={[0,-.5,0]}><SkyIsland /><SkyGarden /></group>
        <group position={[-480,45,-1200]} scale={1.8} rotation={[0,1.8,0]}><SkyIsland /><SkyGarden /></group>
        <Waterfall position={[158,29,-835]} width={2.2} height={52} active={active}/>
      </Suspense></WorldBoundary>
    </group></OutdoorLighting>
  );
}
