"use client";

import { useEffect, useRef } from "react";

interface MousePosition {
  x: number;
  y: number;
  normalizedX: number;
  normalizedY: number;
}

export function useMousePosition(
  containerRef: React.RefObject<HTMLElement | null>
): React.RefObject<MousePosition> {
  const positionRef = useRef<MousePosition>({
    x: 0,
    y: 0,
    normalizedX: 0.5,
    normalizedY: 0.5,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleMouseMove(event: MouseEvent) {
      const rect = container!.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      positionRef.current = {
        x,
        y,
        normalizedX: x / rect.width,
        normalizedY: y / rect.height,
      };
    }

    function handleTouchMove(event: TouchEvent) {
      const touch = event.touches[0];
      if (!touch) return;
      const rect = container!.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      positionRef.current = {
        x,
        y,
        normalizedX: x / rect.width,
        normalizedY: y / rect.height,
      };
    }

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("touchmove", handleTouchMove);
    };
  }, [containerRef]);

  return positionRef;
}
