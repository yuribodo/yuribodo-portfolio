"use client";

import { useRef, useCallback, useEffect } from "react";
import gsap from "gsap";

interface Props {
  text: string;
  reducedMotion: boolean;
}

const MAGNETIC_RADIUS = 150;
const MAGNETIC_STRENGTH = 0.4;

export function LiquidText({ text, reducedMotion }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const charsRef = useRef<HTMLSpanElement[]>([]);
  const isHoveredRef = useRef(false);

  const setCharRef = useCallback(
    (el: HTMLSpanElement | null, i: number) => {
      if (el) charsRef.current[i] = el;
    },
    []
  );

  useEffect(() => {
    if (reducedMotion || !containerRef.current) return;

    const container = containerRef.current;
    const chars = charsRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isHoveredRef.current) return;

      const containerRect = container.getBoundingClientRect();

      chars.forEach((char) => {
        const rect = char.getBoundingClientRect();
        const charCenterX = rect.left + rect.width / 2;
        const charCenterY = rect.top + rect.height / 2;

        const dx = e.clientX - charCenterX;
        const dy = e.clientY - charCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MAGNETIC_RADIUS) {
          const force = (1 - dist / MAGNETIC_RADIUS) * MAGNETIC_STRENGTH;
          gsap.to(char, {
            x: dx * force,
            y: dy * force,
            duration: 0.3,
            ease: "power2.out",
            overwrite: "auto",
          });
        } else {
          gsap.to(char, {
            x: 0,
            y: 0,
            duration: 0.5,
            ease: "elastic.out(1, 0.4)",
            overwrite: "auto",
          });
        }
      });
    };

    const handleMouseEnter = () => {
      isHoveredRef.current = true;
      gsap.to(chars, {
        color: "var(--accent)",
        duration: 0.4,
        stagger: { each: 0.03, from: "edges" },
        ease: "power2.out",
        overwrite: "auto",
      });
    };

    const handleMouseLeave = () => {
      isHoveredRef.current = false;
      chars.forEach((char) => {
        gsap.to(char, {
          x: 0,
          y: 0,
          duration: 0.7,
          ease: "elastic.out(1, 0.3)",
          overwrite: "auto",
        });
      });
      gsap.to(chars, {
        color: "var(--foreground-bright)",
        duration: 0.5,
        stagger: { each: 0.02, from: "edges" },
        ease: "power2.inOut",
        overwrite: "auto",
      });
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [reducedMotion]);

  const characters = text.split("");

  return (
    <div ref={containerRef} className="cursor-pointer select-none px-4 py-6">
      <h2 className="text-center font-sans text-[clamp(3rem,12vw,8rem)] font-black leading-none tracking-tighter">
        {characters.map((char, i) => (
          <span
            key={i}
            ref={(el) => setCharRef(el, i)}
            className="inline-block text-foreground-bright will-change-transform"
            style={{ whiteSpace: char === " " ? "pre" : undefined }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </h2>
    </div>
  );
}
