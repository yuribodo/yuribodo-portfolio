"use client";

import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { startSoundtrack } from "@/lib/audio-manager";

gsap.registerPlugin(ScrollTrigger);

// 4x4 Bayer dithering matrix
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

// Normalize Bayer matrix to 0-1 range
const BAYER_NORMALIZED = BAYER_4X4.map((row) =>
  row.map((v) => v / 16)
);

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);

  const linksRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const ditherRef = useRef({ strength: 0.4 });
  const reducedMotion = useReducedMotion();

  // Entrance animations
  useGSAP(() => {
    if (reducedMotion) return;

    // Start fully dithered
    ditherRef.current.strength = 0.8;

    const tl = gsap.timeline({ delay: 2.2 });

    // Phase 1: Dissolve dither
    tl.to(ditherRef.current, {
      strength: 0.4,
      duration: 1.5,
      ease: "power2.out",
    });

    // Phase 2: Characters drop in with overshoot bounce
    tl.from(
      "[data-hero-char]",
      {
        y: -120,
        opacity: 0,
        scale: 1.3,
        rotation: () => gsap.utils.random(-15, 15),
        duration: 1,
        stagger: 0.06,
        ease: "back.out(1.7)",
      },
      "-=1.2"
    );

    // Phase 3: Subtitle
    tl.from(
      subtitleRef.current,
      {
        y: 20,
        opacity: 0,
        duration: 0.8,
        ease: "power2.out",
      },
      "-=0.4"
    );

    // Links
    tl.from(
      linksRef.current,
      {
        y: 15,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
      },
      "-=0.3"
    );

    // Scroll indicator
    tl.from(
      scrollRef.current,
      {
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
      },
      "-=0.2"
    );

    // Start soundtrack after entrance
    tl.call(() => {
      startSoundtrack("/audio/soundtrack.mp3");
    });

    // Exit: gentle fade-out on scroll
    const exitTl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top top",
        end: "+=100%",
        pin: true,
        scrub: 0.8,
      },
    });

    // First 30% of scroll: nothing happens (dead zone)
    exitTl.to({}, { duration: 0.3 });

    // Remaining 70%: gentle exit — explicit fromTo for clean reversal
    exitTl.fromTo(overlayRef.current, {
      scale: 1,
      opacity: 1,
      filter: "blur(0px)",
    }, {
      scale: 0.9,
      opacity: 0,
      filter: "blur(4px)",
      duration: 0.7,
      ease: "power1.in",
    }, 0.3);
  }, [reducedMotion]);

  // Dithering canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reducedMotion) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Placeholder: animated gradient (replace with video later)
    const offscreen = document.createElement("canvas");
    const offCtx = offscreen.getContext("2d");
    if (!offCtx) return;

    function resize() {
      if (!canvas) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Render at lower resolution for performance + aesthetic
      const scale = 0.5;
      canvas.width = Math.floor(w * scale);
      canvas.height = Math.floor(h * scale);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
    }
    resize();
    window.addEventListener("resize", resize);

    function drawGradient(time: number) {
      if (!offCtx) return;
      const w = offscreen.width;
      const h = offscreen.height;

      // Animated warm gradient (placeholder for video)
      const t = time * 0.0003;
      const grad = offCtx.createLinearGradient(
        w * (0.3 + Math.sin(t) * 0.2),
        0,
        w * (0.7 + Math.cos(t * 0.7) * 0.2),
        h
      );
      grad.addColorStop(0, "#1a1a1a");
      grad.addColorStop(0.3, "#45272f");
      grad.addColorStop(0.5, "#2e2024");
      grad.addColorStop(0.7, "#9f5454");
      grad.addColorStop(1, "#1a1a1a");
      offCtx.fillStyle = grad;
      offCtx.fillRect(0, 0, w, h);

      // Add some noise/variation
      const grad2 = offCtx.createRadialGradient(
        w * (0.5 + Math.sin(t * 1.3) * 0.3),
        h * (0.5 + Math.cos(t * 0.9) * 0.3),
        0,
        w * 0.5,
        h * 0.5,
        w * 0.6
      );
      grad2.addColorStop(0, "rgba(250, 75, 18, 0.15)");
      grad2.addColorStop(1, "transparent");
      offCtx.fillStyle = grad2;
      offCtx.fillRect(0, 0, w, h);
    }

    function applyDithering(strength: number) {
      if (!ctx || !canvas) return;
      const w = canvas.width;
      const h = canvas.height;

      // Draw source (gradient placeholder or video frame)
      ctx.drawImage(offscreen, 0, 0);

      if (strength <= 0.01) return; // Skip dithering when fully revealed

      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const colorLevels = Math.max(2, Math.round(2 + (1 - strength) * 14)); // 2 colors at max dither, 16 at no dither

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const threshold = BAYER_NORMALIZED[y % 4][x % 4];

          for (let c = 0; c < 3; c++) {
            const value = data[idx + c] / 255;
            const quantized =
              Math.floor(value * (colorLevels - 1) + threshold * strength) /
              (colorLevels - 1);
            data[idx + c] = Math.min(255, Math.max(0, quantized * 255));
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
    }

    function loop(now: number) {
      drawGradient(now);
      applyDithering(ditherRef.current.strength);
      animFrameRef.current = requestAnimationFrame(loop);
    }
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [reducedMotion]);


  if (reducedMotion) {
    return (
      <section className="flex h-[100dvh] w-full items-center justify-center px-6">
        <div className="text-center">
          <h1 className="whitespace-nowrap font-sans text-[clamp(2.75rem,14vw,140px)] font-black leading-[0.95] tracking-[-0.04em] text-foreground-bright">
            YURI <span className="text-accent">BODO</span>
          </h1>
          <p className="mt-6 font-sans text-xs font-semibold uppercase tracking-[0.25em] text-foreground md:text-sm md:tracking-[4px]">
            Full Stack Engineer
          </p>
          <p className="mt-2 font-mono text-[10px] text-foreground/60 md:text-xs">
            TypeScript · React · Node.js · Go · Python · Web3
          </p>
          <div className="mt-8 flex items-center justify-center gap-6">
            <a
              href="https://github.com/yuribodo"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-foreground/60 transition-premium hover:text-accent"
            >
              GitHub ↗
            </a>
            <a
              href="https://www.linkedin.com/in/mario-lara-1a801b272/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-foreground/60 transition-premium hover:text-accent"
            >
              LinkedIn ↗
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="relative h-[100dvh] w-full overflow-hidden bg-background"
    >
      {/* Dithered canvas background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 canvas-pixelated"
      />

      {/* Content overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 flex flex-col items-center justify-center px-6"
      >
        <h1
          ref={nameRef}
          className="whitespace-nowrap font-sans text-[clamp(2.75rem,14vw,140px)] font-black leading-[0.95] tracking-[-0.04em] text-foreground-bright mix-blend-difference"
        >
          <span className="inline-block overflow-hidden align-bottom">
            {"YURI".split("").map((char, i) => (
              <span key={`y-${i}`} data-hero-char className="inline-block">
                {char}
              </span>
            ))}
          </span>
          <span className="inline-block w-[0.2em]" />
          <span className="inline-block overflow-hidden align-bottom">
            {"BODO".split("").map((char, i) => (
              <span key={`b-${i}`} data-hero-char className="inline-block text-accent">
                {char}
              </span>
            ))}
          </span>
        </h1>

        <div
          ref={subtitleRef}
          className="mt-6 text-center"
        >
          <p className="font-sans text-xs font-semibold uppercase tracking-[4px] text-foreground md:text-sm">
            Full Stack Engineer
          </p>
          <p className="mt-2 font-mono text-[10px] text-foreground/60 md:text-xs">
            TypeScript · React · Node.js · Go · Python · Web3
          </p>
        </div>

        {/* Links */}
        <div ref={linksRef} className="mt-8 flex items-center gap-6">
          <a
            href="https://github.com/yuribodo"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-foreground/60 transition-premium hover:text-accent"
          >
            GitHub ↗
          </a>
          <a
            href="https://www.linkedin.com/in/mario-lara-1a801b272/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-foreground/60 transition-premium hover:text-accent"
          >
            LinkedIn ↗
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        ref={scrollRef}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-xs text-foreground/40"
      >
        SCROLL ▼
      </div>
    </section>
  );
}
