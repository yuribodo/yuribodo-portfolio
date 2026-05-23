"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import type { Dispatch } from "react";

import { useHoldActivate } from "@/hooks/use-hold-activate";
import CameraRig, { type CameraRigHandle } from "./camera-rig";
import Desk from "./desk";
import DeskEnvironment from "./desk-environment";
import { HoldProgress } from "./hold-progress";
import Monitor, { type MonitorHandle } from "./objects/monitor";
import type { LobbyAction, LobbyState } from "./use-lobby-state";

interface DeskSceneProps {
  state: LobbyState;
  dispatch: Dispatch<LobbyAction>;
}

export default function DeskScene({ state, dispatch }: DeskSceneProps) {
  const cameraRigRef = useRef<CameraRigHandle>(null);
  const monitorRef = useRef<MonitorHandle>(null);

  // The lobby's single hold source of truth — feeds both the lobby state
  // machine and the monitor's visual effects. Mouse hold on the monitor's
  // power button (via R3F bind cast) and the dev keyboard/click button both
  // share this instance, so progress accumulates against one timer.
  const { bind, progress, isHolding } = useHoldActivate({
    onStart: () => dispatch({ type: "HOLD_START" }),
    onCancel: () => {
      dispatch({ type: "HOLD_CANCEL" });
      monitorRef.current?.cancelPress();
    },
    onComplete: () => {
      monitorRef.current?.flashComplete();
      dispatch({ type: "HOLD_COMPLETE" });
    },
  });

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
      <Canvas dpr={[1, 2]} shadows="soft">
        <CameraRig ref={cameraRigRef} state={state} />
        <Suspense fallback={null}>
          <DeskEnvironment />
          <Desk />
          <Monitor ref={monitorRef} bind={bind} isHolding={isHolding} />
        </Suspense>
      </Canvas>
      <HoldProgress progress={progress} isHolding={isHolding} />
      {isDev ? (
        <button
          type="button"
          {...bind}
          className="fixed bottom-6 right-6 z-[55] rounded-md border border-border bg-surface px-4 py-3 font-mono text-xs uppercase tracking-wider text-foreground transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          DEV · hold to boot
        </button>
      ) : null}
    </div>
  );
}
