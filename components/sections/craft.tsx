"use client";

import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

gsap.registerPlugin(ScrollTrigger);

interface Dot {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  radius: number;
}

export function Craft() {
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const morphRef = useRef({ progress: 0 });
  const reducedMotion = useReducedMotion();

  // ScrollTrigger drives the morph progress
  useGSAP(() => {
    if (!containerRef.current || reducedMotion) return;

    // Circle clip-path reveal
    gsap.fromTo(
      containerRef.current,
      { clipPath: "circle(5% at 50% 50%)" },
      {
        clipPath: "circle(80% at 50% 50%)",
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 85%",
          end: "top 30%",
          scrub: 1,
        },
      }
    );

    // Morph particles from random to text shape
    gsap.to(morphRef.current, {
      progress: 1,
      ease: "none",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 60%",
        end: "top -20%",
        scrub: 1,
      },
    });
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let w = 0;
    let h = 0;
    let dots: Dot[] = [];
    let animFrame = 0;

    function getTextPositions(text: string, fontSize: number): Array<{ x: number; y: number }> {
      if (!ctx) return [];
      // Render text to a temp canvas, sample pixel positions
      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) return [];

      tempCanvas.width = w;
      tempCanvas.height = h;
      tempCtx.font = `900 ${fontSize}px Archivo, system-ui, sans-serif`;
      tempCtx.fillStyle = "#fff";
      tempCtx.textAlign = "center";
      tempCtx.textBaseline = "middle";
      tempCtx.fillText(text, w / 2, h / 2);

      const imageData = tempCtx.getImageData(0, 0, w, h);
      const positions: Array<{ x: number; y: number }> = [];
      const gap = 4; // Sample every 4 pixels

      for (let y = 0; y < h; y += gap) {
        for (let x = 0; x < w; x += gap) {
          const idx = (y * w + x) * 4;
          if (imageData.data[idx + 3] > 128) {
            positions.push({ x, y });
          }
        }
      }
      return positions;
    }

    function setup() {
      const rect = container!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = w + "px";
      canvas!.style.height = h + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Get text target positions
      const fontSize = Math.min(w * 0.15, 120);
      const textPositions = getTextPositions("CRAFT", fontSize);

      // Create dots — enough to fill text + extras floating
      const totalDots = Math.max(textPositions.length, 300);
      dots = [];

      for (let i = 0; i < totalDots; i++) {
        const hasTarget = i < textPositions.length;
        const originX = Math.random() * w;
        const originY = Math.random() * h;

        dots.push({
          x: originX,
          y: originY,
          targetX: hasTarget ? textPositions[i].x : Math.random() * w,
          targetY: hasTarget ? textPositions[i].y : Math.random() * h,
          originX,
          originY,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: hasTarget ? 1.5 : Math.random() * 1 + 0.3,
        });
      }
    }

    setup();
    window.addEventListener("resize", setup);

    function handleMouse(e: MouseEvent) {
      const rect = container!.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    function handleMouseLeave() {
      mouseRef.current = { x: -1000, y: -1000 };
    }
    container.addEventListener("mousemove", handleMouse);
    container.addEventListener("mouseleave", handleMouseLeave);

    function render(time: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const cursorRadius = 100;
      const morph = morphRef.current.progress;

      for (const d of dots) {
        // Lerp between origin (random) and target (text) based on morph progress
        const goalX = d.originX + (d.targetX - d.originX) * morph;
        const goalY = d.originY + (d.targetY - d.originY) * morph;

        // Spring to goal
        d.vx += (goalX - d.x) * 0.04;
        d.vy += (goalY - d.y) * 0.04;

        // Cursor repulsion
        const dx = d.x - mx;
        const dy = d.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < cursorRadius && dist > 0) {
          const force = (1 - dist / cursorRadius) * 4;
          d.vx += (dx / dist) * force;
          d.vy += (dy / dist) * force;
        }

        // Breathing when scattered
        if (morph < 0.5) {
          d.vx += Math.sin(time * 0.001 + d.originX * 0.01) * 0.01;
          d.vy += Math.cos(time * 0.0013 + d.originY * 0.01) * 0.01;
        }

        // Damping
        d.vx *= 0.9;
        d.vy *= 0.9;

        d.x += d.vx;
        d.y += d.vy;

        // Draw
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
        // Color: accent when formed, muted when scattered
        const alpha = 0.3 + morph * 0.5;
        ctx.fillStyle = `rgba(250, 75, 18, ${alpha})`;
        ctx.fill();
      }

      // Connections when scattered (fade out as they form text)
      if (morph < 0.7) {
        ctx.strokeStyle = `rgba(250, 75, 18, ${0.06 * (1 - morph)})`;
        ctx.lineWidth = 0.5;
        for (let i = 0; i < dots.length; i += 3) {
          for (let j = i + 3; j < dots.length; j += 3) {
            const ddx = dots[i].x - dots[j].x;
            const ddy = dots[i].y - dots[j].y;
            const dd = ddx * ddx + ddy * ddy;
            if (dd < 8000) {
              ctx.beginPath();
              ctx.moveTo(dots[i].x, dots[i].y);
              ctx.lineTo(dots[j].x, dots[j].y);
              ctx.stroke();
            }
          }
        }
      }

      animFrame = requestAnimationFrame(render);
    }
    animFrame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("resize", setup);
      container.removeEventListener("mousemove", handleMouse);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [reducedMotion]);

  if (reducedMotion) {
    return (
      <section className="flex h-screen items-center justify-center">
        <span className="font-sans text-6xl font-black text-accent/20">CRAFT</span>
      </section>
    );
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
    </section>
  );
}
