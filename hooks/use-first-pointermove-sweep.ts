"use client";

import { useEffect } from "react";

import {
  consumeSweepToken,
  pickRandomPulseTargets,
} from "@/lib/lobby/pulse-registry";

interface UseFirstPointermoveSweepOptions {
  /** When true, the hook arms the listener. Pass false (e.g. when state !==
   *  "idle") to keep the sweep from firing during loading. */
  enabled: boolean;
  /** Min / max objects to pulse. Spec calls for 3–4 from the desk excluding
   *  the monitor; fewer if the registry is smaller (e.g. early in development
   *  when only the figures are registered). */
  min?: number;
  max?: number;
  /** Delay between pulses in ms. Spec: 100ms reads as choreographed without
   *  feeling slow. */
  staggerMs?: number;
}

const DEFAULT_MIN = 3;
const DEFAULT_MAX = 4;
const DEFAULT_STAGGER_MS = 100;

export function useFirstPointermoveSweep({
  enabled,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
  staggerMs = DEFAULT_STAGGER_MS,
}: UseFirstPointermoveSweepOptions): void {
  useEffect(() => {
    if (!enabled) return;
    // Use `once: true` so the listener self-removes after the first event.
    // consumeSweepToken() is the second line of defence — if enabled flips
    // false then true (state machine churn during dev), we still fire only
    // once per session.
    const timeouts: number[] = [];

    function handlePointerMove() {
      if (!consumeSweepToken()) return;
      const targets = pickRandomPulseTargets(min, max);
      targets.forEach((pulse, index) => {
        const id = window.setTimeout(() => pulse(), index * staggerMs);
        timeouts.push(id);
      });
    }

    window.addEventListener("pointermove", handlePointerMove, { once: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [enabled, min, max, staggerMs]);
}
