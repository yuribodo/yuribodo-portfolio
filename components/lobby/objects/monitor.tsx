"use client";

import { useGLTF } from "@react-three/drei";
import { useLayoutEffect, useRef } from "react";
import { Box3, Color, MeshStandardMaterial, Vector3 } from "three";
import type { Mesh, MeshStandardMaterial as MeshStandardMaterialType, Object3D } from "three";

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
// Annelida's Screen_Display_0 mesh — a 4-vert quad with the Display material
// (emissiveTexture only). We swap the material at mount so the emissive map
// + intensity can be driven from React state (boot screen, pulse, transition).
const SCREEN_MESH_NAME = "Screen_Display_0";

useGLTF.preload(MONITOR_MODEL_PATH);

export default function Monitor() {
  const { scene } = useGLTF(MONITOR_MODEL_PATH);
  const screenMaterialRef = useRef<MeshStandardMaterialType | null>(null);

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
    // riser top, centred on x, nudged back on z.
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
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (mesh.name === SCREEN_MESH_NAME) {
        // The shipped Display material is a static emissive image. Swap it
        // for a controllable MeshStandardMaterial so the rest of the system
        // (boot glyphs in #7, pulse/states in #5, dive in #10) can mutate
        // emissiveMap + emissiveIntensity without re-cloning per frame.
        const screenMaterial = new MeshStandardMaterial({
          color: new Color("#000000"),
          emissive: new Color("#ffffff"),
          emissiveIntensity: 0,
          roughness: 0.25,
          metalness: 0,
          // The boot-glyphs texture lands in #7; until then the screen reads
          // as a powered-off black panel.
          emissiveMap: null,
        });
        mesh.material = screenMaterial;
        screenMaterialRef.current = screenMaterial;
      }
    });

    return () => {
      screenMaterialRef.current?.dispose();
      screenMaterialRef.current = null;
    };
  }, [scene]);

  return <primitive object={scene} />;
}
