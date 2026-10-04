"use client";

import dynamic from "next/dynamic";
import { lobbyAssetUrl } from "@/lib/lobby/asset-url";
import { preload } from "react-dom";
import { LOBBY_MODELS } from "@/lib/lobby/asset-manifest";
import { useCallback, useEffect, useRef, useState } from "react";
import { createReleaseScheduler } from "@/lib/lobby/release-scheduler";
import { getLobbyAdmission, type LobbyBlockReason, type LobbyScale } from "@/lib/lobby/gpu-detect";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useLobbyVisited } from "@/hooks/use-lobby-visited";
import { LobbyLoading } from "./lobby-loading";
import { useLobbyState } from "./use-lobby-state";
import { WorldBoundary } from "./world/world-boundary";

// R3F disposes the Canvas 500 ms after unmount; clear the loader caches after that.
const CANVAS_TEARDOWN_MS = 1500;
const lobbyRelease = createReleaseScheduler(() => import("@/lib/lobby/release-assets"), CANVAS_TEARDOWN_MS);

/** Desk and monitor only. The valley starts after the desk is on screen. */
function preloadDeskModels() {
  for (const url of [LOBBY_MODELS.desk, LOBBY_MODELS.monitor]) {
    preload(lobbyAssetUrl(url), { as: "fetch", crossOrigin: "anonymous" });
  }
  performance.mark("lobby:preload");
}

const DeskScene = dynamic(() => import("./desk-scene"), {
  ssr: false,
  // The gate's one loader covers the chunk download too; a second copy here would restart its animation.
  loading: () => null,
});

export function LobbyGate() {
  const reducedMotion = useReducedMotion();
  const { markVisited } = useLobbyVisited();
  const [state, dispatch] = useLobbyState();
  // Tri-state so we never flash the lobby for a frame on weak devices while
  // probing. null = probing, reason = blocked (portfolio directly), false = go.
  const [blocked, setBlocked] = useState<LobbyBlockReason | false | null>(null);
  const [scale, setScale] = useState<LobbyScale>({ maxDpr: 1.5, shadow: 2048 });
  const sceneRequested = useRef(false);

  const skip = useCallback(() => dispatch({ type: "SKIP" }), [dispatch]);

  useEffect(() => {
    // One-shot probe of device signals + WebGL renderer. Setting state in an
    // effect is appropriate here: the values live in browser APIs, not React,
    // and this single read on mount gates the heavy 3D bundle from loading.
    // A lazy useState initializer would run during SSR where `window` is undefined.
    // A replay must not lose its caches to the previous run's release, nor reuse scenes whose bitmaps closed.
    lobbyRelease.cancel();
    // The fetches start inside the probe, before its blocking first-context init.
    const admission = getLobbyAdmission(preloadDeskModels);
    if (admission.block) {
      // Surfaced as info (not warn) so it shows in normal devtools without
      // dirtying the console for end users.
      console.info(`[lobby] skipped: ${admission.block}`);
    }
    sceneRequested.current = !admission.block;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBlocked(admission.block ?? false);
    setScale(admission.scale);
  }, []);

  useEffect(() => {
    if (state !== "done") return;
    markVisited();
    // Also covers SKIP while still loading: late arrivals lose their cache entry.
    if (sceneRequested.current) lobbyRelease.schedule();
  }, [state, markVisited]);

  const blocksPage = !reducedMotion && state !== "done" && !blocked;
  useEffect(() => {
    if (!blocksPage) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [blocksPage]);

  useEffect(() => {
    if (state === "done" || state === "booting" || blocked || reducedMotion) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      dispatch({ type: "SKIP" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, blocked, reducedMotion, dispatch]);

  if (state === "done") return null;
  const hasScene = blocked === false && !reducedMotion;
  // Keep server and hydration markup identical while browser capabilities resolve.
  if (!hasScene && blocked !== null) return null;

  return (
    <>
      {hasScene && (
        // A failed chunk load or Canvas creation lands on the portfolio, not Next's error page.
        <WorldBoundary onError={skip}>
          <DeskScene
            state={state}
            dispatch={dispatch}
            scale={scale}
          />
        </WorldBoundary>
      )}
      {/* One loader from first paint until the world is ready: capability probe, scene bundle, desk and
          landscape. It stays mounted across all three, so it never restarts or swaps for a second screen.
          Later in the DOM than the scene so it paints above it. */}
      {state === "loading" && <LobbyLoading onSkip={skip} />}
    </>
  );
}
