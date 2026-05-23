// Lobby → site dive transition (issue #10). Single GSAP timeline that runs
// from the moment the user clicks the monitor to Hero's entrance taking over.
//
// Timing (relative to t=0 = timeline start, fires from state === "booting"):
//
//   t=0.00s  FOV pre-pull (50 → 47, 400ms, "power2.out") + lighting dimmer
//            1.0 → 0.2 (400ms). The pre-dive beat now breathes alongside
//            the monitor's 200ms RGB-shift glitch (kicked by flashComplete
//            in the click handler) — together they read as the system
//            "preparing to dive" rather than snapping into it.
//   t=0.40s  Camera dolly into the screen plane (1.7s, "power2.inOut").
//            diveProgress 0→1 over the same window tightens the screen's
//            dither so the "YURI BODO" preview resolves as we arrive.
//   t=2.10s  Handoff. Emissive bloom (2.2 → 5 → 0, 320ms) punctuates the
//            moment. Lobby container opacity 1 → 0 (300ms) reveals Hero
//            behind. startSoundtrack() fires (idempotent — Hero's later
//            call no-ops). Because monitor + Hero share palette + font +
//            dither + the YURI/BODO colour split, the fade reads as
//            continuity, not a cut.
//   t=2.60s  onDiveComplete() → desk-scene dispatches BOOT_COMPLETE →
//            state "booting" → "done" → LobbyGate unmounts.

import gsap from "gsap";
import { Box3, Vector3 } from "three";
import type { Mesh, MeshStandardMaterial, PerspectiveCamera } from "three";

import { startSoundtrack } from "@/lib/audio-manager";

import type { DeskEnvironmentHandle } from "@/components/lobby/desk-environment";

// Camera-rig's resting FOV is 50° (see camera-rig.tsx). The spec's 33° → 36°
// pre-pull mapped onto our 50° baseline becomes 50° → 47° — same "lens
// compresses, tension before the dive" beat, no global FOV rewrite.
const FOV_PRE_PULL = 47;
// Pre-dive beats stretched 200 → 400ms — the original 200ms read as a
// snap on top of the click; doubling lets the FOV compression + light dim
// breathe alongside the monitor's 200ms glitch.
const FOV_TWEEN_DUR = 0.4;

const LIGHTING_DIM_RATIO = 0.2;
const LIGHTING_TWEEN_DUR = 0.4;

// Dolly starts at t=0.40 (after the pre-pull settles) and runs 1.7s with
// power2.inOut — power3 read as "slow → snap → slow", power2 holds a
// gentler middle and lands softer at the screen.
const DOLLY_START = 0.4;
const DOLLY_DUR = 1.7;

const DIVE_PROGRESS_START = 0.4;
const DIVE_PROGRESS_DUR = 1.7;

// Handoff lands right as the dolly finishes (t=2.10s). The 300ms fade
// gives the lobby container more travel than the original 200ms so the
// fade reads as "Hero rising up" rather than "lobby snapped off".
const HANDOFF_START = 2.1;
const HANDOFF_DUR = 0.3;
const SOUNDTRACK_URL = "/audio/soundtrack.mp3";

// Last-flash bloom on the screen mesh — a quick overshoot of the resting
// emissive intensity that visually punctuates the handoff while the lobby
// container fades. Returns to 0 so any frame painted after the fade is dark
// (no flash-bleed into Hero).
const BLOOM_PEAK = 5;
const BLOOM_END = 0;
const BLOOM_RISE_DUR = 0.1;
const BLOOM_FALL_DUR = 0.22;

// Lobby unmount fires ~200ms after the fade completes — gives the fade a
// chance to fully settle to opacity 0 before the WebGL context tears down.
const COMPLETE_AT = 2.6;

interface TransitionDeps {
  camera: PerspectiveCamera;
  screenMesh: Mesh;
  screenMaterial: MeshStandardMaterial | null;
  environment: DeskEnvironmentHandle | null;
  container: HTMLElement | null;
  onDiveProgress: (progress: number) => void;
  onDiveComplete: () => void;
  prefersReducedMotion: boolean;
}

