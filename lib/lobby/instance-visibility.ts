import { Frustum, Matrix4, Sphere } from 'three';

/** Cull complete mesh instances using their authored geometry bounds.
 * Padding keeps wind and the desk's small camera drift inside the bounds. */
export function visibleInstances(bounds: readonly Sphere[], frustum: Frustum, world: Matrix4, scratch: Sphere): number[] {
  const visible: number[] = [];
  for (let i = 0; i < bounds.length; i++) {
    scratch.copy(bounds[i]).applyMatrix4(world);
    scratch.radius += Math.max(1, scratch.radius * .08);
    if (frustum.intersectsSphere(scratch)) visible.push(i);
  }
  return visible;
}
