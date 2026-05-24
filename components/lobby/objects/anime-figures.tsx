"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Box3, Color, MeshStandardMaterial, Vector3 } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { Group, Material, Mesh, Object3D } from "three";

import { usePulseTarget } from "@/hooks/use-pulse-target";
import { LOBBY_MODELS } from "@/lib/lobby/assets";

// Per spec §3 the figure cluster sits at (x=+0.45, z=-0.30, y=0) — back-right of
// the desk, next to the monitor. We fan three figures across x with light z
// jitter so they don't read as a regimented row. Heights vary too — real
// shelf statues are 8–15cm and the variation reinforces "lived-in" over "store
// display". Spec tolerates ±0.05m per coord.
type FigureId = "minato" | "seismitoad" | "drago";

interface FigureConfig {
  id: FigureId;
  modelPath: string;
  position: [number, number, number];
  // Target final HEIGHT in metres after Box3 normalisation. We scale uniformly
  // from this; depth/width follow the model's natural proportions.
  targetHeight: number;
  // Initial Y rotation so figures don't all face the camera identically. The
  // 360° click tween adds Math.PI*2 on top of this, so the snap-to-90° math
  // works in absolute world rotation.
  initialRotationY: number;
}

const FIGURES: readonly FigureConfig[] = [
  {
    id: "minato",
    modelPath: LOBBY_MODELS.figureMinato,
    position: [0.32, 0, -0.32],
    targetHeight: 0.14,
    initialRotationY: -0.3,
  },
  {
    id: "seismitoad",
    modelPath: LOBBY_MODELS.figureSeismitoad,
    position: [0.46, 0, -0.28],
    targetHeight: 0.09,
    initialRotationY: 0.15,
  },
  {
    id: "drago",
    modelPath: LOBBY_MODELS.figureDrago,
    position: [0.6, 0, -0.31],
    targetHeight: 0.12,
    initialRotationY: -0.55,
  },
] as const;

// Hover affordance + emissive boosts. Numbers tuned against the existing
// lighting in <DeskEnvironment> — 0.35 reads as a clean rim without blowing
// out under the warm key light at this scale.
const HOVER_LIFT_M = 0.012;
const HOVER_LERP_FACTOR = 0.18;
const HOVER_EMISSIVE_INTENSITY = 0.35;
const HOVER_EMISSIVE_COLOR = "#ffd9a8";
const HOVER_TRANSITION_S = 0.2;

// Click rotation. 360° in 2s ease in/out per spec §5. Re-clicking a rotating
// figure snaps it to the NEXT 90° boundary so the user always lands in a
// recognisable pose — never mid-spin.
const ROTATION_DURATION_S = 2;
const ROTATION_EASE = "power2.inOut";
const SNAP_DURATION_S = 0.4;
const SNAP_EASE = "power2.out";
const QUARTER_TURN = Math.PI / 2;

// Pulse for the first-pointermove sweep (PARTE B). Intensity stronger than
// hover so the cascade reads as a deliberate "look here" beat even if the
// user happens to be hovering one of the figures when the sweep fires.
const PULSE_INTENSITY = 1.5;
const PULSE_RISE_S = 0.15;
const PULSE_FALL_S = 0.25;

interface FigureProps {
  config: FigureConfig;
  /** Fires when a rotation tween starts (full spin or mid-spin snap). Hook
   *  for the lobby audio system (#15). */
  onSpin?: () => void;
}

