"use client";

import type { RefObject } from "react";
import type { WorldView } from "@/lib/lobby/world-view";

interface Props {
  view: WorldView;
  loading: boolean;
  busy: boolean;
  lookButton: RefObject<HTMLButtonElement | null>;
  onLook: () => void;
  onReturn: () => void;
  onEnter: () => void;
  onSkip: () => void;
  onTurn: (yaw: number, pitch?: number) => void;
}

const button = "world-button inline-flex min-h-11 items-center justify-center gap-3 rounded-full border border-white/25 bg-[#132a35]/90 px-5 font-mono text-xs text-[#f1f3e7] shadow-lg transition-colors hover:bg-[#274450] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#fff2c7] disabled:cursor-wait disabled:opacity-60";

export function WorldControls({ view, loading, busy, lookButton, onLook, onReturn, onEnter, onSkip, onTurn }: Props) {
  const looking = view === "looking";
  return (
    <>
      <div className="pointer-events-none absolute left-6 top-6 z-20 text-[#183743]">
        <p className="font-mono text-[10px] font-medium tracking-[0.25em]">YURI’S WORLD</p>
        <p className="mt-1 font-mono text-[10px] opacity-75">{looking ? "Looking around" : "At the desk"}</p>
      </div>
      <div
        className="absolute bottom-6 left-6 z-20 flex max-w-[calc(100%-3rem)] flex-wrap items-center gap-2"
        role="group"
        aria-label="World navigation"
        onKeyDown={(e) => {
          if (!looking) return;
          const step = Math.PI / 9;
          if (e.key === "ArrowLeft") onTurn(step);
          else if (e.key === "ArrowRight") onTurn(-step);
          else if (e.key === "ArrowUp") onTurn(0, step / 2);
          else if (e.key === "ArrowDown") onTurn(0, -step / 2);
          else return;
          e.preventDefault();
        }}
      >
        <button ref={lookButton} className={button} disabled={loading || busy || view === "returning"} onClick={looking ? onReturn : onLook} aria-pressed={looking}>
          <span aria-hidden>{looking ? "↩" : "↔"}</span>
          {view === "returning" ? "Returning…" : looking ? "Back to desk" : "Look around"}
        </button>
        {looking && (
          <>
            <button className={`${button} !px-4`} onClick={() => onTurn(Math.PI / 4)} aria-label="Look left">←</button>
            <button className={`${button} !px-4`} onClick={() => onTurn(-Math.PI / 4)} aria-label="Look right">→</button>
            <p id="world-look-help" className="hidden rounded-full bg-[#132a35]/90 px-4 py-3 font-mono text-[10px] text-[#f1f3e7] lg:block">Drag to look · Arrow keys · Esc to return</p>
          </>
        )}
      </div>
      <div className="absolute bottom-6 right-6 z-20">
        <button className={button} disabled={busy} onClick={loading ? onSkip : onEnter}>
          {loading ? "Skip to portfolio" : "Enter portfolio"}<span aria-hidden>↗</span>
        </button>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {loading ? "Loading the desk. You can skip to the portfolio." : looking ? "Look around enabled. Drag to turn, or use the arrow keys in world navigation. Escape returns to the desk." : view === "returning" ? "Returning to the desk." : "At the desk. Explore its objects or enter the portfolio."}
      </p>
    </>
  );
}