export function playLobbyToSiteTransition(
  deps: TransitionDeps,
): gsap.core.Timeline {
  const {
    camera,
    screenMesh,
    screenMaterial,
    environment,
    container,
    onDiveProgress,
    onDiveComplete,
    prefersReducedMotion,
  } = deps;

  // Reduced-motion path: LobbyGate already bypasses the lobby on this
  // preference; this branch is purely defensive. Snap to end state, fire
  // callbacks, return an empty (but playable) timeline.
  if (prefersReducedMotion) {
    onDiveProgress(1);
    if (container) container.style.opacity = "0";
    startSoundtrack(SOUNDTRACK_URL);
    onDiveComplete();
    return gsap.timeline();
  }

  // Measure the screen mesh's world-space box NOW — the model is settled
  // by the time the user clicks. Need centre (camera looks here) and world
  // height (sets dolly distance via FOV math).
  const worldBox = new Box3().setFromObject(screenMesh);
  const worldCentre = worldBox.getCenter(new Vector3());
  const worldSize = worldBox.getSize(new Vector3());
  const screenWorldH = worldSize.y;

  // Distance such that the screen's height exactly fills the viewport at
  // FOV_PRE_PULL. The 0.98 factor leaves a hairline so the bezel doesn't
  // clip pixel-wise — the ±2px acceptance bar.
  const fovRad = (FOV_PRE_PULL * Math.PI) / 180;
  const fillDistance = (screenWorldH / 2 / Math.tan(fovRad / 2)) * 0.98;
  const targetZ = worldCentre.z + fillDistance;
  const targetX = worldCentre.x;
  const targetY = worldCentre.y;

  const tl = gsap.timeline({ overwrite: "auto" });

  // t=0.00s — FOV pre-pull. updateProjectionMatrix every tick or the tween
  // silently does nothing visible.
  tl.to(
    camera,
    {
      fov: FOV_PRE_PULL,
      duration: FOV_TWEEN_DUR,
      ease: "power2.out",
      onUpdate: () => camera.updateProjectionMatrix(),
    },
    0,
  );

  // t=0.00s — lighting dim. Imperative ratio applied through the
  // environment handle; no React re-renders during the 200ms tween.
  if (environment) {
    const lightingProxy = { ratio: 1 };
    tl.to(
      lightingProxy,
      {
        ratio: LIGHTING_DIM_RATIO,
        duration: LIGHTING_TWEEN_DUR,
        ease: "power2.out",
        onUpdate: () => environment.setLightingDimmer(lightingProxy.ratio),
      },
      0,
    );
  }

  // t=0.20s → 1.60s — dolly. lookAt every tick so the camera stays
  // oriented at the screen centre as it moves in; without this the rig's
  // resting LOOKAT_TARGET would flip past the camera once Z crosses it.
  tl.to(
    camera.position,
    {
      x: targetX,
      y: targetY,
      z: targetZ,
      duration: DOLLY_DUR,
      ease: "power2.inOut",
      onUpdate: () => camera.lookAt(worldCentre),
    },
    DOLLY_START,
  );

  // Dolly window — diveProgress 0 → 1 drives the screen's dither
  // tightening so the "YURI BODO" preview resolves right as we arrive.
  const diveProxy = { p: 0 };
  tl.to(
    diveProxy,
    {
      p: 1,
      duration: DIVE_PROGRESS_DUR,
      ease: "power2.inOut",
      onUpdate: () => onDiveProgress(diveProxy.p),
    },
    DIVE_PROGRESS_START,
  );

  // t=1.60s — handoff. Three things in one beat:
  //   1. emissive bloom on the screen mesh (overshoot then drop to 0)
  //   2. lobby container opacity → 0 (reveals Hero behind)
  //   3. startSoundtrack() — idempotent if Hero already called it
  if (screenMaterial) {
    tl.to(
      screenMaterial,
      {
        emissiveIntensity: BLOOM_PEAK,
        duration: BLOOM_RISE_DUR,
        ease: "power2.in",
      },
      HANDOFF_START,
    ).to(
      screenMaterial,
      {
        emissiveIntensity: BLOOM_END,
        duration: BLOOM_FALL_DUR,
        ease: "power2.out",
      },
      HANDOFF_START + BLOOM_RISE_DUR,
    );
  }

  tl.call(
    () => {
      startSoundtrack(SOUNDTRACK_URL);
    },
    [],
    HANDOFF_START,
  );

  if (container) {
    tl.to(
      container,
      {
        opacity: 0,
        duration: HANDOFF_DUR,
        ease: "power2.out",
      },
      HANDOFF_START,
    );
  }

  // t=2.20s — hand off to the state machine. desk-scene dispatches
  // BOOT_COMPLETE → state goes "booting" → "done" → LobbyGate unmounts.
  tl.call(
    () => {
      onDiveComplete();
    },
    [],
    COMPLETE_AT,
  );

  return tl;
}
