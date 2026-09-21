"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { CORE_WORLD_PARTS } from "./core-world";
import { usePrepared } from "./prepared-group";
import { useEffect, useRef } from "react";

/** Mounts inside the desk's Suspense boundary: two actual rendered frames,
 * not a timer, determine when the loaded scene may be revealed. */
export function SceneReady({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  const prepared = usePrepared();
  const scene = useThree(s => s.scene);
  useFrame(() => {
    if (!prepared || !CORE_WORLD_PARTS.every(id => scene.userData.coreWorld?.[id])) { frames.current = 0; return; }
    if (++frames.current === 2) onReady();
  });
  return null;
}

export function DeskInteraction({ enabled }: { enabled: boolean }) {
  const setEvents = useThree((s) => s.setEvents);
  useEffect(() => {
    setEvents({ enabled });
    return () => setEvents({ enabled: true });
  }, [enabled, setEvents]);
  return null;
}

const WATCHDOG_WINDOW_MS = 2000;
const DEGRADE_BELOW_FPS = 40;
const BAIL_BELOW_FPS = 20;

/** Measures real frames once the desk is interactive. Drops render resolution
 * when the device struggles; hands over to the portfolio when it can't keep up.
 * Windows are wall-clock so hidden tabs / paused frameloops don't count. */
export function FrameWatchdog({ active, onLowFps }: { active: boolean; onLowFps: () => void }) {
  const setDpr = useThree((s) => s.setDpr);
  const stats = useRef({ last: 0, elapsed: 0, frames: 0, windows: 0, slowWindows: 0, degraded: false });
  useFrame(() => {
    const s = stats.current;
    const now = performance.now();
    const dt = now - s.last;
    s.last = now;
    // First frame, hidden tab, or a long pause: not a measurement. Automation
    // (Playwright/audits) runs on software GL and must not get auto-skipped.
    if (!active || dt > 1000 || navigator.webdriver) return;
    s.elapsed += dt;
    s.frames++;
    if (s.elapsed < WATCHDOG_WINDOW_MS) return;
    const fps = (s.frames * 1000) / s.elapsed;
    s.elapsed = 0;
    s.frames = 0;
    // The first window absorbs detail families mounting (long tasks); skip it.
    if (s.windows++ === 0) return;
    if (fps < DEGRADE_BELOW_FPS && !s.degraded) {
      s.degraded = true;
      setDpr(1); // ponytail: one-way drop; restore on recovery if anyone asks.
    }
    s.slowWindows = fps < BAIL_BELOW_FPS ? s.slowWindows + 1 : 0;
    if (s.slowWindows >= 2) {
      console.info(`[lobby] skipped: ${Math.round(fps)} fps sustained`);
      onLowFps();
    }
  });
  return null;
}

/** A background tab must not keep submitting the entire animated world. */
export function SceneVisibility() {
  const setFrameloop = useThree((state) => state.setFrameloop);
  useEffect(() => {
    const update = () => setFrameloop(document.hidden ? 'never' : 'always');
    document.addEventListener('visibilitychange', update);
    update();
    return () => { document.removeEventListener('visibilitychange', update); setFrameloop('always'); };
  }, [setFrameloop]);
  return null;
}
