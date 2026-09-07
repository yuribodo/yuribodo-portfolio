"use client";

import { useGLTF, useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import {
  Color,
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
      <OptionalModel url={WORLD_ASSETS.aincrad} position={[-35, -7, -110]} scale={1.15} distant />
      <OptionalModel url={WORLD_ASSETS.chess} position={[49, -10, -180]} scale={2.5} rotation={[0, -0.12, 0]} distant />
      <OptionalModel url={WORLD_ASSETS.academy} position={[-12, -15, 130]} scale={1.7} rotation={[0, Math.PI, 0]} distant />
      <OptionalModel url={WORLD_ASSETS.islands} distant />
      <Slime floorY={floorY} active={active} />
      <WorldBoundary><Suspense fallback={null}><CloudWisps active={active} /></Suspense></WorldBoundary>
    </group>
  );
}
