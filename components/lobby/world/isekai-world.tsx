"use client";

import { useGLTF, useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import {
  Color,
  DoubleSide,
  PlaneGeometry,
  BackSide,
  DataTexture,
  EquirectangularReflectionMapping,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  RedFormat,
  RepeatWrapping,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  type Group,
  type MeshStandardMaterial,
} from "three";
import { WORLD_ASSETS } from "@/lib/lobby/world-assets";
import { WorldBoundary } from "./world-boundary";
import { AuthoredNature, AuthoredRuins, TerracePaving, TerraceTerrain, ValleyCliffs } from "./art-directed-terrace";

interface WorldProps {
  floorY: number;
  active: boolean;
}

function PaintedSky() {
  const scene = useThree((s) => s.scene);
  const material = useRef<MeshBasicMaterial>(null);
  const geometry = useMemo(() => {
    const geometry = new SphereGeometry(450, 96, 48);
    // The terrace overlooks the valley from above: raise the painted land
    // band uniformly at every longitude, keeping both poles continuous.
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const v = uv.getY(i);
      uv.setY(i, v - 0.035 * Math.sin(v * Math.PI));
    }
    return geometry;
  }, []);

  useEffect(() => {
    let disposed = false;
    const previousEnvironment = scene.environment;
    // A failed panorama leaves the base sky color and all 3D scenery usable.
    const texture = new TextureLoader().load(
      WORLD_ASSETS.panorama,
      (loaded) => {
        if (disposed) return;
        loaded.colorSpace = SRGBColorSpace;
        loaded.mapping = EquirectangularReflectionMapping;
        loaded.minFilter = LinearFilter;
        loaded.generateMipmaps = false;
        scene.environment = loaded;
        if (material.current) {
          material.current.map = loaded;
          material.current.color.set("white").multiplyScalar(scene.userData.worldDimmer ?? 1);
          material.current.userData.worldBaseColor = new Color("white");
          material.current.needsUpdate = true;
        }
      },
      undefined,
      () => console.warn("[lobby] Panorama unavailable; using the base sky."),
    );
    return () => {
      disposed = true;
      if (scene.environment === texture) scene.environment = previousEnvironment;
      texture.dispose();
    };
  }, [scene]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} renderOrder={-10} raycast={() => {}}>
      <meshBasicMaterial ref={material} side={BackSide} color="#85bed8" fog={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** A higher-detail forward painting sits inside the complete sky sphere.
 * Its feathered edges blend into the panorama when turning to the sides. */
function PaintedLandscape({ rear = false }: { rear?: boolean }) {
  const texture = useTexture(rear ? WORLD_ASSETS.rearLandscape : WORLD_ASSETS.frontLandscape, (loaded) => {
    for (const texture of Array.isArray(loaded) ? loaded : [loaded]) texture.colorSpace = SRGBColorSpace;
  });
  const scene = useThree((s) => s.scene);
  const material = useMemo(() => {
    const material = new MeshBasicMaterial({ map: texture, transparent: true, fog: false, depthWrite: false, toneMapped: false });
    material.userData.worldBaseColor = new Color("white");
    material.color.multiplyScalar(scene.userData.worldDimmer ?? 1);
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        "#include <map_fragment>\n diffuseColor.a *= smoothstep(0.0, 0.06, vMapUv.x) * smoothstep(0.0, 0.06, 1.0 - vMapUv.x) * smoothstep(0.0, 0.05, vMapUv.y) * smoothstep(0.0, 0.05, 1.0 - vMapUv.y);",
      );
    };
    material.customProgramCacheKey = () => "world-feathered-matte-v1";
    return material;
  }, [texture, scene]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh position={[0, -20, rear ? 250 : -250]} rotation={[0, rear ? Math.PI : 0, 0]} material={material} renderOrder={-5} raycast={() => {}}>
      <planeGeometry args={[540, 304]} />
    </mesh>
  );
}

