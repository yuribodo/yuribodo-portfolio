import gsap from "gsap";
import { Box3, Vector3 } from "three";
import type { Mesh, MeshStandardMaterial, PerspectiveCamera } from "three";

import { startSoundtrack } from "@/lib/audio-manager";
import type { DeskEnvironmentHandle } from "@/components/lobby/desk-environment";

// One continuous approach. Reveal the page before the camera settles so
// the zoom and the real content's entrance share the same landing.
const DIVE_DURATION = 1.65;
const HANDOFF_START = 1.1;
const HANDOFF_DURATION = DIVE_DURATION - HANDOFF_START;

interface TransitionDeps {
  camera: PerspectiveCamera;
  screenMesh: Mesh;
  screenMaterial: MeshStandardMaterial | null;
  environment: DeskEnvironmentHandle | null;
  container: HTMLElement | null;
  onDiveProgress: (progress: number) => void;
  onDiveComplete: () => void;
  onHandoff?: () => void;
  prefersReducedMotion: boolean;
}

export function playLobbyToSiteTransition({
  camera,
  screenMesh,
  screenMaterial,
  environment,
  container,
  onDiveProgress,
  onDiveComplete,
  onHandoff,
  prefersReducedMotion,
}: TransitionDeps): gsap.core.Timeline {
  const handoff = () => {
    // The page stays asleep during the approach, then paints for the fade.
    if (container) container.dataset.lobbyRevealing = "true";
    startSoundtrack("/audio/soundtrack.mp3");
    onHandoff?.();
  };

  if (prefersReducedMotion) {
    onDiveProgress(1);
    handoff();
    if (container) container.style.opacity = "0";
    onDiveComplete();
    return gsap.timeline();
  }

  const worldBox = new Box3().setFromObject(screenMesh);
  const centre = worldBox.getCenter(new Vector3());
  const size = worldBox.getSize(new Vector3());
  const halfFov = Math.tan((camera.getEffectiveFOV() * Math.PI) / 360);
  // Cover both dimensions, including ultrawide viewports. Height alone
  // leaves the room visible on either side of the screen on wider displays.
  const fillDistance = Math.min(size.y, size.x / camera.aspect) / (2 * halfFov) * 0.94;
  const destination = new Vector3(centre.x, centre.y, centre.z + fillDistance);
  const origin = camera.position.clone();
  // Preserve the exact live parallax pose at the click, including rotation.
  const initialLookAt = camera.getWorldDirection(new Vector3())
    .multiplyScalar(origin.distanceTo(centre)).add(origin);
  const lookAt = new Vector3();
  const motion = { progress: 0 };

  const tl = gsap.timeline({ onComplete: onDiveComplete });
  tl.to(motion, {
    progress: 1,
    duration: DIVE_DURATION,
    ease: "power2.inOut",
    onUpdate: () => {
      camera.position.lerpVectors(origin, destination, motion.progress);
      lookAt.lerpVectors(initialLookAt, centre, motion.progress);
      camera.lookAt(lookAt);
      onDiveProgress(motion.progress);
    },
  }, 0);

  if (environment) {
    const lighting = { ratio: 1 };
    tl.to(lighting, {
      ratio: 0.35,
      duration: 0.9,
      ease: "power2.inOut",
      onUpdate: () => environment.setLightingDimmer(lighting.ratio),
    }, 0);
  }

  // Let the click's soft pulse settle, then approach the page's brightness.
  // No second flash or black frame at the moment of the handoff.
  if (screenMaterial) {
    tl.to(screenMaterial, {
      emissiveIntensity: 1,
      duration: 0.8,
      ease: "sine.inOut",
    }, 0.55);
  }

  tl.call(handoff, [], HANDOFF_START);
  if (container) {
    tl.to(container, {
      opacity: 0,
      duration: HANDOFF_DURATION,
      ease: "sine.inOut",
    }, HANDOFF_START);
  }

  return tl;
}
