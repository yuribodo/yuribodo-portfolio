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
  // Imperative API consumed later by the §6 transition timeline (issue #10).
  // For FOV math at handoff: cameraZ = screenHeight / (2 * Math.tan(fov / 2))
  dollyToMonitorScreen: () => Promise<void>;
  reset: () => void;
}

interface CameraRigProps {
  state: LobbyState;
  fov?: number;
}

const BASE_POSITION = { x: 0, y: 4, z: 5 } as const;
const DRIFT_AMPLITUDE = 0.3;
const LERP_FACTOR = 0.1;

const CameraRig = forwardRef<CameraRigHandle, CameraRigProps>(function CameraRig(
  { state, fov = 35 },
  ref,
) {
  const cameraRef = useRef<PerspectiveCameraImpl>(null);
  const mouseTargetRef = useRef({ x: 0, y: 0 });
  const prefersReducedMotion = useReducedMotion();

  const isDriftEnabled =
    !prefersReducedMotion && state !== "holding" && state !== "booting" && state !== "loading";

  useImperativeHandle(
    ref,
    () => ({
      dollyToMonitorScreen: async () => {
        console.info("[CameraRig] dollyToMonitorScreen() — stub, impl in #10");
      },
      reset: () => {
        console.info("[CameraRig] reset() — stub, impl in #10");
      },
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
    cameraRef.current?.lookAt(0, 0, 0);
  }, []);

  useFrame((_, delta) => {
    const camera = cameraRef.current;
    if (!camera) return;

    const targetX = BASE_POSITION.x + mouseTargetRef.current.x * DRIFT_AMPLITUDE;
    const targetY = BASE_POSITION.y + mouseTargetRef.current.y * DRIFT_AMPLITUDE;

    // Frame-rate independent lerp: same perceived speed at 60Hz and 120Hz.
    const t = 1 - Math.pow(1 - LERP_FACTOR, delta * 60);

    camera.position.x += (targetX - camera.position.x) * t;
    camera.position.y += (targetY - camera.position.y) * t;
    camera.lookAt(0, 0, 0);
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
