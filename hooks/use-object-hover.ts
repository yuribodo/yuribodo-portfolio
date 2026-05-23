"use client";

import { useEffect, useMemo, useState } from "react";

import type { ThreeEvent } from "@react-three/fiber";

export interface ObjectHoverBind {
  onPointerOver: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut: (event: ThreeEvent<PointerEvent>) => void;
}

export interface UseObjectHoverReturn {
  isHovered: boolean;
  bind: ObjectHoverBind;
}

/** Shared hover state for lobby objects. Owns the `isHovered` flag, the
 *  body-cursor side-effect, and the over/out bind handlers. Visual reactions
 *  (lift, rim glow, emissive boost) are the consumer's responsibility — drive
 *  them in `useFrame` from this flag so we don't re-render every frame. */
export function useObjectHover(): UseObjectHoverReturn {
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!isHovered) return;
    const previous = document.body.style.cursor;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = previous;
    };
  }, [isHovered]);

  const bind = useMemo<ObjectHoverBind>(
    () => ({
      onPointerOver: (event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        setIsHovered(true);
      },
      onPointerOut: (event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        setIsHovered(false);
      },
    }),
    [],
  );

  return { isHovered, bind };
}
