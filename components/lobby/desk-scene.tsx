"use client";

import { Canvas } from "@react-three/fiber";
import gsap from "gsap";
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Dispatch } from "react";

import { useFirstPointermoveSweep } from "@/hooks/use-first-pointermove-sweep";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { playLobbyToSiteTransition } from "@/lib/lobby/transition";
import CameraRig, { type CameraRigHandle } from "./camera-rig";
import Desk from "./desk";
import DeskEnvironment, {
  type DeskEnvironmentHandle,
} from "./desk-environment";
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
  const environmentRef = useRef<DeskEnvironmentHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Black overlay that sits over the Canvas. Starts opaque so the loading
  // → idle entrance reads as a smooth power-on rather than the scene
  // snapping in fully lit. Tweened to opacity 0 once the render loop has
  // stabilised (first frames hitch on shader compile + texture upload).
  const fadeOverlayRef = useRef<HTMLDivElement>(null);
  const hasEnteredRef = useRef(false);
  const [diveProgress, setDiveProgress] = useState(0);
  // Live monitor paint is deferred until after the entrance fade so the
  // heavy per-pixel Bayer dither (~10ms / paint) doesn't compete with the
  // fade tween. Monitor paints once on state change as a fallback.
  const [livePaintEnabled, setLivePaintEnabled] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Snap the fade overlay opaque before paint so nobody sees a flash of the
  // unanimated scene between mount and the entrance tween starting.
  useLayoutEffect(() => {
    if (fadeOverlayRef.current) {
      fadeOverlayRef.current.style.opacity = "1";
    }
  }, []);

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

  // Lobby entrance: fade the overlay from black on the first loading → idle
  // transition. Everything else (camera, lights, screen emissive) snaps
  // into place behind the opaque overlay so the fade itself is the ONLY
  // thing animating on the main thread → no jank competing with the tween.
  //
  // The fade waits until rAF has produced N consecutive stable frames
  // (delta < 22ms ≈ >45fps) — gives the first-frame stalls (shader compile,
  // texture upload) time to clear before the user sees motion.
  useEffect(() => {
    if (state !== "idle" || hasEnteredRef.current) return;
    hasEnteredRef.current = true;

    const overlay: HTMLDivElement | null = fadeOverlayRef.current;
    if (!overlay) return;
    const el = overlay;

    if (prefersReducedMotion) {
      el.style.opacity = "0";
      el.style.display = "none";
      setLivePaintEnabled(true);
      return;
    }

    let stableFrames = 0;
    const startTime = performance.now();
    let lastTime = startTime;
    let raf = 0;
    let started = false;

    function tick(now: number) {
      const delta = now - lastTime;
      lastTime = now;
      if (delta < 22) stableFrames++;
      else stableFrames = 0;

      // Hard cap — if rAF never stabilises (low-end device under load) we
      // still start the fade after ~600ms so the user isn't stuck on black.
      const elapsed = now - startTime;
      if (stableFrames >= 4 || elapsed > 600) {
        started = true;
        gsap.to(el, {
          opacity: 0,
          duration: 1.2,
          ease: "power2.out",
          onComplete: () => {
            el.style.display = "none";
            // Activate the live paint loop now that nothing else is
            // animating — the heavy dither has the main thread to itself.
            setLivePaintEnabled(true);
          },
        });
        return;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      if (!started) {
        gsap.killTweensOf(el);
      }
    };
  }, [state, prefersReducedMotion]);

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
      onDiveProgress: setDiveProgress,
      onDiveComplete: () => dispatch({ type: "BOOT_COMPLETE" }),
      prefersReducedMotion,
    });

    return () => {
      tl.kill();
    };
  }, [state, dispatch, prefersReducedMotion]);

  const handleEnter = () => {
    if (state !== "idle" && state !== "exploring") return;
    monitorRef.current?.flashComplete();
    dispatch({ type: "ENTER_CLICKED" });
  };

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Interactive desk lobby"
      data-lobby-active="true"
      className="fixed inset-0 z-50 bg-background"
    >
      <Canvas dpr={[1, 2]} shadows="soft">
        <CameraRig ref={cameraRigRef} state={state} />
        <Suspense fallback={null}>
          <DeskEnvironment ref={environmentRef} />
          <Desk />
          <Monitor
            ref={monitorRef}
            onEnter={handleEnter}
            state={state}
            diveProgress={diveProgress}
            livePaint={livePaintEnabled}
          />
          <RazerPeripherals />
          <Macbook />
          <NintendoDS />
          <XboxController />
          <PokemonDeck />
          <YugiohDeck />
          <AnimeFigures />
        </Suspense>
      </Canvas>
      {/* Fade-from-black overlay for the loading → idle entrance. Sits
          above the Canvas but pointer-events-none so hover / click still
          land on the screen mesh. */}
      <div
        ref={fadeOverlayRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 bg-background"
      />
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
