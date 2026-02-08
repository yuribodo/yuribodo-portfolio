"use client";

import { useEffect, useRef, useCallback } from "react";
import type { RefObject } from "react";

export function usePongInput(canvasRef: RefObject<HTMLCanvasElement | null>) {
  const paddleYRef = useRef(0.5);

  const getCanvasRelativeY = useCallback((clientY: number): number => {
    const canvas = canvasRef.current;
    if (!canvas) return 0.5;
    const rect = canvas.getBoundingClientRect();
    const y = (clientY - rect.top) / rect.height;
    return Math.max(0, Math.min(1, y));
  }, [canvasRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      paddleYRef.current = getCanvasRelativeY(e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      paddleYRef.current = getCanvasRelativeY(touch.clientY);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        paddleYRef.current = Math.max(0, paddleYRef.current - 0.04);
      } else if (e.key === "ArrowDown") {
        paddleYRef.current = Math.min(1, paddleYRef.current + 0.04);
      }
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canvasRef, getCanvasRelativeY]);

  return paddleYRef;
}
