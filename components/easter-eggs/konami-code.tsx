"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const PongGame = dynamic(
  () => import("@/components/pong/pong-game").then((m) => m.PongGame),
  { ssr: false }
);

const KONAMI_SEQUENCE = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "b", "a",
];

export function KonamiCode() {
  const [isActive, setIsActive] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isActive) return;

      if (e.key === KONAMI_SEQUENCE[indexRef.current]) {
        indexRef.current++;
        if (indexRef.current === KONAMI_SEQUENCE.length) {
          setIsActive(true);
          indexRef.current = 0;
        }
      } else {
        indexRef.current = 0;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <PongGame />
      <button
        onClick={() => setIsActive(false)}
        className="fixed right-4 top-4 z-[101] rounded border border-border bg-surface px-3 py-1 font-mono text-xs text-muted transition-colors duration-300 hover:text-accent"
      >
        ESC
      </button>
    </div>
  );
}
