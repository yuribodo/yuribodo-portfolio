"use client";

import { useGLTF } from "@react-three/drei";
import { useLayoutEffect } from "react";
import { Box3, Vector3 } from "three";
import type { Mesh, Object3D } from "three";

const DESK_MODEL_PATH = "/lobby/models/wooden_desk.glb";
const DESK_TARGET_WIDTH = 1.6;
// Sketchfab seanb's model exports with its long axis on Z and its front facing
// +X; rotating -90° around Y puts the writing surface across the camera view
// with the front (where you'd sit) facing the camera.
const DESK_Y_ROTATION = -Math.PI / 2;

useGLTF.preload(DESK_MODEL_PATH);

export default function Desk() {
  const { scene } = useGLTF(DESK_MODEL_PATH);

  useLayoutEffect(() => {
    // Reset before measuring so re-renders are idempotent
    scene.scale.setScalar(1);
    scene.position.set(0, 0, 0);
    scene.rotation.set(0, DESK_Y_ROTATION, 0);

    // Measure with rotation applied, scale = 1
    const rotatedBox = new Box3().setFromObject(scene);
    const rotatedSize = new Vector3();
    rotatedBox.getSize(rotatedSize);

    // Scale so the new x-axis (writing surface width) hits target
    const scale = DESK_TARGET_WIDTH / rotatedSize.x;
    scene.scale.setScalar(scale);

    // Re-measure post-scale; drop the top of the desk to y=0 and centre xz
    const finalBox = new Box3().setFromObject(scene);
    const finalCentre = new Vector3();
    finalBox.getCenter(finalCentre);
    scene.position.set(-finalCentre.x, -finalBox.max.y, -finalCentre.z);

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
