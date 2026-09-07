"use client";

import { Canvas } from "@react-three/fiber";
import gsap from "gsap";
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { WorldBoundary } from "./world/world-boundary";
import { DeskInteraction, SceneReady } from "./world/scene-ready";
import { requestWorldEntry, type WorldView } from "@/lib/lobby/world-view";

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
  // Black overlay that sits over the Canvas. Starts opaque so the loading
  // → idle entrance reads as a smooth power-on rather than the scene
  // snapping in fully lit. Tweened to opacity 0 once the render loop has
  // stabilised (first frames hitch on shader compile + texture upload).
  const fadeOverlayRef = useRef<HTMLDivElement>(null);
  const hasEnteredRef = useRef(false);
  const [diveProgress, setDiveProgress] = useState(0);
  const [view, setView] = useState<WorldView>("desk");
  const [floorY, setFloorY] = useState(-1.5);
  const pendingEntry = useRef(false);
  const restoreLookFocus = useRef(false);
  const lookButton = useRef<HTMLButtonElement>(null);
  const assetsReady = useCallback(() => dispatch({ type: "ASSETS_READY" }), [dispatch]);
  const skipScene = useCallback(() => dispatch({ type: "SKIP" }), [dispatch]);
  // Live monitor paint is deferred until after the entrance fade so the
  // heavy per-pixel Bayer dither (~10ms / paint) doesn't compete with the
  // fade tween. Monitor paints once on state change as a fallback.
  const [livePaintEnabled, setLivePaintEnabled] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  // Destructure to capture the stable useCallback identities. Re-using
  // `audio` as a whole would invalidate every dep array on each mute flip
  // (the wrapper object's identity is per-render).
  const {
    play: playCue,
    startAmbient,
    stopAmbient,
    isMuted,
    toggleMuted,
  } = useLobbyAudio();

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
      dispatch({ type: "SKIP" });
    }, 20000);
    return () => window.clearTimeout(timer);
  }, [state, dispatch]);

  // Discovery affordance (issue #14): fires once per session on the user's
  // first mouse move, pulsing 3–4 registered objects to signal interactivity.
  useFirstPointermoveSweep({ enabled: view === "desk" && (state === "idle" || state === "exploring") });

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
    if (pendingEntry.current) return;
    if (requestWorldEntry(view) === "return-first") {
      pendingEntry.current = true;
      setView("returning");
      return;
    }
    playCue("monitor-power");
    monitorRef.current?.flashComplete();
    dispatch({ type: "ENTER_CLICKED" });
  };

  const handleReturned = () => {
    setView("desk");
    if (pendingEntry.current) {
      pendingEntry.current = false;
      playCue("monitor-power");
      monitorRef.current?.flashComplete();
      dispatch({ type: "ENTER_CLICKED" });
    } else {
      restoreLookFocus.current = true;
    }
  };

  useEffect(() => {
    if (view === "desk" && restoreLookFocus.current) {
      restoreLookFocus.current = false;
      lookButton.current?.focus({ preventScroll: true });
    }
  }, [view]);

  const handleSkip = () => {
    if (state === "done") return;
    dispatch({ type: "SKIP" });
  };

  // Escape returns from looking around; at the desk it skips the lobby.
  // Once entry starts, the return and monitor dive run to completion.
  useEffect(() => {
    if (state === "booting" || state === "done") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (view !== "desk") {
          if (!pendingEntry.current) setView("returning");
          return;
        }
        dispatch({ type: "SKIP" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, view, dispatch]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Interactive desk lobby"
      data-lobby-active="true"
      data-world-view={view}
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
      <Canvas dpr={[1, 1.5]} shadows="soft" scene={{ environmentIntensity: 0.35 }}>
        <CameraRig ref={cameraRigRef} state={state} view={view} onReturned={handleReturned} />
        <DeskInteraction enabled={view === "desk" && state !== "loading" && state !== "booting"} />
        <DeskEnvironment ref={environmentRef} />
        <IsekaiWorld floorY={floorY} active={state !== "booting" && state !== "loading"} />
        <WorldBoundary onError={skipScene}>
        <Suspense fallback={null}>
          <Desk onFloorReady={setFloorY} />
          <SceneReady onReady={assetsReady} />
          <Monitor
            ref={monitorRef}
            onEnter={handleEnter}
            state={state}
            diveProgress={diveProgress}
            livePaint={livePaintEnabled}
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
        </Suspense>
        </WorldBoundary>
      </Canvas>
      {/* Fade-from-black overlay for the loading → idle entrance. Sits
          above the Canvas but pointer-events-none so hover / click still
          land on the screen mesh. */}
      <div
        ref={fadeOverlayRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 bg-background"
      />
      {/* Keyboard equivalents call the same object handles as mesh clicks.
          The focused action becomes visible above the navigation controls. */}
      <div
        role="region"
        aria-label="Interactive desk lobby"
        className="lobby-keyboard-actions"
        inert={view !== "desk" || (state !== "idle" && state !== "exploring")}
      >
        <button type="button" onClick={handleSkip}>
          Skip lobby and enter site
        </button>
        <button type="button" onClick={handleEnter}>
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
      <WorldControls
        view={view} loading={state === "loading"} busy={state === "booting" || view === "returning"}
        lookButton={lookButton}
        onLook={() => setView("looking")} onReturn={() => setView("returning")}
        onEnter={handleEnter} onSkip={handleSkip}
        onTurn={(yaw, pitch) => cameraRigRef.current?.turn(yaw, pitch)}
      />
      <MuteToggle isMuted={isMuted} onToggle={toggleMuted} />
    </div>
  );
}
