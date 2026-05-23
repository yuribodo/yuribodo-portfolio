"use client";

import { useGLTF } from "@react-three/drei";
import { useLayoutEffect } from "react";
import { Box3, Vector3 } from "three";
import type { Mesh, Object3D } from "three";

const MONITOR_MODEL_PATH = "/lobby/models/monitor.glb";
// Annelida MateView exports at ~0.72m wide including the stand foot. At the
// seated POV (#5), 0.62m read too imposing relative to the hutch opening, so
// we ease back to 0.54m — still believable as a 24-27" panel, but framed by
// the hutch rather than crowding it.
const MONITOR_TARGET_WIDTH = 0.54;
// The seanb desk model has a raised monitor riser at the back of the writing
// surface (SmallSupportL1_MiniBoard_0). Its top sits at world y=-0.533 and it
// spans z ∈ [-0.405, -0.154] — exactly the shelf a real monitor would sit on.
// Both values probed empirically from the desk mesh; keep in sync if the
// desk's normalisation in desk.tsx ever changes.
const MONITOR_RISER_TOP_Y = -0.533;
const MONITOR_RISER_CENTER_Z = -0.28;

useGLTF.preload(MONITOR_MODEL_PATH);

export default function Monitor() {
  const { scene } = useGLTF(MONITOR_MODEL_PATH);

  useLayoutEffect(() => {
    scene.scale.setScalar(1);
    scene.position.set(0, 0, 0);
    scene.rotation.set(0, 0, 0);

    // Measure in local space, no parent transform interference.
    const rawBox = new Box3().setFromObject(scene);
    const rawSize = new Vector3();
    rawBox.getSize(rawSize);

    const scale = MONITOR_TARGET_WIDTH / rawSize.x;
    scene.scale.setScalar(scale);

    // Re-measure post-scale and place the model so its base sits on the
    // writing surface (MONITOR_DESK_SURFACE_Y), centred on x, nudged back on z.
    const finalBox = new Box3().setFromObject(scene);
    const finalCentre = new Vector3();
    finalBox.getCenter(finalCentre);
    scene.position.set(
      -finalCentre.x,
      MONITOR_RISER_TOP_Y - finalBox.min.y,
      MONITOR_RISER_CENTER_Z - finalCentre.z,
    );

    scene.traverse((obj: Object3D) => {
      const mesh = obj as Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [scene]);

  return <primitive object={scene} />;
}
