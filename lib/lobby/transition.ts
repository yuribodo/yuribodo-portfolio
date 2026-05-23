// Lobby → site dive transition (issue #10). Single GSAP timeline that runs
// from the moment the user clicks the monitor to Hero's entrance taking over.
//
// Timing (relative to t=0 = timeline start, which itself fires from
// state === "booting"):
//
//   t=0.00s  FOV pre-pull (50 → 47, 200ms, ease "power2.out")
//            Lighting dimmer 1.0 → 0.2 (200ms) — collapses warm/cool beat
//   t=0.20s  Camera dolly into screen plane (1.4s, "power3.inOut")
//   t=0.40s  Boot glyphs reveal progress 0 → 1 (1.0s, linear)
//   t=1.40s  Screen mesh fills viewport (±2px) — verified by debug border
//   t=1.60s  Lobby container opacity 1 → 0 (200ms) → reveals Hero behind
//            startSoundtrack() called — Hero's later call is idempotent
//   t=2.20s  onBootComplete() → desk-scene dispatches BOOT_COMPLETE → "done"
//            LobbyGate watches state and unmounts within ~one frame
//
// FOV pivot from spec: the spec used 33° → 36° as a tension cue. Our base
// FOV is 50° (camera-rig.tsx) — pulling forward to 47° gives the same
// "lens compresses" feel without forcing a global FOV rewrite. Flagged in
// the PR; if Yuri prefers a wider pre-pull (50 → 53) the constant is here.

import gsap from "gsap";
import { Box3, Vector3 } from "three";
import type { Mesh, PerspectiveCamera } from "three";

import { startSoundtrack } from "@/lib/audio-manager";

import type { DeskEnvironmentHandle } from "@/components/lobby/desk-environment";

// Camera-rig's resting FOV is 50° (see camera-rig.tsx). The spec's 33° → 36°
// pre-pull mapped onto our 50° baseline becomes 50° → 47° — same "lens
// compresses, tension before the dive" beat, no global FOV rewrite.
const FOV_PRE_PULL = 47;
const FOV_TWEEN_DUR = 0.2;

const LIGHTING_DIM_RATIO = 0.2;
const LIGHTING_TWEEN_DUR = 0.2;

const DOLLY_START = 0.2;
const DOLLY_DUR = 1.4;

const BOOT_REVEAL_START = 0.4;
const BOOT_REVEAL_DUR = 1.0;

const HANDOFF_START = 1.6;
const HANDOFF_DUR = 0.2;
const SOUNDTRACK_URL = "/audio/soundtrack.mp3";

const COMPLETE_AT = 2.2;

interface TransitionDeps {
  camera: PerspectiveCamera;
  screenMesh: Mesh;
  environment: DeskEnvironmentHandle | null;
  container: HTMLElement | null;
  onBootProgress: (progress: number) => void;
  onBootComplete: () => void;
  prefersReducedMotion: boolean;
}

export function playLobbyToSiteTransition(
  deps: TransitionDeps,
): gsap.core.Timeline {
  const {
    camera,
    screenMesh,
    environment,
    container,
    onBootProgress,
    onBootComplete,
    prefersReducedMotion,
  } = deps;

  // Reduced-motion path: shouldn't normally hit this (LobbyGate bypasses the
  // lobby entirely when prefers-reduced-motion is set) but we keep it as a
  // defensive guard. Snap to end state, fire callbacks, return an empty
  // (but playable) timeline so callers don't crash on .kill().
  if (prefersReducedMotion) {
    onBootProgress(1);
    if (container) container.style.opacity = "0";
    startSoundtrack(SOUNDTRACK_URL);
    onBootComplete();
    return gsap.timeline();
  }

  // Measure the screen mesh's world-space box NOW (not deferred — the model
  // is settled by the time the user clicks). Need both centre (camera looks
  // here) and world height (sets dolly distance via FOV math).
  const worldBox = new Box3().setFromObject(screenMesh);
  const worldCentre = worldBox.getCenter(new Vector3());
  const worldSize = worldBox.getSize(new Vector3());
  const screenWorldH = worldSize.y;

  // Distance such that the screen's height exactly fills the viewport at
  // FOV_PRE_PULL. The 0.98 factor leaves a hairline so the bezel doesn't
  // clip pixel-wise on the screen mesh — the +/-2px acceptance bar.
  const fovRad = (FOV_PRE_PULL * Math.PI) / 180;
  const fillDistance = (screenWorldH / 2 / Math.tan(fovRad / 2)) * 0.98;
  const targetZ = worldCentre.z + fillDistance;
  const targetX = worldCentre.x;
  const targetY = worldCentre.y;

  // Snapshot starting camera position so the kill-mid-flight unmount path
  // doesn't leave the camera mid-tween if the lobby is somehow remounted.
  const startPos = camera.position.clone();

  const tl = gsap.timeline({ overwrite: "auto" });

  // t=0.00s — FOV pre-pull. updateProjectionMatrix on every tick or the
  // tween silently does nothing visible.
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

  // t=0.00s — lighting dim. We tween a plain proxy and write it through the
  // handle each tick. Skipped silently if environment hasn't mounted yet
  // (shouldn't happen in practice — the environment is in the Suspense tree
  // that resolves before any state past "loading").
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

  // t=0.20s → 1.60s — dolly. lookAt every tick so the camera stays oriented
  // at the screen centre as it moves in. Without this the existing drift
  // lookAt(LOOKAT_TARGET) would flip past the camera once Z crosses it.
  tl.to(
    camera.position,
    {
      x: targetX,
      y: targetY,
      z: targetZ,
      duration: DOLLY_DUR,
      ease: "power3.inOut",
      onUpdate: () => camera.lookAt(worldCentre),
    },
    DOLLY_START,
  );

  // t=0.40s → 1.40s — boot glyph reveal. Linear feels right for typing.
  const bootProxy = { p: 0 };
  tl.to(
    bootProxy,
    {
      p: 1,
      duration: BOOT_REVEAL_DUR,
      ease: "none",
      onUpdate: () => onBootProgress(bootProxy.p),
    },
    BOOT_REVEAL_START,
  );

  // t=1.60s — soundtrack starts (idempotent in audio-manager; Hero's later
  // call is a no-op) and the lobby container fades to reveal Hero behind.
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
      onBootComplete();
    },
    [],
    COMPLETE_AT,
  );

  // Bind the startPos to the timeline data so a caller can restore if needed
  // (currently nobody uses this — the lobby unmounts on completion). Kept on
  // the timeline as a non-enumerable hint for future debug.
  Object.defineProperty(tl, "__lobbyStartPos", {
    value: startPos,
    enumerable: false,
  });

  return tl;
}
