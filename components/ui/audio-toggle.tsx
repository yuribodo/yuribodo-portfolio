"use client";

import { useAudio } from "@/hooks/use-audio";

export function AudioToggle() {
  const { isMuted, toggle } = useAudio();

  return (
    <button
      onClick={toggle}
      className="fixed bottom-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted transition-all duration-300 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      aria-label={isMuted ? "Unmute audio" : "Mute audio"}
    >
      <span className="font-mono text-xs">
        {isMuted ? "OFF" : "ON"}
      </span>
    </button>
  );
}
