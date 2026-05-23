"use client";

import { ContactShadows, Environment } from "@react-three/drei";
import { forwardRef, useImperativeHandle, useRef } from "react";
import type {
  AmbientLight,
  DirectionalLight,
  PointLight,
} from "three";

export interface DeskEnvironmentHandle {
  /** Multiplies every light's resting intensity. Called by the dive
   *  transition (#10) at t=0.00s to drop to 0.2 — collapses the warm/cool
   *  beat so the screen's emissive pops as we dolly in. */
  setLightingDimmer: (ratio: number) => void;
}

// Resting intensities — sourced from the previous tuned values. Kept as
// module constants so the imperative dimmer has something to multiply
// against and can be reset back to 1.0 cleanly.
const KEY_INTENSITY = 4.0;
const FILL_INTENSITY = 0.25;
const RIM_INTENSITY = 2.2;
const LAMP_INTENSITY = 6.0;
const WINDOW_INTENSITY = 3.0;
const ACCENT_INTENSITY = 1.2;
const AMBIENT_INTENSITY = 0.06;

const DeskEnvironment = forwardRef<DeskEnvironmentHandle>(
  function DeskEnvironment(_props, ref) {
    const keyRef = useRef<DirectionalLight>(null);
    const fillRef = useRef<DirectionalLight>(null);
    const rimRef = useRef<DirectionalLight>(null);
    const lampRef = useRef<PointLight>(null);
    const windowRef = useRef<PointLight>(null);
    const accentRef = useRef<PointLight>(null);
    const ambientRef = useRef<AmbientLight>(null);

    useImperativeHandle(
      ref,
      () => ({
        setLightingDimmer: (ratio: number) => {
          const r = Math.max(0, Math.min(1, ratio));
          if (keyRef.current) keyRef.current.intensity = KEY_INTENSITY * r;
          if (fillRef.current) fillRef.current.intensity = FILL_INTENSITY * r;
          if (rimRef.current) rimRef.current.intensity = RIM_INTENSITY * r;
          if (lampRef.current) lampRef.current.intensity = LAMP_INTENSITY * r;
          if (windowRef.current) windowRef.current.intensity = WINDOW_INTENSITY * r;
          if (accentRef.current) accentRef.current.intensity = ACCENT_INTENSITY * r;
          if (ambientRef.current) ambientRef.current.intensity = AMBIENT_INTENSITY * r;
        },
      }),
      [],
    );

    return (
      <>
        {/* Looser fog so the lights have room to breathe at near distances. */}
        <fogExp2 attach="fog" args={["#0a0a0f", 0.055]} />

        {/* IBL only — warehouse gives directional highlights on fumed oak.
            Dialed back so the discrete lights below own the look. */}
        <Environment
          preset="warehouse"
          background={false}
          environmentIntensity={0.55}
        />

        {/* KEY — warm overhead, the hero light. Strong enough to throw a
            legible shadow once peripherals land in #7/#8/#9. */}
        <directionalLight
          ref={keyRef}
          position={[3.5, 6, 2]}
          color="#ffcc88"
          intensity={KEY_INTENSITY}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.1}
          shadow-camera-far={20}
          shadow-camera-left={-3}
          shadow-camera-right={3}
          shadow-camera-top={3}
          shadow-camera-bottom={-3}
          shadow-bias={-0.0005}
        />

        {/* FILL — barely-there cool. Most cool reading comes from the window
            point below; this just keeps the left side from going crushed. */}
        <directionalLight
          ref={fillRef}
          position={[-2.5, 2, 1]}
          color="#5577aa"
          intensity={FILL_INTENSITY}
        />

        {/* RIM — hot saturated orange from low-back. Lights up the rear chamfer
            edge and the front-right corner where the chamfer wraps. The drama. */}
        <directionalLight
          ref={rimRef}
          position={[0, 1.6, -4]}
          color="#ff7a3a"
          intensity={RIM_INTENSITY}
        />

        {/* Implied warm desk-lamp — closer + stronger than v1, so it actually
            contributes a visible specular pop on the right side of the surface. */}
        <pointLight
          ref={lampRef}
          position={[1.8, 1.5, 0.5]}
          color="#ffb87a"
          intensity={LAMP_INTENSITY}
          distance={6}
          decay={2}
        />

        {/* Implied window cool leak — broader, gentler, deeper in the scene */}
        <pointLight
          ref={windowRef}
          position={[-3, 3, -2]}
          color="#7090b0"
          intensity={WINDOW_INTENSITY}
          distance={10}
          decay={2}
        />

        {/* Accent — saturated cyan kicker from below-front. Adds a third colour
            beat so the scene isn't just warm/cool. Subtle but present. */}
        <pointLight
          ref={accentRef}
          position={[0, -0.8, 2.5]}
          color="#3aa0ff"
          intensity={ACCENT_INTENSITY}
          distance={3.5}
          decay={2}
        />

        {/* Minimal ambient — shadows must read as DEEP, not washed. */}
        <ambientLight ref={ambientRef} intensity={AMBIENT_INTENSITY} />

        {/* Soft grounding shadow — punchier opacity than v1 (was 0.5) so the
            desk feels seated, not floating in a void. */}
        <ContactShadows
          position={[0, -0.4, 0]}
          opacity={0.7}
          scale={5}
          blur={3}
          far={2}
        />
      </>
    );
  },
);

export default DeskEnvironment;
