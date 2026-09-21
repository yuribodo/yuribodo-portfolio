"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch } from "react";

import { useFirstPointermoveSweep } from "@/hooks/use-first-pointermove-sweep";
import { useLobbyAudio } from "@/hooks/use-lobby-audio";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { playLobbyToSiteTransition } from "@/lib/lobby/transition";
import CameraRig, { type CameraRigHandle } from "./camera-rig";
import Desk from "./desk";
import DeskEnvironment, {
  type DeskEnvironmentHandle,
} from "./desk-environment";
import { LobbyLoading } from "./lobby-loading";
import { MuteToggle } from "./mute-toggle";
import Monitor, { type MonitorHandle } from "./objects/monitor";
import RazerPeripherals from "./objects/razer-peripherals";
import Macbook from "./objects/macbook";
import NintendoDS, { type NintendoDsHandle } from "./objects/nintendo-ds";
import XboxController, {
  type XboxControllerHandle,
} from "./objects/xbox-controller";
import PokemonDeck, { type PokemonDeckHandle } from "./objects/pokemon-deck";
import YugiohDeck, { type YugiohDeckHandle } from "./objects/yugioh-deck";
import AnimeFigures, {
  type AnimeFiguresHandle,
} from "./objects/anime-figures";
import Beyblade, { type BeybladeHandle } from "./objects/beyblade";
import type { LobbyAction, LobbyState } from "./use-lobby-state";
import IsekaiWorld from "./world/isekai-world";
import { WorldControls } from "./world/world-controls";
import { PreparedGroup } from "./world/prepared-group";
import { WorldBoundary } from "./world/world-boundary";
import { DeskInteraction, SceneReady, SceneVisibility } from "./world/scene-ready";

interface DeskSceneProps {
  state: LobbyState;
  dispatch: Dispatch<LobbyAction>;
}

