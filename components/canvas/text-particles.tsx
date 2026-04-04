"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Particle, ParticleEngine } from "./particle-engine";
import { useMousePosition } from "@/hooks/use-mouse-position";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface TextParticlesProps {
  text: string;
  fontSize: number;
  color: string;
  onBootComplete?: () => void;
}

const BOOT_LINES = [
  { text: "GAME_WORLD OS v2.0", delay: 0 },
  { text: "Initializing render engine... OK", delay: 400 },
  { text: "Loading protagonist... OK", delay: 800 },
  { text: "Preparing canvas... OK", delay: 1200 },
];

export function TextParticles({
  text,
  fontSize,
  color,
  onBootComplete,
}: TextParticlesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ParticleEngine>(new ParticleEngine());
  const animFrameRef = useRef<number>(0);
  const mousePos = useMousePosition(containerRef);
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<"boot" | "spawn" | "interactive">("boot");
  const bootLinesRef = useRef<HTMLDivElement>(null);

  // Measure text and create particles
  const createParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const displayWidth = canvas.getBoundingClientRect().width;
    const displayHeight = canvas.getBoundingClientRect().height;

    ctx.font = `900 ${fontSize}px Archivo, system-ui, sans-serif`;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;

    const centerX = displayWidth / 2;
    const centerY = displayHeight / 2;
    const startX = centerX - textWidth / 2;

    const particles: Particle[] = [];
    let offsetX = 0;

    for (const char of text) {
      if (char === " ") {
        offsetX += ctx.measureText(" ").width;
        continue;
      }
      const charWidth = ctx.measureText(char).width;
      const targetX = startX + offsetX + charWidth / 2;
      const targetY = centerY;

      // Start from random positions (explosion effect)
      const angle = Math.random() * Math.PI * 2;
      const dist = 200 + Math.random() * 300;
      particles.push({
        char,
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        targetX,
        targetY,
        velocityX: 0,
        velocityY: 0,
        fontSize,
        color,
      });
      offsetX += charWidth;
    }

    engineRef.current.setParticles(particles);
  }, [text, fontSize, color]);

  // Boot sequence
  useGSAP(() => {
    if (reducedMotion) {
      setPhase("interactive");
      onBootComplete?.();
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        setPhase("spawn");
        createParticles();
        // Fade boot lines
        gsap.to(bootLinesRef.current, {
          opacity: 0,
          duration: 0.5,
          onComplete: () => {
            setPhase("interactive");
            onBootComplete?.();
          },
        });
      },
    });

    // Animate boot lines in
    BOOT_LINES.forEach((line, i) => {
      tl.fromTo(
        `[data-boot-line="${i}"]`,
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" },
        line.delay / 1000
      );
    });
  }, [reducedMotion]);

  // Canvas render loop
  useEffect(() => {
    if (phase !== "spawn" && phase !== "interactive") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx!.scale(dpr, dpr);
    }
    resize();
    window.addEventListener("resize", resize);

    let lastTime = performance.now();
    function loop(now: number) {
      const delta = now - lastTime;
      lastTime = now;

      ctx!.clearRect(0, 0, canvas!.width / dpr, canvas!.height / dpr);
      engineRef.current.update(
        mousePos.current.x,
        mousePos.current.y,
        delta
      );
      engineRef.current.render(ctx!);
      animFrameRef.current = requestAnimationFrame(loop);
    }
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [phase, mousePos]);

  // Reduced motion: static render
  if (reducedMotion) {
    return (
      <div
        ref={containerRef}
        className="flex h-screen w-full items-center justify-center"
      >
        <h1
          className="font-sans text-foreground-bright"
          style={{ fontSize, fontWeight: 900, letterSpacing: "-2px" }}
        >
          {text}
        </h1>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-screen w-full">
      {/* Boot sequence overlay */}
      {phase === "boot" && (
        <div
          ref={bootLinesRef}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2"
        >
          {BOOT_LINES.map((line, i) => (
            <div
              key={i}
              data-boot-line={i}
              className="font-mono text-sm text-subtle opacity-0"
            >
              {line.text}
            </div>
          ))}
        </div>
      )}

      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ imageRendering: "auto" }}
      />
    </div>
  );
}
