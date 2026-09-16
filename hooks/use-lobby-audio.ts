"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  LobbyAudio,
  readInitialMute,
  type AudioCueId,
} from "@/lib/lobby/audio";

export interface UseLobbyAudioResult {
  isMuted: boolean;
  toggleMuted: () => void;
  play: (id: AudioCueId) => void;
  startAmbient: () => void;
  stopAmbient: () => void;
}

// Owns a single LobbyAudio instance for the lobby's lifetime. The instance
// lives in a ref (stable identity, no re-renders when audio state changes);
// only the mute flag is React state because the toggle button needs to
// re-render on flip. Cleanup disposes the AudioContext on unmount so the
// lobby doesn't leak loops into Hero's soundtrack.
export function useLobbyAudio(ready = true): UseLobbyAudioResult {
  const [isMuted, setIsMuted] = useState<boolean>(() => readInitialMute());
  const audioRef = useRef<LobbyAudio | null>(null);

  useEffect(() => {
    const audio = new LobbyAudio(isMuted);
    audioRef.current = audio;
    return () => {
      audio.dispose();
      audioRef.current = null;
    };
    // Intentional: instantiate once on mount. Subsequent mute changes are
    // pushed through audio.setMuted(), not by re-creating the controller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ready) audioRef.current?.preload().catch(() => {});
  }, [ready]);

  const play = useCallback((id: AudioCueId) => {
    audioRef.current?.play(id);
  }, []);

  const startAmbient = useCallback(() => {
    audioRef.current?.startAmbient();
  }, []);

  const stopAmbient = useCallback(() => {
    audioRef.current?.stopAmbient();
  }, []);

  const toggleMuted = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      audioRef.current?.setMuted(next);
      return next;
    });
  }, []);

  return { isMuted, toggleMuted, play, startAmbient, stopAmbient };
}
