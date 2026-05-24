"use client";

import { useEffect, useRef } from "react";

import {
  registerPulseTarget,
  unregisterPulseTarget,
} from "@/lib/lobby/pulse-registry";

/** Registers an object as a pulse target for the first-pointermove discovery
 *  sweep (issue #14, part B). The `id` must be stable for the component's
 *  lifetime; `pulse` may change freely between renders — we always invoke the
 *  latest version via a ref so a re-render of the consumer doesn't deregister
 *  and re-register on every render. */
export function usePulseTarget(id: string, pulse: () => void): void {
  const pulseRef = useRef(pulse);
  // Mirror the latest callback in a ref. React 19's react-hooks/refs rule
  // forbids writing to refs during render, so we use an effect without
  // dependencies — runs after every render, same pattern as use-hold-activate.
  useEffect(() => {
    pulseRef.current = pulse;
  });

  useEffect(() => {
    registerPulseTarget(id, () => pulseRef.current());
    return () => unregisterPulseTarget(id);
  }, [id]);
}
