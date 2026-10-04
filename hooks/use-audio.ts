"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  getIsMuted,
  resumeOnGesture,
  subscribeMuted,
  toggleMute,
} from "@/lib/audio-manager";

export function useAudio() {
  // Server snapshot stays false so a muted visitor hydrates against the SSR markup, then updates.
  const isMuted = useSyncExternalStore(subscribeMuted, getIsMuted, () => false);

  useEffect(() => {
    function handleInteraction() {
      resumeOnGesture();
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    }

    window.addEventListener("click", handleInteraction, { once: true });
    window.addEventListener("keydown", handleInteraction, { once: true });

    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, []);

  const toggle = useCallback(() => {
    toggleMute();
  }, []);

  return { isMuted, toggle };
}
