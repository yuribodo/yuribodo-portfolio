import {
  AnimationMixer, Box3, Group, Material, Mesh, SkinnedMesh, Vector3,
  type AnimationClip,
} from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

interface CharacterInstanceOptions {
  size: number;
  sizeAxis: 'x' | 'y' | 'z';
  clip?: string;
  shade?: (material: Material) => void;
}

/** Own skeletons, actions and material copies, but share cached geometry/textures.
 * Normalization is outside the animated hierarchy so root tracks cannot undo it. */
export function createCharacterInstance(
  source: Group, clips: readonly AnimationClip[], options: CharacterInstanceOptions,
) {
  const clip = options.clip ? clips.find(candidate => candidate.name === options.clip) : undefined;
  if (options.clip && !clip) throw new Error(`Missing character animation: ${options.clip}`);
  if (!Number.isFinite(options.size) || options.size <= 0) throw new Error('Invalid character size');

  const model = clone(source), root = new Group(), normalizer = new Group();
  const materials = new Map<Material, Material>();
  const skeletons = new Set<SkinnedMesh['skeleton']>();
  model.traverse(object => {
    if (object instanceof SkinnedMesh) skeletons.add(object.skeleton);
  });
  const mixer = new AnimationMixer(model);
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    mixer.stopAllAction();
    mixer.uncacheRoot(model);
    materials.forEach(material => material.dispose());
    skeletons.forEach(skeleton => skeleton.dispose());
  };

  try {
    if (clip) { mixer.clipAction(clip).play(); mixer.setTime(0); }
    model.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(model, true);
    const extent = bounds.getSize(new Vector3())[options.sizeAxis];
    if (bounds.isEmpty() || !Number.isFinite(extent) || extent <= 0) {
      throw new Error('Character has no usable geometry');
    }
    const scale = options.size / extent, center = bounds.getCenter(new Vector3());
    normalizer.scale.setScalar(scale);
    normalizer.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    normalizer.add(model);
    root.add(normalizer);
    const shade = (sourceMaterial: Material) => {
      let material = materials.get(sourceMaterial);
      if (!material) {
        material = sourceMaterial.clone();
        materials.set(sourceMaterial, material);
        options.shade?.(material);
      }
      return material;
    };
    model.traverse(object => {
      if (!(object instanceof Mesh)) return;
      object.material = Array.isArray(object.material) ? object.material.map(shade) : shade(object.material);
      object.raycast = () => {};
      // Static bind-pose bounds can discard moving limbs. These five residents
      // use fixed reviewed placements, so keep their skinned meshes renderable.
      if (object instanceof SkinnedMesh) object.frustumCulled = false;
    });
  } catch (error) {
    dispose();
    throw error;
  }

  return {
    root,
    update(delta: number) { if (!disposed && clip) mixer.update(Math.min(Math.max(delta, 0), .1)); },
    dispose,
  };
}
