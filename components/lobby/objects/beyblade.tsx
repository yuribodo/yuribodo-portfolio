"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Box3, Color, MeshStandardMaterial, Vector3 } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { Group, Material, Mesh, Object3D } from "three";

import { usePulseTarget } from "@/hooks/use-pulse-target";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { LOBBY_MODELS } from "@/lib/lobby/assets";
import {
  DEFAULT_PARAMS,
  deriveTransform,
  initialState,
  launch,
  stepBeyblade,
} from "@/lib/lobby/beyblade-physics";
import type { BeybladeState } from "@/lib/lobby/beyblade-physics";

// Front-right pocket of the desk, clear of mouse/xbox/figures so the top has
// room to precess (spec §Coordinate system).
const POSITION: [number, number, number] = [0.38, 0, 0.0];
// Final height in metres after Box3 normalisation (~4.5cm metal bey).
const TARGET_HEIGHT = 0.045;

// Hover affordance — mirrors anime-figures.tsx values, tuned to the same
// warm key light in <DeskEnvironment>.
const HOVER_LIFT_M = 0.01;
const HOVER_LERP_FACTOR = 0.18;
const HOVER_EMISSIVE_INTENSITY = 0.35;
const HOVER_EMISSIVE_COLOR = "#a8d4ff"; // cool rim to match the blue wheel
const HOVER_TRANSITION_S = 0.2;

const PULSE_INTENSITY = 1.5;
const PULSE_RISE_S = 0.15;
const PULSE_FALL_S = 0.25;

export interface BeybladeHandle {
  activate: () => void;
}

export interface BeybladeProps {
  /** Fires on a rip (launch or re-launch). Hook for the audio cue. */
  onLaunch?: () => void;
}

const Beyblade = forwardRef<BeybladeHandle, BeybladeProps>(function Beyblade(
  { onLaunch },
  ref,
) {
  const { scene } = useGLTF(LOBBY_MODELS.beybladePegasus);
  const groupRef = useRef<Group>(null);
  const materialsRef = useRef<MeshStandardMaterial[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredRef = useRef(false);
  const prefersReducedMotion = useReducedMotion();
  const physicsRef = useRef<BeybladeState>(initialState());
  const reducedTweenRef = useRef<gsap.core.Tween | null>(null);

  // Scale + centre the clone with the TIP on local y=0 and the xz centre at
  // the origin, so the parent group rotates/precesses about the contact point.
  const sceneClone = useMemo(() => {
    const clone = scene.clone(true);
    clone.position.set(0, 0, 0);
    clone.rotation.set(0, 0, 0);
    clone.scale.setScalar(1);

    const rawBox = new Box3().setFromObject(clone);
    const rawSize = new Vector3();
    rawBox.getSize(rawSize);
    const scale = TARGET_HEIGHT / Math.max(rawSize.y, 0.0001);
    clone.scale.setScalar(scale);

    const finalBox = new Box3().setFromObject(clone);
    const finalCentre = new Vector3();
    finalBox.getCenter(finalCentre);
    // Base (min.y) → local 0 puts the tip at the pivot; xz centred.
    clone.position.set(-finalCentre.x, -finalBox.min.y, -finalCentre.z);
    return clone;
  }, [scene]);

  useLayoutEffect(() => {
    const materials: MeshStandardMaterial[] = [];
    sceneClone.traverse((obj: Object3D) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const cloneMaterial = (m: Material): Material => {
        const cloned = m.clone();
        if (cloned instanceof MeshStandardMaterial) {
          cloned.emissive = new Color(HOVER_EMISSIVE_COLOR);
          cloned.emissiveIntensity = 0;
          materials.push(cloned);
        }
        return cloned;
      };
      const original = mesh.material;
      mesh.material = Array.isArray(original)
        ? original.map(cloneMaterial)
        : cloneMaterial(original);
    });
    materialsRef.current = materials;
    return () => {
      materials.forEach((m) => m.dispose());
      materialsRef.current = [];
    };
  }, [sceneClone]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    // Hover lift on Y is only meaningful at rest; while spinning the physics
    // owns the transform. Clamp delta so a tab-away stall doesn't teleport.
    const dt = Math.min(delta, 1 / 30);
    const state = physicsRef.current;

    if (state.phase === "spinning" && !prefersReducedMotion) {
      const next = stepBeyblade(state, dt, DEFAULT_PARAMS);
      physicsRef.current = next;
      const { euler, offset } = deriveTransform(next, DEFAULT_PARAMS.wanderRadius);
      group.rotation.set(euler[0], euler[1], euler[2]);
      group.position.set(POSITION[0] + offset[0], POSITION[1], POSITION[2] + offset[1]);
      return;
    }

    // At rest: settle rotation/position back and apply hover lift.
    const targetY = POSITION[1] + (isHovered ? HOVER_LIFT_M : 0);
    const t = 1 - Math.pow(1 - HOVER_LERP_FACTOR, dt * 60);
    group.position.y += (targetY - group.position.y) * t;
  });

  // Hover emissive.
  useLayoutEffect(() => {
    isHoveredRef.current = isHovered;
    const target = isHovered ? HOVER_EMISSIVE_INTENSITY : 0;
    materialsRef.current.forEach((m) => {
      gsap.to(m, {
        emissiveIntensity: target,
        duration: HOVER_TRANSITION_S,
        ease: "power2.out",
        overwrite: "auto",
      });
    });
  }, [isHovered]);

  usePulseTarget("beyblade-pegasus", () => {
    const materials = materialsRef.current;
    if (materials.length === 0) return;
    const resting = isHoveredRef.current ? HOVER_EMISSIVE_INTENSITY : 0;
    materials.forEach((m) => {
      gsap.killTweensOf(m, "emissiveIntensity");
      gsap
        .timeline()
        .to(m, { emissiveIntensity: PULSE_INTENSITY, duration: PULSE_RISE_S, ease: "power2.out" })
        .to(m, { emissiveIntensity: resting, duration: PULSE_FALL_S, ease: "power2.in" });
    });
  });

  const activate = useCallback(() => {
    const group = groupRef.current;
    if (!group) return;
    onLaunch?.();

    if (prefersReducedMotion) {
      // Gentle scripted spin — no wobble/topple for motion-sensitive users.
      reducedTweenRef.current?.kill();
      reducedTweenRef.current = gsap.to(group.rotation, {
        y: `+=${Math.PI * 2}`,
        duration: 1.4,
        ease: "power2.inOut",
      });
      return;
    }
    physicsRef.current = launch(physicsRef.current, DEFAULT_PARAMS);
  }, [onLaunch, prefersReducedMotion]);

  useImperativeHandle(ref, () => ({ activate }), [activate]);

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    activate();
  };
  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setIsHovered(true);
    document.body.style.cursor = "pointer";
  };
  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setIsHovered(false);
    document.body.style.cursor = "";
  };

  return (
    <group
      ref={groupRef}
      position={POSITION}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <primitive object={sceneClone} />
    </group>
  );
});

export default Beyblade;