function PaintedModel({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  distant = false,
}: {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  distant?: boolean;
}) {
  const { scene } = useGLTF(url);
  const { model, material, ramp } = useMemo(() => {
    const ramp = new DataTexture(new Uint8Array([115, 185, 255]), 3, 1, RedFormat);
    ramp.minFilter = NearestFilter;
    ramp.magFilter = NearestFilter;
    ramp.needsUpdate = true;
    const material = new MeshToonMaterial({
      vertexColors: true,
      gradientMap: ramp,
      // Small painted fill keeps shadow bands colored, never black.
      emissive: new Color(distant ? "#34475a" : "#252d22"),
      emissiveIntensity: distant ? 0.24 : 0.12,
    });
    material.userData.worldEmissive = material.emissiveIntensity;
    const model = scene.clone(true);
    model.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.material = material;
      object.castShadow = !distant;
      object.receiveShadow = !distant;
      object.raycast = () => {}; // Decorative scenery never intercepts the desk.
    });
    return { model, material, ramp };
  }, [scene, distant]);

  useEffect(() => () => { material.dispose(); ramp.dispose(); }, [material, ramp]);

  useEffect(() => {
    if (distant) return;
    let disposed = false;
    const texture = new TextureLoader().load("/lobby/world/limestone.webp", (loaded) => {
      if (disposed) return;
      loaded.colorSpace = SRGBColorSpace;
      loaded.wrapS = loaded.wrapT = RepeatWrapping;
      loaded.repeat.set(0.7, 0.7);
      material.map = loaded;
      material.needsUpdate = true;
    }, undefined, () => {});
    return () => { disposed = true; texture.dispose(); };
  }, [material, distant]);

  return <primitive object={model} position={position} rotation={rotation} scale={scale} dispose={null} />;
}

function ArchitecturalModel({ url, position, scale = 1, rotation = [0, 0, 0] }: {
  url: string; position: [number, number, number]; scale?: number; rotation?: [number, number, number];
}) {
  const { scene } = useGLTF(url);
  const { model, materials } = useMemo(() => {
    const model = scene.clone(true);
    const materials = new Map<MeshStandardMaterial, MeshStandardMaterial>();
    model.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.raycast = () => {};
      object.castShadow = object.receiveShadow = false;
      const adapt = (source: MeshStandardMaterial) => {
        if (materials.has(source)) return materials.get(source)!;
        const material = source.clone();
        material.envMapIntensity = 0.55;
        if (source.name === "Chess marble") {
          material.color.set("#b49bcf"); material.roughness = 0.4; material.metalness = 0.12;
        }
        if (source.name === "Tree_Leaves") {
          material.color.set("#648747"); material.transparent = false; material.depthWrite = true;
          material.alphaTest = 0.4; material.alphaToCoverage = true; material.side = DoubleSide;
        }
        if (source.name === "Island rock") {
          material.color.set("#b6bab4"); material.normalScale.setScalar(0.55);
          material.onBeforeCompile = (shader) => {
            shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `
              #ifdef USE_MAP
                vec3 rock = texture2D(map, vMapUv).rgb;
                float value = dot(rock, vec3(0.2126, 0.7152, 0.0722));
                vec3 pigment = mix(vec3(0.18, 0.23, 0.24), vec3(0.53, 0.57, 0.49), smoothstep(0.01, 0.6, value));
                diffuseColor.rgb *= pigment;
              #endif
            `);
          };
          material.customProgramCacheKey = () => "geological-island-paint-v1";
        }
        materials.set(source, material);
        return material;
      };
      object.material = Array.isArray(object.material) ? object.material.map(adapt) : adapt(object.material as MeshStandardMaterial);
    });
    return { model, materials };
  }, [scene]);
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

function ChessMonuments({ active }: { active: boolean }) {
  return <group position={[49, -7, -170]} rotation={[0, -0.18, 0]} scale={1.8}>
    <ArchitecturalModel url={WORLD_ASSETS.chess} position={[0, 0, 0]} />
    <Waterfall position={[-6.8, -6.2, 5.3]} width={0.9} height={12.5} active={active} />
    <Waterfall position={[3.5, -4.5, 8.1]} width={0.48} height={9.2} active={active} />
  </group>;
}


function OptionalModel(props: Parameters<typeof PaintedModel>[0]) {
  return <WorldBoundary><Suspense fallback={null}><PaintedModel {...props} /></Suspense></WorldBoundary>;
}

