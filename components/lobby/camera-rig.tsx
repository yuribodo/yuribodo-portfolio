"use client";

import { PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { PerspectiveCamera as PerspectiveCameraImpl } from "three";

import { useReducedMotion } from "@/hooks/use-reduced-motion";

import type { LobbyState } from "./use-lobby-state";

export interface CameraRigHandle {
  /** Live camera for the §6 dive transition (#10). The transition timeline
   *  owns the dolly / FOV tweens directly — simpler than wrapping each as
   *  an imperative method. */
  getCamera: () => PerspectiveCameraImpl | null;
}

interface CameraRigProps {
  state: LobbyState;
  fov?: number;
}

// First-person "sitting at the desk" POV — head height of a seated adult,
// gaze tilted ~35° down toward the keyboard area:
//   - eyes ~60cm above the writing surface (desk top is at y=0)
//   - ~40cm forward of the desk's front edge (front edge at z=0.4)
//   - look-at sits below the desk surface line → ~35° downward gaze, the angle
//     you naturally hit when looking at the keyboard while seated
const BASE_POSITION = { x: 0, y: 0.4, z: 1.9 } as const;
// Slight pull-back the rig holds during "loading" — gives the entrance
// tween somewhere to come from (zoom in + slight head-drop into seated POV).
const LOADING_POSITION = { x: 0, y: 0.55, z: 2.7 } as const;
const LOOKAT_TARGET = { x: 0, y: -0.05, z: -0.2 } as const;
// Drift drops 10x — at this close range, 0.3 felt like a head-jerk
const DRIFT_AMPLITUDE = 0.06;
const LERP_FACTOR = 0.1;

const ENTRANCE_DOLLY_DUR = 1.7;

const CameraRig = forwardRef<CameraRigHandle, CameraRigProps>(function CameraRig(
  { state, fov = 50 },
  ref,
) {
  const cameraRef = useRef<PerspectiveCameraImpl>(null);
  const mouseTargetRef = useRef({ x: 0, y: 0 });
  const prefersReducedMotion = useReducedMotion();
  // Entrance lock — true while the loading → idle dolly tween is in flight.
  // Drift skips this frame while locked so the lerp doesn't fight the tween.
  const entranceLockRef = useRef(false);
  const hasEnteredRef = useRef(false);

  const isDriftEnabled =
    !prefersReducedMotion && state !== "booting" && state !== "loading";

  useImperativeHandle(
    ref,
    () => ({
      getCamera: () => cameraRef.current,
    }),
    [],
  );

  useEffect(() => {
    if (!isDriftEnabled) {
      mouseTargetRef.current = { x: 0, y: 0 };
      return;
    }

    function handleMouseMove(event: MouseEvent) {
      const nx = (event.clientX / window.innerWidth) * 2 - 1;
      const ny = (event.clientY / window.innerHeight) * 2 - 1;
      mouseTargetRef.current = { x: nx, y: -ny };
    }

    function handleMouseLeave() {
      mouseTargetRef.current = { x: 0, y: 0 };
    }

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("blur", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("blur", handleMouseLeave);
    };
  }, [isDriftEnabled]);

  useEffect(() => {
    cameraRef.current?.lookAt(LOOKAT_TARGET.x, LOOKAT_TARGET.y, LOOKAT_TARGET.z);
  }, []);

  // First transition into "idle" (loading → idle) runs the entrance dolly.
  // Subsequent state changes (idle ↔ exploring ↔ booting) don't replay it.
  useEffect(() => {
    if (state !== "idle" || hasEnteredRef.current) return;
    hasEnteredRef.current = true;

    const camera = cameraRef.current;
    if (!camera) return;

    if (prefersReducedMotion) {
      camera.position.set(BASE_POSITION.x, BASE_POSITION.y, BASE_POSITION.z);
      camera.lookAt(LOOKAT_TARGET.x, LOOKAT_TARGET.y, LOOKAT_TARGET.z);
      return;
    }

    // Force-start from LOADING_POSITION in case anything nudged it (drift was
    // gated during loading, but defensive). Then tween in.
    camera.position.set(
      LOADING_POSITION.x,
      LOADING_POSITION.y,
      LOADING_POSITION.z,
    );
    entranceLockRef.current = true;
    gsap.to(camera.position, {
      x: BASE_POSITION.x,
      y: BASE_POSITION.y,
      z: BASE_POSITION.z,
      duration: ENTRANCE_DOLLY_DUR,
      ease: "power3.out",
      onUpdate: () => camera.lookAt(LOOKAT_TARGET.x, LOOKAT_TARGET.y, LOOKAT_TARGET.z),
      onComplete: () => {
        entranceLockRef.current = false;
      },
    });
  }, [state, prefersReducedMotion]);

  useFrame((_, delta) => {
    // Dive transition (#10) and entrance dolly own the camera while active —
    // drift would otherwise lerp against the GSAP tweens.
    if (state === "booting" || entranceLockRef.current) return;

    const camera = cameraRef.current;
    if (!camera) return;

    const targetX = BASE_POSITION.x + mouseTargetRef.current.x * DRIFT_AMPLITUDE;
    const targetY = BASE_POSITION.y + mouseTargetRef.current.y * DRIFT_AMPLITUDE;

    // Frame-rate independent lerp: same perceived speed at 60Hz and 120Hz.
    const t = 1 - Math.pow(1 - LERP_FACTOR, delta * 60);

    camera.position.x += (targetX - camera.position.x) * t;
    camera.position.y += (targetY - camera.position.y) * t;
    camera.lookAt(LOOKAT_TARGET.x, LOOKAT_TARGET.y, LOOKAT_TARGET.z);
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      position={[LOADING_POSITION.x, LOADING_POSITION.y, LOADING_POSITION.z]}
      fov={fov}
    />
  );
});

export default CameraRig;
