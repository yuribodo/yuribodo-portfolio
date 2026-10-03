import { Color, Scene, Vector3, type PMREMGenerator, type Texture, type WebGLRenderTarget } from "three";

/** Flip to false to skip the placeholder and get the old behaviour (every lit material relinks when the sky arrives). */
export const PLACEHOLDER_ENVIRONMENT = true;

/**
 * One definition for the sky's PMREM and its black stand-in. The environment map's size and mapping are baked into
 * every lit material's program key (CUBEUV_* defines), so the two must be built identically or the swap relinks.
 */
export const ENVIRONMENT_PMREM = { sigma: 0.04, near: 0.1, far: 1200, size: 256 } as const;

type EnvironmentSource = Pick<PMREMGenerator, "fromScene">;

export function renderEnvironment(generator: EnvironmentSource, source: Scene): WebGLRenderTarget {
  const { sigma, near, far, size } = ENVIRONMENT_PMREM;
  return generator.fromScene(source, sigma, near, far, { size, position: new Vector3() });
}

export interface PlaceholderEnvironment {
  texture: Texture;
  dispose: () => void;
}

const placeholders = new WeakMap<Texture, () => void>();

/** Zero-radiance environment of the same cube-UV shape as the sky's, so adopting it changes no program key. */
export function createPlaceholderEnvironment(generator: EnvironmentSource): PlaceholderEnvironment {
  const empty = new Scene();
  empty.background = new Color(0x000000);
  const target = renderEnvironment(generator, empty);
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    target.dispose();
  };
  placeholders.set(target.texture, dispose);
  return { texture: target.texture, dispose };
}

/** Dispose `texture` if it is a placeholder; false (and untouched) for any other texture. */
export function releasePlaceholderEnvironment(texture: Texture | null): boolean {
  const dispose = texture && placeholders.get(texture);
  if (!dispose) return false;
  dispose();
  return true;
}