function Slime({ floorY, active }: WorldProps) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current || !active) return;
    const breathe = Math.sin(clock.elapsedTime * 1.35) * 0.025;
    ref.current.scale.set(1 - breathe * 0.4, 1 + breathe, 1 - breathe * 0.4);
  });
  return (
    <group position={[2.5, floorY + 0.17, -2.3]} rotation={[0, -0.35, 0]} scale={0.88}>
      <group ref={ref}>
        <mesh castShadow scale={[0.34, 0.24, 0.3]}>
          <sphereGeometry args={[1, 48, 32]} />
          <meshPhysicalMaterial color="#61c4ed" roughness={0.28} clearcoat={1} clearcoatRoughness={0.18} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.115, 0.015, 0.274]} rotation={[0, 0, Math.PI / 2 + side * -0.18]}>
            <capsuleGeometry args={[0.007, 0.065, 3, 6]} />
            <meshToonMaterial color="#275d7f" />
          </mesh>
        ))}
        <mesh position={[-0.085, 0.158, 0.192]} rotation={[-0.55, -0.2, -0.4]} scale={[0.075, 0.023, 0.006]}>
          <sphereGeometry args={[1, 16, 8]} />
          <meshToonMaterial color="#e6fbff" />
        </mesh>
      </group>
    </group>
  );
}

function CloudWisps({ active }: { active: boolean }) {
  const ref = useRef<Group>(null);
  const texture = useTexture("/lobby/world/cloud.webp", (loaded) => {
    for (const texture of Array.isArray(loaded) ? loaded : [loaded]) texture.colorSpace = SRGBColorSpace;
  });
  useFrame(({ clock }) => {
    if (ref.current && active) ref.current.position.x = Math.sin(clock.elapsedTime * 0.035) * 2;
  });
  return (
    <group ref={ref}>
      {[
        [-33, -9, -95, 26], [-47, -10, -110, 18], [43, -5, -132, 28], [9, 5, -154, 19],
      ].map(([x, y, z, size], i) => (
        <mesh key={i} position={[x, y, z]} scale={[size, size / 3, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={texture} transparent opacity={0.75} depthWrite={false} toneMapped={false} userData={{ worldBaseColor: new Color("white") }} />
        </mesh>
      ))}
    </group>
  );
}

/** Used by the shared transition dimmer, including non-light-driven paint. */
export function dimWorldMaterials(group: Group, ratio: number) {
  group.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
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
    <group name="isekai-world">
      <PaintedSky />
      <WorldBoundary><Suspense fallback={null}><PaintedLandscape /></Suspense></WorldBoundary>
      <WorldBoundary><Suspense fallback={null}><PaintedLandscape rear /></Suspense></WorldBoundary>
      {/* Always-available ground makes missing optional assets graceful. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY - 0.2, 0.5]} receiveShadow>
        <planeGeometry args={[6, 6]} />
        <meshToonMaterial color="#849265" />
      </mesh>
      <WorldBoundary><Suspense fallback={null}><TerraceTerrain floorY={floorY} /></Suspense></WorldBoundary>
      <WorldBoundary><Suspense fallback={null}><TerracePaving floorY={floorY} /></Suspense></WorldBoundary>
      <WorldBoundary><Suspense fallback={null}><AuthoredRuins floorY={floorY} /></Suspense></WorldBoundary>
      <WorldBoundary><Suspense fallback={null}><AuthoredNature floorY={floorY} active={active} /></Suspense></WorldBoundary>
      <WorldBoundary><Suspense fallback={null}><ValleyCliffs floorY={floorY} /></Suspense></WorldBoundary>
      <WorldBoundary><Suspense fallback={null}><ArchitecturalModel url={WORLD_ASSETS.aincrad} position={[-43, -7, -125]} scale={1.15} rotation={[0, 0.12, 0]} /></Suspense></WorldBoundary>
      <WorldBoundary><Suspense fallback={null}><ChessMonuments active={active} /></Suspense></WorldBoundary>
      <OptionalModel url={WORLD_ASSETS.academy} position={[-12, -15, 130]} scale={1.7} rotation={[0, Math.PI, 0]} distant />
      {[[-67, 3, -145, 0.5], [24, 5, -140, 0.38], [-6, 11, -165, 0.24], [65, 12, 90, 0.4], [-60, 7, 120, 0.5]].map(([x, y, z, scale], i) => (
        <WorldBoundary key={i}><Suspense fallback={null}><ArchitecturalModel url={WORLD_ASSETS.islands} position={[x, y, z]} scale={scale} rotation={[0, i * 1.6, 0]} /></Suspense></WorldBoundary>
      ))}
      <Slime floorY={floorY} active={active} />
      <WorldBoundary><Suspense fallback={null}><CloudWisps active={active} /></Suspense></WorldBoundary>
    </group>
  );
}