function Figure({ config, onSpin }: FigureProps) {
  const { scene } = useGLTF(config.modelPath);
  const groupRef = useRef<Group>(null);
  // Cloned materials. We clone on mount so any tween we run only affects this
  // figure — the underlying useGLTF cache is shared across hot reloads and
  // (in principle) across multiple instances of the same model.
  const materialsRef = useRef<MeshStandardMaterial[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredRef = useRef(false);
  const rotationTweenRef = useRef<gsap.core.Tween | null>(null);

  // Scale + centre the clone BEFORE attaching it to the React tree. Done in
  // useMemo (not useLayoutEffect) so the bounding box is measured in the
  // clone's own local space — Box3.setFromObject walks world matrices, and
  // once attached, our parent <group position={...}> would offset every
  // measurement by the configured anchor, which previously dragged Drago
  // (centre at x≈+0.6) back toward the origin.
  const sceneClone = useMemo(() => {
    const clone = scene.clone(true);
    clone.position.set(0, 0, 0);
    clone.rotation.set(0, 0, 0);
    clone.scale.setScalar(1);

    const rawBox = new Box3().setFromObject(clone);
    const rawSize = new Vector3();
    rawBox.getSize(rawSize);
    const scale = config.targetHeight / Math.max(rawSize.y, 0.0001);
    clone.scale.setScalar(scale);

    // Re-measure post-scale, then offset the clone so its visible base sits
    // on local y=0 and its xz centre is at the local origin. The parent group
    // then places this neutralised model at the desk-relative anchor.
    const finalBox = new Box3().setFromObject(clone);
    const finalCentre = new Vector3();
    finalBox.getCenter(finalCentre);
    clone.position.set(-finalCentre.x, -finalBox.min.y, -finalCentre.z);
    return clone;
  }, [scene, config.targetHeight]);

  useLayoutEffect(() => {
    const materials: MeshStandardMaterial[] = [];
    sceneClone.traverse((obj: Object3D) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Per-figure material clones. Only MeshStandardMaterial gets the
      // emissive tweens — other material types (rare in our pipeline) get
      // cloned for isolation but skip the boost wiring.
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

  // Smooth lift on hover. Frame-rate independent — same perceived speed at
  // 60Hz and 120Hz (mirrors the camera-rig.tsx lerp).
  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const targetY = config.position[1] + (isHovered ? HOVER_LIFT_M : 0);
    const t = 1 - Math.pow(1 - HOVER_LERP_FACTOR, delta * 60);
    group.position.y += (targetY - group.position.y) * t;
  });

  // Emissive boost on hover. Tween the cloned materials directly — cheaper
  // than re-rendering on every frame and read as a soft rim under the warm
  // key light.
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

  // First-pointermove sweep target (PARTE B). The registry invokes this
  // callback to pulse the figure once. Settles back to whatever hover state
  // the user is currently in.
  usePulseTarget(config.id, () => {
    const materials = materialsRef.current;
    if (materials.length === 0) return;
    const restingIntensity = isHoveredRef.current ? HOVER_EMISSIVE_INTENSITY : 0;
    materials.forEach((m) => {
      gsap.killTweensOf(m, "emissiveIntensity");
      gsap
        .timeline()
        .to(m, {
          emissiveIntensity: PULSE_INTENSITY,
          duration: PULSE_RISE_S,
          ease: "power2.out",
        })
        .to(m, {
          emissiveIntensity: restingIntensity,
          duration: PULSE_FALL_S,
          ease: "power2.in",
        });
    });
  });

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const group = groupRef.current;
    if (!group) return;

    const active = rotationTweenRef.current;
    if (active && active.isActive()) {
      // Mid-spin re-click → snap to the next clean 90°. Reading the live
      // rotation before kill() so we don't overshoot the post-kill value.
      active.kill();
      const current = group.rotation.y;
      const next90 = Math.ceil(current / QUARTER_TURN) * QUARTER_TURN;
      // Edge case: current is already on a 90° boundary (within float
      // precision). Math.ceil would return the same value → no animation,
      // figure freezes mid-orientation. Bump to the next one.
      const target = Math.abs(next90 - current) < 1e-4
        ? next90 + QUARTER_TURN
        : next90;
      onSpin?.();
      rotationTweenRef.current = gsap.to(group.rotation, {
        y: target,
        duration: SNAP_DURATION_S,
        ease: SNAP_EASE,
        onComplete: () => {
          rotationTweenRef.current = null;
        },
      });
      return;
    }

    onSpin?.();
    rotationTweenRef.current = gsap.to(group.rotation, {
      y: `+=${Math.PI * 2}`,
      duration: ROTATION_DURATION_S,
      ease: ROTATION_EASE,
      onComplete: () => {
        rotationTweenRef.current = null;
      },
    });
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
      position={config.position}
      rotation={[0, config.initialRotationY, 0]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <primitive object={sceneClone} />
    </group>
  );
}

interface AnimeFiguresProps {
  /** Fires when any figure starts a rotation (full spin or snap). Hook for
   *  the lobby audio system (#15) — desk-scene passes a single callback
   *  that plays the figure-spin cue. */
  onSpin?: () => void;
}

export default function AnimeFigures({ onSpin }: AnimeFiguresProps) {
  return (
    <>
      {FIGURES.map((config) => (
        <Figure key={config.id} config={config} onSpin={onSpin} />
      ))}
    </>
  );
}
