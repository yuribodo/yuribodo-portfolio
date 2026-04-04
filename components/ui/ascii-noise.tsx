"use client";

import { useEffect, useRef } from "react";

const ASCII_CHARS = ".:+*#@%&=~-";

export function AsciiNoise() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const charSize = 12;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${charSize}px JetBrains Mono, monospace`;
      ctx.fillStyle = "rgba(69, 39, 47, 0.15)";

      const cols = Math.ceil(canvas.width / charSize);
      const rows = Math.ceil(canvas.height / charSize);

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (Math.random() > 0.15) continue;
          const char =
            ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)];
          ctx.fillText(char, x * charSize, y * charSize);
        }
      }
    }

    draw();
    const interval = setInterval(draw, 3000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ imageRendering: "auto" }}
    />
  );
}
