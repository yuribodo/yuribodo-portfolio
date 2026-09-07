"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";

/** Mounts inside the desk's Suspense boundary: two actual rendered frames,
 * not a timer, determine when the loaded scene may be revealed. */
export function SceneReady({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  useFrame(() => {
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
