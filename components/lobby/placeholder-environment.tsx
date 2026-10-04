"use client";

import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { PMREMGenerator } from "three";
import { createPlaceholderEnvironment, PLACEHOLDER_ENVIRONMENT } from "@/lib/lobby/placeholder-environment";

/**
 * Gives the scene a black environment before the desk compiles, so its lit materials already carry the env-map
 * variant and the sky's arrival (Atmosphere) swaps the texture without relinking them. A layout effect: it must
 * land before PreparedGroup's passive compile effect.
 */
export function PlaceholderEnvironment() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    if (!PLACEHOLDER_ENVIRONMENT || scene.environment) return;
    const generator = new PMREMGenerator(gl);
    try {
      const placeholder = createPlaceholderEnvironment(generator);
      scene.environment = placeholder.texture;
      return () => {
        // Atmosphere may have swapped in the sky and disposed this already; dispose() is idempotent.
        if (scene.environment === placeholder.texture) scene.environment = null;
        placeholder.dispose();
      };
    } catch {
      // No placeholder is the old behaviour, not a failure.
    } finally {
      generator.dispose();
    }
  }, [gl, scene]);
  return null;
}
