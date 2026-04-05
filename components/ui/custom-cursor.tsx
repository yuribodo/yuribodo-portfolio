"use client";

import { useRef, useState, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const BASE_RADIUS = 16;
const NUM_POINTS = 8;
const MAX_STRETCH = 12;
const MAX_SQUEEZE = 6;
const STRETCH_FACTOR = 0.4;
const SQUEEZE_FACTOR = 0.2;
const SPRING_DAMPING = 0.15;
const IDLE_THRESHOLD_MS = 200;
const IDLE_AMPLITUDE = 1.5;

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

interface ControlPoint {
  baseX: number;
  baseY: number;
  offsetX: number;
  offsetY: number;
  idleFreq: number;
}

function createControlPoints(): ControlPoint[] {
  return Array.from({ length: NUM_POINTS }, (_, i) => {
    const angle = (i / NUM_POINTS) * Math.PI * 2;
    return {
      baseX: Math.cos(angle) * BASE_RADIUS,
      baseY: Math.sin(angle) * BASE_RADIUS,
      offsetX: 0,
      offsetY: 0,
      idleFreq: 0.8 + Math.random() * 0.7,
    };
  });
}

export function CustomCursor() {
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(pointer: fine)").matches;
  });
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const query = window.matchMedia("(pointer: fine)");
    function handleChange(e: MediaQueryListEvent) {
      setIsDesktop(e.matches);
    }
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  useGSAP(() => {
    if (!isDesktop || !groupRef.current || !pathRef.current) return;

    const points = createControlPoints();
    const mouseTarget = { x: 0, y: 0 };
    let lastMoveTime = 0;

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
      mouseTarget.x = e.clientX;
      mouseTarget.y = e.clientY;
      lastMoveTime = Date.now();
    }

    function onTick() {
      if (reducedMotion) return;

      const now = Date.now();
      const isIdle = now - lastMoveTime > IDLE_THRESHOLD_MS;
      const time = now * 0.001;

      if (!groupRef.current || !pathRef.current) return;

      const gX = gsap.getProperty(groupRef.current, "x") as number;
      const gY = gsap.getProperty(groupRef.current, "y") as number;
      const vx = mouseTarget.x - gX;
      const vy = mouseTarget.y - gY;
      const speed = Math.sqrt(vx * vx + vy * vy);

      let dx = 0;
      let dy = 0;
      if (speed > 0.5) {
        dx = vx / speed;
        dy = vy / speed;
      }

      for (let i = 0; i < NUM_POINTS; i++) {
        const p = points[i];
        const nx = p.baseX / BASE_RADIUS;
        const ny = p.baseY / BASE_RADIUS;

        let targetOX = 0;
        let targetOY = 0;

        if (speed > 0.5) {
          const dot = nx * dx + ny * dy;
          const stretchAmount = Math.min(dot * speed * STRETCH_FACTOR, MAX_STRETCH);
          const squeezeAmount = Math.max((1 - Math.abs(dot)) * speed * -SQUEEZE_FACTOR, -MAX_SQUEEZE);
          const deform = dot > 0 ? stretchAmount : squeezeAmount;
          targetOX = nx * deform;
          targetOY = ny * deform;
        }

        if (isIdle) {
          targetOX += Math.sin(time * p.idleFreq + i * 0.8) * IDLE_AMPLITUDE;
          targetOY += Math.cos(time * p.idleFreq * 0.9 + i * 1.1) * IDLE_AMPLITUDE;
        }

        p.offsetX += (targetOX - p.offsetX) * SPRING_DAMPING;
        p.offsetY += (targetOY - p.offsetY) * SPRING_DAMPING;
      }

      const deformedPoints: [number, number][] = points.map((p) => [
        p.baseX + p.offsetX,
        p.baseY + p.offsetY,
      ]);

      pathRef.current.setAttribute("d", pointsToSmoothPath(deformedPoints));
    }

    document.addEventListener("mousemove", handleMouseMove);
    gsap.ticker.add(onTick);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      gsap.ticker.remove(onTick);
    };
  }, { scope: svgRef, dependencies: [isDesktop, reducedMotion] });

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
