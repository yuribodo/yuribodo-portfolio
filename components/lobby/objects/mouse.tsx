"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AdditiveBlending,
  Box3,
  Color,
  MeshStandardMaterial,
  ShaderMaterial,
  Vector3,
} from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type {
  Group,
  Mesh,
  MeshStandardMaterial as MeshStandardMaterialType,
  Object3D,
} from "three";

import { useObjectHover } from "@/hooks/use-object-hover";
import { LOBBY_MODELS } from "@/lib/lobby/assets";

// gimora's DeathAdder GLB is ~2.8m wide in raw model space and contains
// body + light + embedded pad in one scene. We size the whole assembly so
// the embedded pad lands at ~0.30m wide (real pad scale), putting the
// mouse at a believable size on top.
const ASSEMBLY_TARGET_WIDTH = 0.30;

// Mesh names from gltf-transform inspect — kept in one place so a model swap
// makes the rename obvious.
const LIGHT_MESH_NAME = "light_light_0";
const BODY_MESH_NAME = "mouse_mouse_0";
const PAD_MESH_NAME = "mouse pad_mouse pad_0";

const HOVER_LIFT_Y = 0.05;
const HOVER_LIFT_DURATION_S = 0.25;

// RGB cycle per spec: green → blue → purple → green over 1.5s.
const CYCLE_DURATION_S = 1.5;
const HUE_GREEN = 0.33;
const HUE_BLUE = 0.66;
const HUE_PURPLE = 0.83;
// Wraps past 1.0 back to 0.33 (green). useFrame applies (% 1) to keep HSL happy.
const HUE_WRAP = 1.33;

// Idle baseline — a soft cyan-teal glow, like a powered-down Chroma device.
const IDLE_HUE = 0.50;
const IDLE_INTENSITY = 0.6;
const HOVER_INTENSITY = 1.2;
const CYCLE_INTENSITY = 2.4;
const SPILL_INTENSITY_IDLE = 0.18;
const SPILL_INTENSITY_HOVER = 0.55;
const SPILL_INTENSITY_CYCLE = 1.2;

const SPILL_RADIUS = 0.085;
// Lift the spill plane above the pad surface — avoids z-fighting with the
// embedded pad's normal map without being visible at the seated POV.
const SPILL_Y_OFFSET = 0.0015;

export interface MouseProps {
  /** Position of the whole assembly (body + light + pad). The mouse↔pad
   *  offset is fixed in the GLB and persists regardless of this prop. */
  position?: [number, number, number];
}

