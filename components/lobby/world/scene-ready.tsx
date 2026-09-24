"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { usePrepared } from "./prepared-group";
import { useEffect, useRef } from "react";

/** Two rendered frames of the desk, not the valley. The landscape mounts
 * after idle and must not hold the first view. */
export function SceneReady({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  const prepared = usePrepared();
  useFrame(() => {
    if (!prepared) { frames.current = 0; return; }
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
