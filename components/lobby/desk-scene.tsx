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
import RazerPeripherals from "./objects/razer-peripherals";
import Macbook from "./objects/macbook";
// TODO #11: import NintendoDS from "./objects/nintendo-ds";
// TODO #12: import XboxController from "./objects/xbox-controller";
// TODO #13: import Decks from "./objects/decks";
// TODO #14: import AnimeFigures from "./objects/anime-figures";
import type { LobbyAction, LobbyState } from "./use-lobby-state";

interface DeskSceneProps {
  state: LobbyState;
  dispatch: Dispatch<LobbyAction>;
}

export default function DeskScene({ state, dispatch }: DeskSceneProps) {
  const cameraRigRef = useRef<CameraRigHandle>(null);
  const monitorRef = useRef<MonitorHandle>(null);

  // The lobby's single hold source of truth — feeds both the lobby state
  // machine and the monitor's visual effects. The R3F-mounted power button
  // mesh forwards pointer events into `bind`; the off-canvas sr-only button
  // forwards keyboard Space-hold into the same `bind`. Progress accumulates
  // against one timer regardless of input device.
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
          <RazerPeripherals />
          <Macbook />
          {/* TODO #11: <NintendoDS /> */}
          {/* TODO #12: <XboxController /> */}
          {/* TODO #13: <Decks /> */}
          {/* TODO #14: <AnimeFigures /> */}
        </Suspense>
      </Canvas>
      <HoldProgress progress={progress} isHolding={isHolding} />
      {/* Off-canvas keyboard surrogate for the monitor's power button. The
          R3F mesh receives mouse holds; this <button> hosts the Space-hold
          bind handlers so screen-reader + keyboard-only users have parity. */}
      <button
        type="button"
        {...bind}
        className="sr-only"
      >
        Power on monitor (hold Space to enter site)
      </button>
    </div>
  );
}
