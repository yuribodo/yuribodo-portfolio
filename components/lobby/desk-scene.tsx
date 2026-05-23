"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Dispatch } from "react";
import type { Mesh } from "three";

import { useHoldActivate } from "@/hooks/use-hold-activate";
import CameraRig, { type CameraRigHandle } from "./camera-rig";
import { HoldProgress } from "./hold-progress";
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

function DevHoldPlaceholder({ dispatch }: { dispatch: Dispatch<LobbyAction> }) {
  const { bind, progress, isHolding } = useHoldActivate({
    onStart: () => dispatch({ type: "HOLD_START" }),
    onCancel: () => dispatch({ type: "HOLD_CANCEL" }),
    onComplete: () => {
      console.log("boot!");
      dispatch({ type: "HOLD_COMPLETE" });
    },
  });

  return (
    <>
      <button
        type="button"
        {...bind}
        className="fixed bottom-6 right-6 z-[55] rounded-md border border-border bg-surface px-4 py-3 font-mono text-xs uppercase tracking-wider text-foreground transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        DEV · hold to boot
      </button>
      <HoldProgress progress={progress} isHolding={isHolding} />
    </>
  );
}

export default function DeskScene({ state, dispatch }: DeskSceneProps) {
  const cameraRigRef = useRef<CameraRigHandle>(null);

  useEffect(() => {
    if (state !== "loading") return;
    const timer = window.setTimeout(() => {
      dispatch({ type: "ASSETS_READY" });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [state, dispatch]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div
      role="application"
      aria-label="Interactive desk lobby"
      data-lobby-active="true"
      className="fixed inset-0 z-50 bg-background"
    >
      <Canvas dpr={[1, 2]}>
        <CameraRig ref={cameraRigRef} state={state} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 5, 2]} intensity={1.2} />
        <PlaceholderCube />
      </Canvas>
      {isDev ? <DevHoldPlaceholder dispatch={dispatch} /> : null}
    </div>
  );
}
