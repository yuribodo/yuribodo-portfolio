"use client";

import { useEffect, useRef } from "react";
import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";

interface PretextHeadlineProps {
  text: string;
  className?: string;
}

interface CharInfo {
  char: string;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
}

export function PretextHeadline({ text, className }: PretextHeadlineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const charsRef = useRef<CharInfo[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const font = "900 48px Archivo, system-ui, sans-serif";

    function setupCanvas() {
      if (!canvas || !ctx || !container) return;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      ctx.scale(dpr, dpr);

      // Use Pretext to measure and layout
      const prepared = prepareWithSegments(text, font);
      const result = layoutWithLines(prepared, rect.width, 56);

      // Build character positions
      const chars: CharInfo[] = [];
      let lineY = 0;

      for (const line of result.lines) {
        let charX = 0;
        ctx.font = font;

        for (const char of line.text) {
          if (char === "\n") continue;
          const w = ctx.measureText(char).width;
          chars.push({
            char,
            x: charX,
            y: lineY + 48, // baseline offset
            baseX: charX,
            baseY: lineY + 48,
          });
          charX += w;
        }
        lineY += 56;
      }

      charsRef.current = chars;
    }

    setupCanvas();
    window.addEventListener("resize", setupCanvas);

    function handleMouse(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    container.addEventListener("mousemove", handleMouse);
    container.addEventListener("mouseleave", () => {
      mouseRef.current = { x: -1000, y: -1000 };
    });

    function render() {
      if (!ctx || !canvas) return;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const radius = 80;

      ctx.font = font;
      ctx.textBaseline = "alphabetic";

      for (const c of charsRef.current) {
        // Calculate displacement from cursor
        const dx = c.baseX - mx;
        const dy = c.baseY - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < radius && dist > 0) {
          const force = (1 - dist / radius) * 12;
          const targetX = c.baseX + (dx / dist) * force;
          const targetY = c.baseY + (dy / dist) * force;
          c.x += (targetX - c.x) * 0.15;
          c.y += (targetY - c.y) * 0.15;
        } else {
          c.x += (c.baseX - c.x) * 0.1;
          c.y += (c.baseY - c.y) * 0.1;
        }

        // Color: foreground-bright
        ctx.fillStyle = "#ede4df";
        ctx.fillText(c.char, c.x, c.y);
      }

      animRef.current = requestAnimationFrame(render);
    }
    animRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", setupCanvas);
      container.removeEventListener("mousemove", handleMouse);
    };
  }, [text]);

  return (
    <div ref={containerRef} className={className} style={{ minHeight: "120px" }}>
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ imageRendering: "auto" }}
      />
    </div>
  );
}
