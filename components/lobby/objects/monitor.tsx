"use client";

import { useGLTF } from "@react-three/drei";
import { useLayoutEffect } from "react";
import { Box3, Vector3 } from "three";
import type { Mesh, Object3D } from "three";

const MONITOR_MODEL_PATH = "/lobby/models/monitor.glb";
// 27" widescreen is ~0.62m. The Annelida MateView model exports at ~0.72m
// wide including the stand foot, which reads slightly oversized at the new
// seated POV (#5). 0.62m target keeps the bezel at a believable angular size.
const MONITOR_TARGET_WIDTH = 0.62;
// World-Y of the desk's writing surface (the TableTop_DeskBoards_0 mesh).
// The seanb desk model is normalised in desk.tsx with its hutch shelf at y=0,
// which pushes the actual writing surface down by the hutch clearance.
// Probed empirically from desk.tsx during integration — keep in sync if the
// desk's normalisation ever changes.
const MONITOR_DESK_SURFACE_Y = -0.602;
// Pushed back toward the hutch so the screen reads as "at the back of the desk".
const MONITOR_OFFSET_Z = -0.15;

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
      MONITOR_DESK_SURFACE_Y - finalBox.min.y,
      MONITOR_OFFSET_Z - finalCentre.z,
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
