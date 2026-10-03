"use client";

import { useThree } from "@react-three/fiber";
import { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef } from "react";
import { Color, type DirectionalLight, type HemisphereLight, type PointLight, type Group } from "three";
import { SUN_POSITION } from "./world/outdoor-lighting";
import { dimWorldMaterials } from "./world/isekai-world";
import { fitSunShadow, sunShadowMapSize } from "@/lib/lobby/shadow-frustum";

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
  // The frustum covers the casters, not the valley; the map keeps the old texel so the shadows look as before.
  const fit = useMemo(() => fitSunShadow(SUN_POSITION, sunShadowMapSize(shadowMap)), [shadowMap]);
  // The light's target is not in the scene graph, so its world matrix must be set by hand.
  // userData.shadowFit is the stable read-out of the frustum, texel size and biases.
  useLayoutEffect(() => {
    const light = sun.current;
    if (!light) return;
    light.target.position.set(...fit.target);
    light.target.updateMatrixWorld();
    light.userData.shadowFit = fit;
  }, [fit]);

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
        ref={sun} name="sun" position={fit.position} color="#ffe4b5" intensity={SUN} castShadow
        shadow-mapSize={[fit.mapSize, fit.mapSize]} shadow-camera-near={fit.near} shadow-camera-far={fit.far}
        shadow-camera-left={fit.left} shadow-camera-right={fit.right} shadow-camera-top={fit.top} shadow-camera-bottom={fit.bottom}
        shadow-normalBias={fit.normalBias} shadow-bias={fit.bias} shadow-radius={fit.radius}
      />
      <directionalLight ref={fill} position={[4, 3, -6]} color="#b5d6eb" intensity={DESK_FILL} />
      <pointLight ref={lamp} position={[1.8, 1.5, 0.5]} color="#ffcb97" intensity={4.5} distance={6} decay={2} />
    </>
  );
});

export default DeskEnvironment;
