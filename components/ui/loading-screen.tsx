"use client";

import { useEffect, useState } from "react";

export function LoadingScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  // Lock scroll during loading
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    // Simulate loading progress
    const start = performance.now();
    const duration = 1500; // 1.5s loading

    function tick() {
      const elapsed = performance.now() - start;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);

      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        // Small delay before fade out
        setTimeout(() => {
          document.body.style.overflow = "";
          setIsLoading(false);
        }, 200);
      }
    }
    requestAnimationFrame(tick);
  }, []);

  if (!isLoading) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background"
      style={{
        opacity: progress >= 1 ? 0 : 1,
        transition: "opacity 0.5s cubic-bezier(0.65, 0.05, 0, 1)",
        pointerEvents: progress >= 1 ? "none" : "auto",
      }}
    >
      <span className="font-sans text-2xl font-black tracking-[-1px] text-foreground-bright">
        YURI <span className="text-accent">BODO</span>
      </span>

      {/* Progress bar */}
      <div className="mt-6 h-[1px] w-32 bg-border">
        <div
          className="h-full bg-accent"
          style={{
            width: `${progress * 100}%`,
            transition: "width 0.1s linear",
          }}
        />
      </div>
    </div>
  );
}
