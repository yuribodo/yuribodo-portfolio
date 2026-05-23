"use client";

import { useEffect, useRef } from "react";

interface HoldProgressProps {
  progress: number;
  isHolding: boolean;
  anchor?: { x: number; y: number };
  size?: number;
}

const DEFAULT_SIZE = 64;
const STROKE_WIDTH = 2;

export function HoldProgress({
  progress,
  isHolding,
  anchor,
  size = DEFAULT_SIZE,
}: HoldProgressProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const positionRef = useRef<{ x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (anchor) return;

    const half = size / 2;

    function applyTransform() {
      rafIdRef.current = null;
      const svg = svgRef.current;
      const pos = positionRef.current;
      if (!svg || !pos) return;
      svg.style.transform = `translate3d(${pos.x - half}px, ${pos.y - half}px, 0)`;
    }

    function handlePointerMove(event: PointerEvent) {
      positionRef.current = { x: event.clientX, y: event.clientY };
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(applyTransform);
      }
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [anchor, size]);

  const radius = (size - STROKE_WIDTH) / 2;
  const center = size / 2;
  const opacity = isHolding ? 1 : progress > 0.001 ? progress : 0;
  const borderPercent = Math.max(0, Math.min(100, Math.round((1 - progress) * 100)));
  const stroke = `color-mix(in oklab, var(--border) ${borderPercent}%, var(--accent))`;

  const anchoredTransform = anchor
    ? `translate3d(${anchor.x - center}px, ${anchor.y - center}px, 0)`
    : undefined;

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 60,
        opacity,
        transition: "opacity 120ms ease-out",
        transform: anchoredTransform,
        willChange: "transform, opacity",
      }}
    >
      <g transform={`rotate(-90 ${center} ${center})`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - progress}
        />
      </g>
    </svg>
  );
}
