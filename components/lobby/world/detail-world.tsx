"use client";

import { useThree } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useRef, type ReactNode } from "react";
import { PreparedGroup } from "./prepared-group";
import { WorldBoundary } from "./world-boundary";
import { beginWorldTask } from "./world-ledger";

/** A scenery family that loads and prepares on its own. The reveal waits for it,
 * but a missing asset only drops this family. The task is registered outside the
 * Suspense boundary, which commits at once; PreparedGroup inside it would not
 * exist until the family's files had arrived. */
export function DetailWorld({ children }: { children: ReactNode }) {
  const scene = useThree(s => s.scene);
  const settle = useRef<() => void>(() => {});
  useEffect(() => {
    const end = beginWorldTask(scene);
    settle.current = end;
    return end;
  }, [scene]);
  const done = useCallback(() => settle.current(), []);
  return (
    <WorldBoundary onError={done}>
      <Suspense fallback={null}><PreparedGroup onPrepared={done}>{children}</PreparedGroup></Suspense>
    </WorldBoundary>
  );
}
