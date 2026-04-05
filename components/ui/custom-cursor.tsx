"use client";

import { useRef, useState, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const BASE_RADIUS = 16;
const NUM_POINTS = 8;

function generateCirclePath(radius: number): string {
  const points: [number, number][] = [];
  for (let i = 0; i < NUM_POINTS; i++) {
    const angle = (i / NUM_POINTS) * Math.PI * 2;
    points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  return pointsToSmoothPath(points);
}

function pointsToSmoothPath(points: [number, number][]): string {
  const n = points.length;
  const d: string[] = [];
  d.push(`M ${points[0][0]} ${points[0][1]}`);

  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    d.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`);
  }

  d.push("Z");
  return d.join(" ");
}

export function CustomCursor() {
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const query = window.matchMedia("(pointer: fine)");
    setIsDesktop(query.matches);
    function handleChange(e: MediaQueryListEvent) {
      setIsDesktop(e.matches);
    }
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  useGSAP(() => {
    if (!isDesktop || !groupRef.current) return;

    const xTo = gsap.quickTo(groupRef.current, "x", {
      duration: reducedMotion ? 0 : 0.3,
      ease: "power3.out",
    });
    const yTo = gsap.quickTo(groupRef.current, "y", {
      duration: reducedMotion ? 0 : 0.3,
      ease: "power3.out",
    });

    function handleMouseMove(e: MouseEvent) {
      xTo(e.clientX);
      yTo(e.clientY);
    }

    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, { dependencies: [isDesktop, reducedMotion] });

  if (!isDesktop) return null;

  return (
    <svg
      ref={svgRef}
      className="custom-cursor"
      aria-hidden="true"
    >
      <g ref={groupRef}>
        <path
          ref={pathRef}
          d={generateCirclePath(BASE_RADIUS)}
          fill="var(--accent)"
        />
      </g>
    </svg>
  );
}
