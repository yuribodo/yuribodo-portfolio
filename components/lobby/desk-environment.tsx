"use client";

import { useThree } from "@react-three/fiber";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { Color, type DirectionalLight, type HemisphereLight, type PointLight, type Group } from "three";
import { SUN_POSITION } from "./world/outdoor-lighting";
import { dimWorldMaterials } from "./world/isekai-world";

export interface DeskEnvironmentHandle {
  setLightingDimmer: (ratio: number) => void;
}

const SUN = 3.6;
const SKY_FILL = 0.55;
const DESK_FILL = 0.18;
const FOG_COLOR = new Color("#afcadf");

const DeskEnvironment = forwardRef<DeskEnvironmentHandle, { shadowMap: number }>(function DeskEnvironment({ shadowMap }, ref) {
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
      <fog attach="fog" args={["#afcadf", 100, 2200]} />
      <hemisphereLight ref={sky} args={["#c0e3ef", "#9a8c67", SKY_FILL]} />
      <directionalLight
        ref={sun} position={SUN_POSITION} color="#ffe4b5" intensity={SUN} castShadow
        shadow-mapSize={[shadowMap, shadowMap]} shadow-camera-near={1} shadow-camera-far={240}
        shadow-camera-left={-56} shadow-camera-right={56} shadow-camera-top={56} shadow-camera-bottom={-56}
        shadow-normalBias={0.015} shadow-bias={-0.0002}
      />
      <directionalLight ref={fill} position={[4, 3, -6]} color="#b5d6eb" intensity={DESK_FILL} />
      <pointLight ref={lamp} position={[1.8, 1.5, 0.5]} color="#ffcb97" intensity={4.5} distance={6} decay={2} />
    </>
  );
});

export default DeskEnvironment;
