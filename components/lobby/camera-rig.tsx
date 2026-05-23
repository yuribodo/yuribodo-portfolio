"use client";

import { PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
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
   *  an imperative method. Drift in useFrame is gated by `state === "booting"`
   *  so the timeline-driven values aren't clobbered. */
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
const LOOKAT_TARGET = { x: 0, y: -0.05, z: -0.2 } as const;
// Drift drops 10x — at this close range, 0.3 felt like a head-jerk
const DRIFT_AMPLITUDE = 0.06;
const LERP_FACTOR = 0.1;

const CameraRig = forwardRef<CameraRigHandle, CameraRigProps>(function CameraRig(
  { state, fov = 50 },
  ref,
) {
  const cameraRef = useRef<PerspectiveCameraImpl>(null);
  const mouseTargetRef = useRef({ x: 0, y: 0 });
  const prefersReducedMotion = useReducedMotion();

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

  useFrame((_, delta) => {
    // Dive transition (#10) owns position + lookAt while booting. Returning
    // here keeps the drift lerp from fighting the GSAP tween.
    if (state === "booting") return;

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
      position={[BASE_POSITION.x, BASE_POSITION.y, BASE_POSITION.z]}
      fov={fov}
    />
  );
});

export default CameraRig;
