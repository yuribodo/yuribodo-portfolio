"use client";
import { useTexture } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import { RepeatWrapping, SRGBColorSpace, TextureLoader, type Texture } from 'three';
import { GROUND_PREVIEW_TEXTURES } from '@/lib/lobby/ground-preview-manifest';
import { uploadTextures } from '@/lib/lobby/texture-upload-queue';

export const GROUND_TEXTURES=['/lobby/world/soil-color.webp','/lobby/world/soil-normal.webp','/lobby/world/meadow-color.webp','/lobby/world/meadow-normal.webp','/lobby/world/rock-face-detail.webp','/lobby/world/rock-face-normal.webp'];
let fullResolution: Promise<Texture[]> | undefined;
function ownedMaps(source: Texture[]) {
  return source.map((texture, i) => {
    const map = texture.clone();
    map.wrapS = map.wrapT = RepeatWrapping; map.repeat.setScalar(170 / 3.2); map.anisotropy = 8;
    if (i % 2 === 0) map.colorSpace = SRGBColorSpace;
    return map;
  });
}

/** Keep the same shader and height field during loading. Only texel resolution
 * increases, after all replacement maps have uploaded in the shared budget.
 * Returned maps are owned/disposed by the ground material, not the loader cache.
 */
export function useGroundTextures(upgrade: boolean) {
  const source = useTexture(GROUND_PREVIEW_TEXTURES);
  const preview = useMemo(() => ownedMaps(source), [source]);
  const [detail, setDetail] = useState<Texture[] | null>(null);
  const gl = useThree(s => s.gl);
  useEffect(() => {
    if (!upgrade) return;
    let cancelled = false, committed = false;
    let maps: Texture[] | undefined;
    fullResolution ??= Promise.all(GROUND_TEXTURES.map(url => new TextureLoader().loadAsync(url)));
    fullResolution.then(async source => {
      if (cancelled) return;
      maps = ownedMaps(source);
      await uploadTextures(gl, maps, 2, () => cancelled);
      if (cancelled) return;
      committed = true;
      setDetail(maps);
    }).catch(error => { if (!cancelled) console.warn('[lobby] Keeping terrain preview:', error); });
    return () => {
      cancelled = true;
      if (!committed) maps?.forEach(map => map.dispose());
    };
  }, [gl, upgrade]);
  return detail ?? preview;
}
