import { ShaderMaterial, type Material } from 'three';

/** How a scenery family eases a material in. 'shader' materials read the
 * family's arrival uniform themselves. 'clone' is only for stock materials,
 * where Material.clone() loses nothing. 'skip' appears at once: a clone would
 * drop its onBeforeCompile patch, its uniform links or non-JSON userData. */
export type ArrivalFade = 'shader' | 'clone' | 'skip';

const isJsonPrimitive = (value: unknown) => value === null || ['string', 'number', 'boolean'].includes(typeof value);
const hasOwn = (material: Material, key: string) => Object.prototype.hasOwnProperty.call(material, key);

export function arrivalFadeMode(material: Material, readsArrival: boolean): ArrivalFade {
  if (readsArrival) return 'shader';
  if (material instanceof ShaderMaterial) return 'skip';
  if (hasOwn(material, 'onBeforeCompile') || hasOwn(material, 'customProgramCacheKey')) return 'skip';
  return Object.values(material.userData).every(isJsonPrimitive) ? 'clone' : 'skip';
}
