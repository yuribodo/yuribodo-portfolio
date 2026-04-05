"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export function Craft() {
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let width = 0;
    let height = 0;
    let animFrame = 0;

    function resize() {
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx!.scale(dpr, dpr);
    }
    resize();
    window.addEventListener("resize", resize);

    function handleMouse(e: MouseEvent) {
      const rect = container!.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      };
    }
    container.addEventListener("mousemove", handleMouse);

    // Particle system
    const PARTICLE_COUNT = 120;
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      baseX: number;
      baseY: number;
    }> = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
        baseX: x,
        baseY: y,
      });
    }

    function render(time: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      const mx = mouseRef.current.x * width;
      const my = mouseRef.current.y * height;
      const cursorRadius = 150;

      // Update and draw particles
      for (const p of particles) {
        // Drift
        p.x += p.vx;
        p.y += p.vy;

        // Cursor repulsion
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < cursorRadius && dist > 0) {
          const force = (1 - dist / cursorRadius) * 3;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        // Gentle pull back to base position
        p.vx += (p.baseX - p.x) * 0.003;
        p.vy += (p.baseY - p.y) * 0.003;

        // Breathing motion
        p.vx += Math.sin(time * 0.001 + p.baseX * 0.01) * 0.02;
        p.vy += Math.cos(time * 0.0013 + p.baseY * 0.01) * 0.02;

        // Damping
        p.vx *= 0.96;
        p.vy *= 0.96;

        // Wrap edges
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(250, 75, 18, 0.6)";
        ctx.fill();
      }

      // Draw connections between nearby particles
      ctx.strokeStyle = "rgba(250, 75, 18, 0.08)";
      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.globalAlpha = 1 - dist / 100;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;

      // Central glow near cursor
      const gradient = ctx.createRadialGradient(mx, my, 0, mx, my, 200);
      gradient.addColorStop(0, "rgba(250, 75, 18, 0.04)");
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      animFrame = requestAnimationFrame(render);
    }
    animFrame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("resize", resize);
      container.removeEventListener("mousemove", handleMouse);
    };
  }, [reducedMotion]);

  if (reducedMotion) {
    return <section className="h-[50vh]" />;
  }

  return (
    <section
      ref={containerRef}
      className="relative h-screen w-full overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ imageRendering: "auto" }}
      />
      {/* Subtle center text */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="font-mono text-[10px] tracking-[6px] text-subtle/30">
          MOVE YOUR CURSOR
        </span>
      </div>
    </section>
  );
}
