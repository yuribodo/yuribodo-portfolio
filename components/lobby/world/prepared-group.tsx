"use client";

import { useThree } from '@react-three/fiber';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { haveClosedBitmaps, releaseUploadedBitmaps, uploadTextures } from "@/lib/lobby/texture-upload-queue";
import { COMPILE_WITH_UPLOAD } from "@/lib/lobby/upload-flags";
import { Group, Mesh, Texture, type Camera, type Object3D, type Scene, type WebGLRenderer } from 'three';

const Prepared = createContext(true);
export const usePrepared = () => useContext(Prepared);

/** renderer.compileAsync, minus its crash when a material is disposed mid-compile (lobby exit). */
function compileAsync(gl: WebGLRenderer, root: Object3D, camera: Camera, scene: Scene, isCancelled: () => boolean) {
  const pending = gl.compile(root, camera, scene);
  return new Promise<void>(resolve => {
    const check = () => {
      if (isCancelled()) return;
      for (const material of pending) {
        const { currentProgram } = gl.properties.get(material) as { currentProgram?: { isReady(): boolean } };
        if (!currentProgram || currentProgram.isReady()) pending.delete(material);
      }
      if (pending.size === 0) resolve();
      else setTimeout(check, 10);
    };
    check();
  });
}

function collectTextures(root: Object3D, into: Set<Texture>, meshesOnly: boolean) {
  root.traverse(object => {
    if (meshesOnly && !(object instanceof Mesh)) return;
    const { material } = object as Partial<Mesh>;
    if (!material) return;
    for (const entry of Array.isArray(material) ? material : [material]) {
      for (const value of Object.values(entry)) if (value instanceof Texture) into.add(value);
      for (const value of entry.userData.preloadTextures ?? []) into.add(value);
      if ('uniforms' in entry) for (const uniform of Object.values(entry.uniforms as Record<string, { value: unknown }>)) {
        if (uniform.value instanceof Texture) into.add(uniform.value);
      }
    }
  });
}

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
    collectTextures(root, textures, true);
    // The desk is what the loader waits on: the GPU process links its programs while the main thread uploads
    // textures, instead of the compile starting after the last upload. Program parameters do not depend on
    // upload state, so the same programs link either way.
    let started: Promise<void> | undefined;
    if (COMPILE_WITH_UPLOAD && priority === 0) {
      root.updateWorldMatrix(true, true);
      started = Promise.resolve().then(() => cancelled ? undefined : compileAsync(gl, root, camera, scene, () => cancelled));
      started.catch(() => {});
    }
    uploadTextures(gl, [...textures], priority, () => cancelled).then(async () => {
      if (cancelled) return;
      // The GPU has them: free the decoded bitmaps. The whole scene is scanned so a sibling Texture on the same
      // Source that another group has yet to upload keeps it open.
      const known = new Set<Texture>();
      collectTextures(scene, known, false);
      releaseUploadedBitmaps(gl, textures, known);
      root.updateWorldMatrix(true, true);
      await (started ?? compileAsync(gl, root, camera, scene, () => cancelled));
      if (!cancelled) setReady(true);
    }).catch(error => { if (!cancelled) setError(error instanceof Error ? error : new Error(String(error))); });
    return () => { cancelled = true; };
  }, [gl, scene, camera, priority]);
  // A restored context re-uploads every texture from its Source, and the closed bitmaps cannot be: fail this group
  // (the desk's boundary skips to the portfolio) instead of rendering black. ContextLossGuard alone would keep the lobby.
  useEffect(() => {
    const canvas = gl.domElement;
    const handleRestored = () => { if (haveClosedBitmaps()) setError(new Error('Context restored after texture bitmaps were released')); };
    canvas.addEventListener('webglcontextrestored', handleRestored);
    return () => canvas.removeEventListener('webglcontextrestored', handleRestored);
  }, [gl]);
  useEffect(() => { if (ready) onPrepared?.(); }, [ready, onPrepared]);
  if (error) throw error;
  return <Prepared.Provider value={ready}><group ref={group} visible={ready}>{children}</group></Prepared.Provider>;
}
