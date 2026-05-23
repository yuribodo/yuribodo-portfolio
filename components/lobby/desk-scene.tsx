"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import type { Dispatch } from "react";

import { useFirstPointermoveSweep } from "@/hooks/use-first-pointermove-sweep";
import CameraRig, { type CameraRigHandle } from "./camera-rig";
import Desk from "./desk";
import DeskEnvironment from "./desk-environment";
import Monitor, { type MonitorHandle } from "./objects/monitor";
import RazerPeripherals from "./objects/razer-peripherals";
import Macbook from "./objects/macbook";
import NintendoDS from "./objects/nintendo-ds";
import XboxController from "./objects/xbox-controller";
import PokemonDeck from "./objects/pokemon-deck";
import YugiohDeck from "./objects/yugioh-deck";
import AnimeFigures from "./objects/anime-figures";
import type { LobbyAction, LobbyState } from "./use-lobby-state";

interface DeskSceneProps {
  state: LobbyState;
  dispatch: Dispatch<LobbyAction>;
}

export default function DeskScene({ state, dispatch }: DeskSceneProps) {
  const cameraRigRef = useRef<CameraRigHandle>(null);
  const monitorRef = useRef<MonitorHandle>(null);

  useEffect(() => {
    if (state !== "loading") return;
    const timer = window.setTimeout(() => {
      dispatch({ type: "ASSETS_READY" });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [state, dispatch]);

  // Discovery affordance (issue #14): fires once per session on the user's
  // first mouse move, pulsing 3–4 registered objects to signal interactivity.
  useFirstPointermoveSweep({ enabled: state === "idle" || state === "exploring" });

  const handleEnter = () => {
    if (state !== "idle" && state !== "exploring") return;
    monitorRef.current?.flashComplete();
    dispatch({ type: "ENTER_CLICKED" });
  };

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
          <Monitor ref={monitorRef} onEnter={handleEnter} state={state} />
          <RazerPeripherals />
          <Macbook />
          <NintendoDS />
          <XboxController />
          <PokemonDeck />
          <YugiohDeck />
          <AnimeFigures />
        </Suspense>
      </Canvas>
      {/* Off-canvas keyboard surrogate. Tab → Enter/Space triggers the same
          enter action as clicking the screen mesh. */}
      <button
        type="button"
        onClick={handleEnter}
        className="sr-only"
      >
        Enter portfolio
      </button>
    </div>
  );
}
