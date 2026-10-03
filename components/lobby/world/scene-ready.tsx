"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { usePrepared } from "./prepared-group";
import { isWorldSettled } from "./world-ledger";
import { useEffect, useRef } from "react";

/** How long the world may hold the reveal once the desk itself has loaded. A stalled
 * or throttled connection gets the desk with whatever scenery has arrived rather than
 * an endless loader; the skip button is available the whole time. */
const WORLD_WAIT_CAP_MS = 12000;

/** Two rendered frames after the desk, the core landscape and every detail family
 * are prepared. Nothing should still be arriving when the loader leaves. */
export function SceneReady({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  const startedAt = useRef<number | null>(null);
  const prepared = usePrepared();
  const scene = useThree(s => s.scene);
  useFrame(() => {
    startedAt.current ??= performance.now();
    const patienceSpent = performance.now() - startedAt.current > WORLD_WAIT_CAP_MS;
    if (!prepared || !(patienceSpent || isWorldSettled(scene))) { frames.current = 0; return; }
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
