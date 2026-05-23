"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Mesh } from "three";
import type { Dispatch } from "react";
import type { LobbyAction, LobbyState } from "./use-lobby-state";

interface DeskSceneProps {
  state: LobbyState;
  dispatch: Dispatch<LobbyAction>;
}

function PlaceholderCube() {
  const meshRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x += delta * 0.6;
    meshRef.current.rotation.y += delta * 0.9;
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  );
}

export default function DeskScene({ state, dispatch }: DeskSceneProps) {
  useEffect(() => {
    if (state !== "loading") return;
    const timer = window.setTimeout(() => {
      dispatch({ type: "ASSETS_READY" });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [state, dispatch]);

  return (
    <div
      role="application"
      aria-label="Interactive desk lobby"
      className="fixed inset-0 z-50 bg-background"
    >
      <Canvas camera={{ position: [0, 0, 4], fov: 35 }} dpr={[1, 2]}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 5, 2]} intensity={1.2} />
        <PlaceholderCube />
      </Canvas>
    </div>
  );
}
