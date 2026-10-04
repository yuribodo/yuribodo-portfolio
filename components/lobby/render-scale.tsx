"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { worldStillArriving } from "./world/world-details";
import {
  createGovernor,
  nativeCeiling,
  RENDER_SCALE_WARMUP_MS,
  resetGovernor,
  stepGovernor,
  type GovernorHold,
} from "@/lib/lobby/render-scale";
import { contextLossDelay } from "@/lib/lobby/context-loss";
import { haveClosedBitmaps } from "@/lib/lobby/texture-upload-queue";
import type { LobbyState } from "./use-lobby-state";

function subscribeToResize(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

/** The pixel-ratio ceiling for this window: native DPR, never above the tier cap. Follows zoom and monitor moves. */
export function useNativeCeiling(maxDpr: number): number {
  return useSyncExternalStore(
    subscribeToResize,
    () => nativeCeiling(maxDpr, window.devicePixelRatio),
    () => maxDpr,
  );
}

function publishScale(canvas: HTMLCanvasElement, scale: number | null) {
  if (scale === null) delete canvas.dataset.renderScale;
  else canvas.dataset.renderScale = String(scale);
}

function holdFor(state: LobbyState, warming: boolean): GovernorHold {
  if (state === "loading" || state === "booting" || warming || document.hidden) return "hard";
  return worldStillArriving() ? "soft" : "none";
}

/** Internal resolution follows frame time. The scene stays; only the pixel count moves.
 * `max` must equal the Canvas `dpr`: this component owns gl.setPixelRatio from mount on.
 * The live scale is readable as `data-render-scale` on the canvas. */
export function RenderScale({ max, state }: { max: number; state: LobbyState }) {
  const gl = useThree(s => s.gl);
  const size = useThree(s => s.size);
  const governor = useRef(createGovernor(max));
  const sized = useRef({ w: size.width, h: size.height });
  const stateRef = useRef(state);
  const warmUntil = useRef(0);

  useEffect(() => {
    stateRef.current = state;
    // The loader hides the world while it is prepared; warmup is measured from the reveal, not from Canvas mount.
    if (state !== "loading") warmUntil.current = performance.now() + RENDER_SCALE_WARMUP_MS;
  }, [state]);

  // Canvas applies `max` itself; the governor only needs to start over from the new ceiling.
  useEffect(() => {
    const canvas = gl.domElement;
    resetGovernor(governor.current, max);
    publishScale(canvas, max);
    return () => publishScale(canvas, null);
  }, [gl, max]);

  useFrame((_, delta) => {
    const current = governor.current;
    if (sized.current.w !== size.width || sized.current.h !== size.height) {
      sized.current = { w: size.width, h: size.height };
      resetGovernor(current, max);
      gl.setPixelRatio(max);
      publishScale(gl.domElement, max);
      return;
    }
    const hold = holdFor(stateRef.current, performance.now() < warmUntil.current);
    const next = stepGovernor(current, delta * 1000, hold);
    if (next === null) return;
    // setPixelRatio already resizes the drawing buffer; a second setSize would reallocate the MSAA target twice.
    gl.setPixelRatio(next);
    publishScale(gl.domElement, next);
  });

  return null;
}

/** Context loss mid-lobby rebuilds every texture and program unstaged inside render calls. After a grace period
 * without `webglcontextrestored`, skip to the portfolio; a quick restore keeps the lobby. Once bitmaps are released
 * a restore cannot re-upload them, so the skip is immediate and no restore is awaited. */
export function ContextLossGuard({ onLost }: { onLost: () => void }) {
  const canvas = useThree(s => s.gl.domElement);
  useEffect(() => {
    let timer = 0;
    const handleLost = () => {
      const delay = contextLossDelay(haveClosedBitmaps());
      console.info(delay ? "[lobby] webglcontextlost" : "[lobby] webglcontextlost: skipping, bitmaps already released");
      window.clearTimeout(timer);
      if (delay) timer = window.setTimeout(onLost, delay);
      else onLost();
    };
    const handleRestored = () => {
      console.info("[lobby] webglcontextrestored");
      window.clearTimeout(timer);
    };
    canvas.addEventListener("webglcontextlost", handleLost);
    canvas.addEventListener("webglcontextrestored", handleRestored);
    return () => {
      window.clearTimeout(timer);
      canvas.removeEventListener("webglcontextlost", handleLost);
      canvas.removeEventListener("webglcontextrestored", handleRestored);
    };
  }, [canvas, onLost]);
  return null;
}
