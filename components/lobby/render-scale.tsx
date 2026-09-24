"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { nextRenderScale, RENDER_SCALE_WARMUP_MS } from "@/lib/lobby/render-scale";

/** Internal resolution follows frame time. The scene stays; only the pixel count moves. */
export function RenderScale({ max }: { max: number }) {
  const gl = useThree(s => s.gl);
  const size = useThree(s => s.size);
  const scale = useRef(max);
  const slow = useRef(0);
  const fast = useRef(0);
  const started = useRef(0);
  const sized = useRef({ w: size.width, h: size.height });

  useFrame((_, delta) => {
    if (started.current === 0) started.current = performance.now();
    if (sized.current.w !== size.width || sized.current.h !== size.height) {
      sized.current = { w: size.width, h: size.height };
      scale.current = max;
      slow.current = 0;
      fast.current = 0;
      gl.setPixelRatio(max);
      return;
    }
    const warming = performance.now() - started.current < RENDER_SCALE_WARMUP_MS;
    const next = nextRenderScale(scale.current, max, delta * 1000, slow.current, fast.current, warming);
    slow.current = next.slow;
    fast.current = next.fast;
    if (next.scale === scale.current) return;
    scale.current = next.scale;
    gl.setPixelRatio(next.scale);
    gl.setSize(size.width, size.height, false);
  });

  return null;
}
