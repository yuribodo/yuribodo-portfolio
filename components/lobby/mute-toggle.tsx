"use client";

interface MuteToggleProps {
  isMuted: boolean;
  onToggle: () => void;
}

// Fixed top-right speaker button. Sits above the Canvas in stacking order so
// it stays clickable through every lobby state. Visual language mirrors the
// lobby's dark aesthetic — semi-transparent dark bg, hairline border that
// warms on hover, focus ring tinted with the desk's warm key colour.
export function MuteToggle({ isMuted, onToggle }: MuteToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Toggle sound"
      aria-pressed={isMuted}
      className="
        group fixed right-4 top-4 z-20
        flex h-10 w-10 items-center justify-center
        rounded-full border border-foreground/15 bg-background/60
        text-foreground/70 backdrop-blur-sm
        transition-[color,background-color,border-color] duration-200
        hover:border-foreground-bright/35 hover:bg-background/80 hover:text-foreground-bright
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground-bright/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background
      "
    >
      <SpeakerIcon muted={isMuted} />
    </button>
  );
}

// Inline SVG over an icon dep — two glyphs, ~30 LOC, not worth a package.
// Stroke values match lucide's 2px / round joinery so the icon reads as
// part of the same family if we ever switch.
function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11 5 6 9H3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3l5 4z" />
      {muted ? (
        <>
          <line x1="22" y1="9" x2="16" y2="15" />
          <line x1="16" y1="9" x2="22" y2="15" />
        </>
      ) : (
        <>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </>
      )}
    </svg>
  );
}
