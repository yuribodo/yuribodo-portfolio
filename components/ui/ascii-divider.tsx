"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const DIVIDER_PATTERNS = [
  "═══════════════════════════════════════════════════════════",
  "─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─",
  "╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌",
] as const;

interface AsciiDividerProps {
  pattern?: number;
  label?: string;
}

export function AsciiDivider({ pattern = 0, label }: AsciiDividerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!ref.current) return;
    gsap.from(ref.current, {
      opacity: 0,
      scaleX: 0,
      duration: 1,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ref.current,
        start: "top 90%",
        end: "top 70%",
        scrub: 1,
      },
    });
  }, []);

  return (
    <div ref={ref} className="mx-auto max-w-4xl overflow-hidden px-6 py-8">
      {label && (
        <div className="mb-2 text-center font-mono text-[10px] text-subtle">
          {label}
        </div>
      )}
      <pre className="overflow-hidden text-center font-mono text-[10px] leading-none text-border select-none md:text-xs">
        {DIVIDER_PATTERNS[pattern % DIVIDER_PATTERNS.length]}
      </pre>
    </div>
  );
}
