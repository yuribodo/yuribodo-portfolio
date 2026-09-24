"use client";
import { useThree } from '@react-three/fiber';
import { Suspense, useCallback, type ReactNode } from 'react';
import { WorldBoundary } from './world-boundary';
import { PreparedGroup } from './prepared-group';

export const CORE_WORLD_PARTS = ['sky', 'near-ground', 'valley', 'terrace', 'canopies'] as const;
type CorePart = typeof CORE_WORLD_PARTS[number];

/** A successful load must reveal a landscape, not floating houses. Explicit
 * optional-asset failure still permits the established graceful desk fallback.
 */
export function CoreWorld({ id, children }: { id: CorePart; children: ReactNode }) {
  const scene = useThree(s => s.scene);
  const ready = useCallback(() => {
    scene.userData.coreWorld ??= {};
    scene.userData.coreWorld[id] = 'ready';
  }, [scene, id]);
  const failed = useCallback(() => {
    scene.userData.coreWorld ??= {};
    scene.userData.coreWorld[id] = 'failed';
  }, [scene, id]);
  return <WorldBoundary onError={failed}><Suspense fallback={null}>
    <PreparedGroup priority={0} onPrepared={ready}>{children}</PreparedGroup>
  </Suspense></WorldBoundary>;
}
