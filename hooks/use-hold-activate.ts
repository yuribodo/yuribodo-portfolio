"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  KeyboardEventHandler,
  PointerEvent as ReactPointerEvent,
  PointerEventHandler,
} from "react";

interface UseHoldActivateOptions {
  duration?: number;
  cooldown?: number;
  onStart?: () => void;
  onComplete: () => void;
  onCancel?: () => void;
  onProgress?: (progress: number) => void;
}

export interface HoldActivateBind {
  onPointerDown: PointerEventHandler<Element>;
  onPointerUp: PointerEventHandler<Element>;
  onPointerLeave: PointerEventHandler<Element>;
  onKeyDown: KeyboardEventHandler<Element>;
  onKeyUp: KeyboardEventHandler<Element>;
}

export interface UseHoldActivateReturn {
  bind: HoldActivateBind;
  progress: number;
  isHolding: boolean;
}

type Phase = "idle" | "holding" | "draining";

const DEFAULT_DURATION_MS = 1800;
const DEFAULT_COOLDOWN_MS = 200;
const DRAIN_DURATION_MS = 300;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function isSpaceEvent(event: ReactKeyboardEvent): boolean {
  return event.key === " " || event.code === "Space";
}

export function useHoldActivate({
  duration = DEFAULT_DURATION_MS,
  cooldown = DEFAULT_COOLDOWN_MS,
  onStart,
  onComplete,
  onCancel,
  onProgress,
}: UseHoldActivateOptions): UseHoldActivateReturn {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  const phaseRef = useRef<Phase>("idle");
  const startTimeRef = useRef(0);
  const drainStartRef = useRef(0);
  const drainFromRef = useRef(0);
  const cooldownUntilRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  const onStartRef = useRef(onStart);
  const onCompleteRef = useRef(onComplete);
  const onCancelRef = useRef(onCancel);
  const onProgressRef = useRef(onProgress);
  const durationRef = useRef(duration);
  const cooldownRef = useRef(cooldown);
  useEffect(() => {
    onStartRef.current = onStart;
    onCompleteRef.current = onComplete;
    onCancelRef.current = onCancel;
    onProgressRef.current = onProgress;
    durationRef.current = duration;
    cooldownRef.current = cooldown;
  });

  const tickRef = useRef<() => void>(() => {});
  useEffect(() => {
    tickRef.current = () => {
      rafIdRef.current = null;
      const now = performance.now();
      const phase = phaseRef.current;

      if (phase === "holding") {
        const elapsed = now - startTimeRef.current;
        const next = Math.min(elapsed / durationRef.current, 1);
        setProgress(next);
        onProgressRef.current?.(next);
        if (next >= 1) {
          if (!completedRef.current) {
            completedRef.current = true;
            onCompleteRef.current();
          }
          phaseRef.current = "idle";
          setIsHolding(false);
          return;
        }
        rafIdRef.current = requestAnimationFrame(() => tickRef.current());
        return;
      }

      if (phase === "draining") {
        const t = Math.min((now - drainStartRef.current) / DRAIN_DURATION_MS, 1);
        const next = drainFromRef.current * (1 - easeOutCubic(t));
        setProgress(next);
        onProgressRef.current?.(next);
        if (t >= 1) {
          phaseRef.current = "idle";
          setProgress(0);
          onProgressRef.current?.(0);
          return;
        }
        rafIdRef.current = requestAnimationFrame(() => tickRef.current());
      }
    };
  }, []);

  const beginHold = useCallback(() => {
    const now = performance.now();
    if (now < cooldownUntilRef.current) return;
    if (phaseRef.current === "holding") return;

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    phaseRef.current = "holding";
    startTimeRef.current = now;
    completedRef.current = false;
    setIsHolding(true);
    setProgress(0);
    onProgressRef.current?.(0);
    onStartRef.current?.();
    rafIdRef.current = requestAnimationFrame(() => tickRef.current());
  }, []);

  const cancelHold = useCallback(() => {
    if (phaseRef.current !== "holding") return;
    const now = performance.now();
    drainFromRef.current = Math.min(
      (now - startTimeRef.current) / durationRef.current,
      1,
    );
    drainStartRef.current = now;
    cooldownUntilRef.current = now + cooldownRef.current;
    phaseRef.current = "draining";
    setIsHolding(false);
    onCancelRef.current?.();
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => tickRef.current());
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  const bind = useMemo<HoldActivateBind>(
    () => ({
      onPointerDown: (event: ReactPointerEvent<Element>) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        beginHold();
      },
      onPointerUp: () => {
        cancelHold();
      },
      onPointerLeave: () => {
        cancelHold();
      },
      onKeyDown: (event: ReactKeyboardEvent<Element>) => {
        if (!isSpaceEvent(event)) return;
        if (event.repeat) return;
        event.preventDefault();
        beginHold();
      },
      onKeyUp: (event: ReactKeyboardEvent<Element>) => {
        if (!isSpaceEvent(event)) return;
        event.preventDefault();
        cancelHold();
      },
    }),
    [beginHold, cancelHold],
  );

  return { bind, progress, isHolding };
}