export default function Mouse({ position = [0, 0, 0] }: MouseProps) {
  const { scene } = useGLTF(LOBBY_MODELS.mouse);
  const groupRef = useRef<Group>(null);
  const spillMeshRef = useRef<Mesh>(null);
  const lightMaterialRef = useRef<MeshStandardMaterialType | null>(null);

  const { isHovered, bind: hoverBind } = useObjectHover();

  // Cycle drives off the render clock — mid-cycle re-renders don't desync
  // the hue. -1 is the "just clicked, capture clock on next tick" sentinel.
  const cycleStartRef = useRef<number | null>(null);
  const [isCycling, setIsCycling] = useState(false);

  // Live intensity values driven by hover/cycle tweens. Refs (not state)
  // because both update at 60fps via useFrame and GSAP onUpdate.
  const lightIntensityRef = useRef(IDLE_INTENSITY);
  const spillIntensityRef = useRef(SPILL_INTENSITY_IDLE);
  const intensityTweenRef = useRef<gsap.core.Tween | null>(null);
  const spillIntensityTweenRef = useRef<gsap.core.Tween | null>(null);
  const liftTweenRef = useRef<gsap.core.Tween | null>(null);

  // Shared between the light material's emissive and the spill shader's
  // uColor — useFrame mutates this once per tick.
  const currentColour = useMemo(() => new Color().setHSL(IDLE_HUE, 0.9, 0.5), []);

  const spillUniforms = useMemo(
    () => ({
      uColor: { value: currentColour },
      uIntensity: { value: SPILL_INTENSITY_IDLE },
    }),
    [currentColour],
  );

  const spillMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: spillUniforms,
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uIntensity;
          varying vec2 vUv;
          void main() {
            float d = length(vUv - vec2(0.5));
            // Soft radial falloff; pow biases it toward a lit-from-point look
            // rather than a flat disc.
            float a = pow(smoothstep(0.5, 0.0, d), 1.6);
            gl_FragColor = vec4(uColor * uIntensity, a);
          }
        `,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    [spillUniforms],
  );

  useLayoutEffect(() => {
    scene.scale.setScalar(1);
    scene.position.set(0, 0, 0);
    scene.rotation.set(0, 0, 0);

    const rawBox = new Box3().setFromObject(scene);
    const rawSize = new Vector3();
    rawBox.getSize(rawSize);

    const scale = ASSEMBLY_TARGET_WIDTH / rawSize.x;
    scene.scale.setScalar(scale);

    // Position so the embedded pad's TOP surface lands at y=0 (desk surface),
    // and the pad's centre lands at the assembly's origin. We measure the
    // pad mesh specifically — the whole-scene min would sink the assembly
    // into the desk because the mouse extends above it.
    let padTopY = 0;
    let padCentreX = 0;
    let padCentreZ = 0;
    const tmpBox = new Box3();
    const tmpVec = new Vector3();

    scene.traverse((obj: Object3D) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      if (mesh.name === PAD_MESH_NAME) {
        tmpBox.setFromObject(mesh);
        padTopY = tmpBox.max.y;
        tmpBox.getCenter(tmpVec);
        padCentreX = tmpVec.x;
        padCentreZ = tmpVec.z;
      }
    });
    scene.position.set(-padCentreX, -padTopY, -padCentreZ);

    let bodyCentreX = 0;
    let bodyCentreZ = 0;

    scene.traverse((obj: Object3D) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (mesh.name === LIGHT_MESH_NAME) {
        // Light mesh ships with an empty material — swap for a driveable one.
        const lightMat = new MeshStandardMaterial({
          color: new Color("#050505"),
          emissive: currentColour,
          emissiveIntensity: IDLE_INTENSITY,
          roughness: 0.4,
          metalness: 0,
        });
        mesh.material = lightMat;
        lightMaterialRef.current = lightMat;
        return;
      }

      if (mesh.name === BODY_MESH_NAME) {
        // Mouse body's xz centre, expressed in scene-local space — i.e.,
        // where the body sits relative to the GLB's root. getWorldPosition
        // includes the group's prop-applied position, which we then strip
        // by subtracting scene's world position.
        tmpBox.setFromObject(mesh);
        tmpBox.getCenter(tmpVec);
        const sceneWorld = new Vector3();
        scene.getWorldPosition(sceneWorld);
        bodyCentreX = tmpVec.x - sceneWorld.x;
        bodyCentreZ = tmpVec.z - sceneWorld.z;
      }
    });

    // Re-parent the spill plane into scene so it inherits the same transform
    // chain as the mouse body. Position it in scene-local space at the body
    // centre (the same coord frame we just resolved). This makes the spill
    // track the mouse correctly regardless of the wrapping group's position.
    const spillMesh = spillMeshRef.current;
    if (spillMesh) {
      if (spillMesh.parent !== scene) scene.add(spillMesh);
      spillMesh.position.set(bodyCentreX, SPILL_Y_OFFSET, bodyCentreZ);
      spillMesh.rotation.set(-Math.PI / 2, 0, 0);
    }

    return () => {
      lightMaterialRef.current?.dispose();
      lightMaterialRef.current = null;
    };
  }, [scene, currentColour]);

  // Hover → intensity boost + 0.05u lift. Skipped mid-cycle (the cycle owns
  // intensity then) — the hover flag still drives the lift independently.
  useEffect(() => {
    if (!isCycling) {
      intensityTweenRef.current?.kill();
      intensityTweenRef.current = gsap.to(lightIntensityRef, {
        current: isHovered ? HOVER_INTENSITY : IDLE_INTENSITY,
        duration: 0.2,
        ease: "power2.out",
      });
      spillIntensityTweenRef.current?.kill();
      spillIntensityTweenRef.current = gsap.to(spillIntensityRef, {
        current: isHovered ? SPILL_INTENSITY_HOVER : SPILL_INTENSITY_IDLE,
        duration: 0.2,
        ease: "power2.out",
      });
    }

    liftTweenRef.current?.kill();
    if (groupRef.current) {
      const baseY = position[1] ?? 0;
      liftTweenRef.current = gsap.to(groupRef.current.position, {
        y: baseY + (isHovered ? HOVER_LIFT_Y : 0),
        duration: HOVER_LIFT_DURATION_S,
        ease: "power3.out",
      });
    }
  }, [isHovered, isCycling, position]);

  useEffect(() => {
    return () => {
      intensityTweenRef.current?.kill();
      spillIntensityTweenRef.current?.kill();
      liftTweenRef.current?.kill();
    };
  }, []);

  useFrame(({ clock }) => {
    const lightMat = lightMaterialRef.current;
    if (!lightMat) return;

    // Promote the click sentinel to the current clock once a real frame ticks
    // — keeps cycle progress tied to the render clock, not RAF.
    if (cycleStartRef.current === -1) {
      cycleStartRef.current = clock.elapsedTime;
    }

    let hue = IDLE_HUE;
    let lightIntensity = lightIntensityRef.current;
    let spillIntensity = spillIntensityRef.current;

    const start = cycleStartRef.current;
    if (start !== null && start >= 0) {
      const elapsed = clock.elapsedTime - start;
      const t = elapsed / CYCLE_DURATION_S;
      if (t >= 1) {
        cycleStartRef.current = null;
        setIsCycling(false);
      } else {
        // Three equal segments: green → blue, blue → purple, purple → green.
        let h: number;
        if (t < 1 / 3) {
          h = HUE_GREEN + (HUE_BLUE - HUE_GREEN) * (t * 3);
        } else if (t < 2 / 3) {
          h = HUE_BLUE + (HUE_PURPLE - HUE_BLUE) * ((t - 1 / 3) * 3);
        } else {
          h = HUE_PURPLE + (HUE_WRAP - HUE_PURPLE) * ((t - 2 / 3) * 3);
        }
        hue = h % 1;
        // Bell envelope on intensity — ramps in over first 10%, holds, ramps
        // out over last 15%. Avoids the colour appearing to "pop" on/off.
        let env: number;
        if (t < 0.1) env = t / 0.1;
        else if (t > 0.85) env = (1 - t) / 0.15;
        else env = 1;
        lightIntensity = IDLE_INTENSITY + (CYCLE_INTENSITY - IDLE_INTENSITY) * env;
        spillIntensity =
          SPILL_INTENSITY_IDLE +
          (SPILL_INTENSITY_CYCLE - SPILL_INTENSITY_IDLE) * env;
      }
    }

    currentColour.setHSL(hue, 0.9, 0.5);
    lightMat.emissive.copy(currentColour);
    lightMat.emissiveIntensity = lightIntensity;
    spillUniforms.uIntensity.value = spillIntensity;
  });

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (isCycling) return;
    setIsCycling(true);
    cycleStartRef.current = -1;
  };

  return (
    <group ref={groupRef} position={position} onClick={handleClick} {...hoverBind}>
      <primitive object={scene} />
      <mesh
        ref={spillMeshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        material={spillMaterial}
      >
        <planeGeometry args={[SPILL_RADIUS * 2, SPILL_RADIUS * 2]} />
      </mesh>
    </group>
  );
}
