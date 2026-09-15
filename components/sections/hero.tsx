"use client";

import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { startSoundtrack } from "@/lib/audio-manager";

import { createDither } from "@/lib/lobby/dither";
import { observePageAnimation } from "@/lib/observe-page-animation";

gsap.registerPlugin(ScrollTrigger);

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

    ditherRef.current.strength = 0.55;
    const tl = gsap.timeline({ paused: true });

    tl.to(ditherRef.current, {
      strength: 0.4,
      duration: 0.75,
      ease: "power2.out",
    }, 0);
    tl.from("[data-hero-char]", {
      yPercent: 20,
      opacity: 0,
      duration: 0.65,
      stagger: 0.025,
      ease: "power3.out",
    }, 0);
    tl.from(subtitleRef.current, {
      y: 10,
      opacity: 0,
      duration: 0.5,
      ease: "power3.out",
    }, 0.12);
    tl.from(linksRef.current, {
      y: 8,
      opacity: 0,
      duration: 0.45,
      ease: "power3.out",
    }, 0.2);
    tl.from(scrollRef.current, {
      opacity: 0,
      duration: 0.4,
      ease: "power2.out",
    }, 0.3);
    tl.call(() => startSoundtrack("/audio/soundtrack.mp3"));

    // The entrance belongs to the reveal, regardless of how long someone
    // explores the desk. It also works for mobile, skip, and GPU fallback.
    let entered = false;
    const stopObserving = observePageAnimation(sectionRef.current!, (visible) => {
      if (!visible || entered) return;
      entered = true;
      tl.play();
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
    return stopObserving;
  }, { dependencies: [reducedMotion], scope: sectionRef, revertOnUpdate: true });

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

    const dither = createDither();
    function applyDithering(strength: number) {
      if (!ctx || !canvas) return;
      const w = canvas.width;
      const h = canvas.height;

      // Draw source (gradient placeholder or video frame)
      ctx.drawImage(offscreen, 0, 0);

      if (strength <= 0.01) return; // Skip dithering when fully revealed

      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      dither(data, w, h, strength);

      ctx.putImageData(imageData, 0, 0);
    }

    function loop(now: number) {
      drawGradient(now);
      applyDithering(ditherRef.current.strength);
      animFrameRef.current = requestAnimationFrame(loop);
    }
    // Paint a handoff frame, then stop work while the opaque lobby covers it.
    drawGradient(performance.now());
    applyDithering(ditherRef.current.strength);
    const stopObserving = observePageAnimation(sectionRef.current!, (visible) => {
      cancelAnimationFrame(animFrameRef.current);
      if (visible) animFrameRef.current = requestAnimationFrame(loop);
    });

    return () => {
      stopObserving();
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [reducedMotion]);


  if (reducedMotion) {
    return (
      <section className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <h1 className="font-sans text-6xl font-black tracking-[-3px] text-foreground-bright md:text-[100px] lg:text-[140px]">
            YURI <span className="text-accent">BODO</span>
          </h1>
          <p className="mt-6 font-sans text-sm font-semibold uppercase tracking-[4px] text-foreground">
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
      className="relative h-screen w-full overflow-hidden bg-background"
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
          className="font-sans text-6xl font-black tracking-[-3px] text-foreground-bright mix-blend-difference md:text-[100px] lg:text-[140px]"
        >
          <span className="inline-block overflow-hidden">
            {"YURI".split("").map((char, i) => (
              <span key={`y-${i}`} data-hero-char className="inline-block">
                {char}
              </span>
            ))}
          </span>
          <span className="inline-block w-[0.2em]" />
          <span className="inline-block overflow-hidden">
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
