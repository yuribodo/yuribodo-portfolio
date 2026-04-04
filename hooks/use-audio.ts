"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getIsMuted,
  resumeOnGesture,
  toggleMute,
} from "@/lib/audio-manager";

export function useAudio() {
  const [isMuted, setIsMuted] = useState(() => getIsMuted());

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
    const newMuted = toggleMute();
    setIsMuted(newMuted);
  }, []);

  return { isMuted, toggle };
}
