"use client";

import { useThree } from "@react-three/fiber";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { Color, type DirectionalLight, type HemisphereLight, type PointLight, type Group } from "three";
import { dimWorldMaterials } from "./world/isekai-world";

export interface DeskEnvironmentHandle {
  setLightingDimmer: (ratio: number) => void;
}

const SUN = 2.5;
const SKY_FILL = 1.1;
const DESK_FILL = 0.7;
const FOG_COLOR = new Color("#a5cbd4");

const DeskEnvironment = forwardRef<DeskEnvironmentHandle>(function DeskEnvironment(_, ref) {
  const scene = useThree((s) => s.scene);
  const sun = useRef<DirectionalLight>(null);
  const fill = useRef<DirectionalLight>(null);
  const sky = useRef<HemisphereLight>(null);
  const lamp = useRef<PointLight>(null);

  useImperativeHandle(ref, () => ({
    setLightingDimmer(ratio) {
      const r = Math.max(0, Math.min(1, ratio));
      scene.userData.worldDimmer = r;
      if (sun.current) sun.current.intensity = SUN * r;
      if (fill.current) fill.current.intensity = DESK_FILL * r;
      if (sky.current) sky.current.intensity = SKY_FILL * r;
      if (lamp.current) lamp.current.intensity = 4.5 * r;
      scene.backgroundIntensity = r;
      scene.environmentIntensity = 0.35 * r;
      scene.fog?.color.copy(FOG_COLOR).multiplyScalar(r);
      const world = scene.getObjectByName("isekai-world") as Group | undefined;
      if (world) dimWorldMaterials(world, r);
    },
  }), [scene]);

  return (
    <>
      <color attach="background" args={["#85bed8"]} />
      <fog attach="fog" args={["#a5cbd4", 75, 340]} />
      <hemisphereLight ref={sky} args={["#c0e3ef", "#9a8c67", SKY_FILL]} />
      <directionalLight
        ref={sun} position={[5, 9, 3]} color="#ffe7bf" intensity={SUN} castShadow
        shadow-mapSize={[1024, 1024]} shadow-camera-near={0.5} shadow-camera-far={25}
        shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6}
        shadow-normalBias={0.035} shadow-bias={-0.0002}
      />
      <directionalLight ref={fill} position={[-2, 3, 4]} color="#b5d6eb" intensity={DESK_FILL} />
      <pointLight ref={lamp} position={[1.8, 1.5, 0.5]} color="#ffcb97" intensity={4.5} distance={6} decay={2} />
    </>
  );
});

export default DeskEnvironment;
