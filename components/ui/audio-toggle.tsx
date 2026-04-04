"use client";

import { useAudio } from "@/hooks/use-audio";

export function AudioToggle() {
  const { isMuted, toggle } = useAudio();

  return (
    <button
      onClick={toggle}
      className="fixed bottom-4 right-4 z-50 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface/80 text-muted backdrop-blur-sm transition-premium hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      aria-label={isMuted ? "Unmute audio" : "Mute audio"}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        {isMuted ? (
          <line x1="23" y1="9" x2="17" y2="15" />
        ) : (
          <>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" opacity="0.3" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </>
        )}
      </svg>
    </button>
  );
}
