"use client";

import { useEffect } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { pulseArrival } from "@/lib/lobby/pulse-registry";
import { subscribeWorldArriving, worldStillArriving } from "@/components/lobby/world/world-details";

const FIRST_BEAT_MS = 700;
const BEAT_MS = 1400;

/** While detail families are still mounting, wake the desk one object at a time. */
export function useArrivalPulse(enabled: boolean): void {
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!enabled || reducedMotion) return;
    let index = 0;
    let timer = 0;
    const stop = () => window.clearTimeout(timer);
    const beat = () => {
      if (!worldStillArriving()) return;
      pulseArrival(index);
      index += 1;
      timer = window.setTimeout(beat, BEAT_MS);
    };
    const start = () => {
      if (timer || !worldStillArriving()) return;
      timer = window.setTimeout(beat, FIRST_BEAT_MS);
    };
    const unsubscribe = subscribeWorldArriving(start);
    start();
    return () => {
      stop();
      unsubscribe();
    };
  }, [enabled, reducedMotion]);
}