export default function DeskScene({ state, dispatch }: DeskSceneProps) {
  const cameraRigRef = useRef<CameraRigHandle>(null);
  const monitorRef = useRef<MonitorHandle>(null);
  const environmentRef = useRef<DeskEnvironmentHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Imperative handles for every interactive object — used by the off-canvas
  // DOM mirror below so keyboard-only users can fire the same animations as
  // a mouse click.
  const dsRef = useRef<NintendoDsHandle>(null);
  const xboxRef = useRef<XboxControllerHandle>(null);
  const pokemonRef = useRef<PokemonDeckHandle>(null);
  const yugiohRef = useRef<YugiohDeckHandle>(null);
  const figuresRef = useRef<AnimeFiguresHandle>(null);
  const beybladeRef = useRef<BeybladeHandle>(null);
  const [floorY, setFloorY] = useState(-1.5);
  const assetsReady = useCallback(() => dispatch({ type: "ASSETS_READY" }), [dispatch]);
  const skipScene = useCallback(() => dispatch({ type: "SKIP" }), [dispatch]);  const prefersReducedMotion = useReducedMotion();
  // Destructure to capture the stable useCallback identities. Re-using
  // `audio` as a whole would invalidate every dep array on each mute flip
  // (the wrapper object's identity is per-render).
  const {
    play: playCue,
    startAmbient,
    stopAmbient,
    isMuted,
    toggleMuted,
  } = useLobbyAudio(state !== "loading");

  useEffect(() => {
    if (state !== "loading") return;
    const timer = window.setTimeout(() => {
      dispatch({ type: "SKIP" });
    }, 20000);
    return () => window.clearTimeout(timer);
  }, [state, dispatch]);

  // Discovery affordance (issue #14): fires once per session on the user's
  // first mouse move, pulsing 3–4 registered objects to signal interactivity.
  useFirstPointermoveSweep({ enabled: state === "idle" || state === "exploring" });

  // Ambient bed (issue #15) — boots on the user's first gesture so browser
  // autoplay policy doesn't block the AudioContext. Listens for any input
  // type (pointer, click, keyboard) so keyboard-only users hear it too. The
  // listeners self-remove on first fire via the `once: true` flag plus the
  // shared startedRef short-circuit (so a tab-key gesture before the first
  // pointermove still starts ambient exactly once).
  useEffect(() => {
    if (state !== "idle" && state !== "exploring") return;
    let started = false;
    function handleGesture() {
      if (started) return;
      started = true;
      startAmbient();
    }
    window.addEventListener("pointermove", handleGesture, { once: true });
    window.addEventListener("pointerdown", handleGesture, { once: true });
    window.addEventListener("keydown", handleGesture, { once: true });
    return () => {
      window.removeEventListener("pointermove", handleGesture);
      window.removeEventListener("pointerdown", handleGesture);
      window.removeEventListener("keydown", handleGesture);
    };
  }, [state, startAmbient]);

  // The dive transition (#10). Fires exactly once when the state machine
  // crosses into "booting" (the reducer guards against re-entry — a second
  // ENTER_CLICKED while already booting is a no-op).
  useEffect(() => {
    if (state !== "booting") return;

    const camera = cameraRigRef.current?.getCamera();
    const screenMesh = monitorRef.current?.getScreenMesh();
    const screenMaterial = monitorRef.current?.getScreenMaterial() ?? null;
    if (!camera || !screenMesh) {
      // The model isn't measurable yet — skip straight to done so the user
      // isn't trapped. Logged because hitting this means a load race.
      console.warn("[DeskScene] transition: missing camera or screen mesh");
      dispatch({ type: "BOOT_COMPLETE" });
      return;
    }

    const tl = playLobbyToSiteTransition({
      camera,
      screenMesh,
      screenMaterial,
      environment: environmentRef.current,
      container: containerRef.current,
      onDiveProgress: (progress) => monitorRef.current?.setDiveProgress(progress),
      onDiveComplete: () => dispatch({ type: "BOOT_COMPLETE" }),
      onHandoff: () => {
        playCue("stinger");
        // Fade the ambient bed out as Hero's soundtrack ramps in (3s fade
        // from 0). Without this the bed plays for ~500ms past lobby
        // opacity:0, audibly bleeding through while the user sees Hero.
        stopAmbient();
      },
      prefersReducedMotion,
    });

    return () => {
      tl.kill();
    };
  }, [state, dispatch, prefersReducedMotion, playCue, stopAmbient]);

  const handleEnter = () => {
    if (state !== "idle" && state !== "exploring") return;
    playCue("monitor-power");
    monitorRef.current?.pulseScreen();
    dispatch({ type: "ENTER_CLICKED" });
  };

  const handleSkip = () => {
    if (state === "done") return;
    dispatch({ type: "SKIP" });
  };

  // Escape skips the lobby; the monitor dive runs to completion once started.
  useEffect(() => {
    if (state === "booting" || state === "done") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        dispatch({ type: "SKIP" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, dispatch]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Interactive desk lobby"
      data-lobby-active="true"
      data-world-view="desk"
      data-lobby-state={state}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"))
          .filter((button) => !button.closest("[inert]"));
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      className="fixed inset-0 z-[60] bg-background"
    >
      <Canvas
        dpr={[1, 1.5]}
        shadows="soft"
        scene={{ environmentIntensity: 0.35 }}
        // Dual-GPU laptops default to the integrated chip; ask for the discrete one.
        gl={{ powerPreference: "high-performance" }}
      >
        <SceneVisibility />
        <CameraRig ref={cameraRigRef} state={state} />
        <DeskInteraction enabled={state !== "loading" && state !== "booting"} />
        <DeskEnvironment ref={environmentRef} />
        <IsekaiWorld floorY={floorY} active={state !== "booting" && state !== "loading"} />
        <WorldBoundary onError={skipScene}>
        <Suspense fallback={null}><PreparedGroup priority={0}>
          <Desk onFloorReady={setFloorY} />
          <SceneReady onReady={assetsReady} />
          <Monitor
            ref={monitorRef}
            onEnter={handleEnter}
            state={state}
            livePaint={state !== "loading"}
          />
          <RazerPeripherals />
          <Macbook />
          <NintendoDS ref={dsRef} onScreenOn={() => playCue("ds-chime")} />
          <XboxController
            ref={xboxRef}
            onActivate={() => playCue("xbox-rumble")}
          />
          <PokemonDeck ref={pokemonRef} onActivate={() => playCue("card-fan")} />
          <YugiohDeck
            ref={yugiohRef}
            onActivate={() => {
              playCue("card-fan");
              // Yu-Gi-Oh's Mago Negro lift lands ~120ms after the flick; a
              // staggered low thwack punctuates that beat. Timed against
              // CardDeckBase's HERO_RISE_DUR_S (0.45s) — thwack peaks while
              // the card is still rising.
              window.setTimeout(() => playCue("yugioh-thwack"), 120);
            }}
          />
          <AnimeFigures ref={figuresRef} onSpin={() => playCue("figure-spin")} />
          <Beyblade
            ref={beybladeRef}
            onLaunch={() => playCue("beyblade-launch")}
          />
        </PreparedGroup></Suspense>
        </WorldBoundary>
      </Canvas>
      {/* The same indicator as the bundle fallback remains until SceneReady
          has observed real rendered frames. No timed black entrance layer. */}
      {state === "loading" && <LobbyLoading contained />}
      {/* Keyboard equivalents call the same object handles as mesh clicks.
          The focused action becomes visible above the navigation controls. */}
      <div
        role="region"
        aria-label="Interactive desk lobby"
        className="lobby-keyboard-actions"
        inert={state !== "idle" && state !== "exploring"}
      >
        <button type="button" onClick={handleSkip}>
          Skip lobby and enter site
        </button>
        <button type="button" onClick={handleSkip}>
          Enter portfolio (main action)
        </button>
        <button
          type="button"
          onClick={() => dsRef.current?.activate()}
        >
          Pulse Nintendo DS screen
        </button>
        <button
          type="button"
          onClick={() => xboxRef.current?.activate()}
        >
          Vibrate Xbox controller
        </button>
        <button
          type="button"
          onClick={() => pokemonRef.current?.activate()}
        >
          Fan out Pokémon deck
        </button>
        <button
          type="button"
          onClick={() => yugiohRef.current?.activate()}
        >
          Fan out Yu-Gi-Oh deck
        </button>
        <button
          type="button"
          onClick={() => figuresRef.current?.activate()}
        >
          Spin anime figure trio
        </button>
        <button
          type="button"
          onClick={() => beybladeRef.current?.activate()}
        >
          Spin Pegasus beyblade
        </button>
      </div>
      <WorldControls loading={state === "loading"} busy={state === "booting"} onEnter={handleEnter} onSkip={handleSkip}/>
      <MuteToggle isMuted={isMuted} onToggle={toggleMuted} />
    </div>
  );
}
