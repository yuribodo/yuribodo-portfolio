"use client";

import { useThree } from '@react-three/fiber';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { uploadTextures } from "@/lib/lobby/texture-upload-queue";
import { Group, Mesh, Texture } from 'three';

const Prepared = createContext(true);
export const usePrepared = () => useContext(Prepared);

/** Compile a resolved Suspense subtree before its first draw. Upload textures
 * between frames instead of making one first-render task do every upload.
 * Cancellation is per mount; StrictMode cleanup cannot reveal an old subtree.
 */
export function PreparedGroup({ children, priority = 1, onPrepared }: { children: ReactNode; priority?: number; onPrepared?: () => void }) {
  const group = useRef<Group>(null);
  const { gl, scene, camera } = useThree();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    const root = group.current!;
    let cancelled = false;
    const textures = new Set<Texture>();
    root.traverse(object => {
      if (!(object instanceof Mesh)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
        for (const value of material.userData.preloadTextures ?? []) textures.add(value);
        if ('uniforms' in material) for (const uniform of Object.values(material.uniforms as Record<string, { value: unknown }>)) {
          if (uniform.value instanceof Texture) textures.add(uniform.value);
        }
      }
    });
    uploadTextures(gl, [...textures], priority, () => cancelled).then(async () => {
      if (cancelled) return;
      root.updateWorldMatrix(true, true);
      await gl.compileAsync(root, camera, scene);
      if (!cancelled) setReady(true);
    }).catch(error => { if (!cancelled) setError(error instanceof Error ? error : new Error(String(error))); });
    return () => { cancelled = true; };
  }, [gl, scene, camera, priority]);
  useEffect(() => { if (ready) onPrepared?.(); }, [ready, onPrepared]);
  if (error) throw error;
  return <Prepared.Provider value={ready}><group ref={group} visible={ready}>{children}</group></Prepared.Provider>;
}
