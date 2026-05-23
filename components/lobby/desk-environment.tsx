"use client";

import { ContactShadows, Environment, SoftShadows } from "@react-three/drei";

export default function DeskEnvironment() {
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

      {/* Soft PCF shadow filtering — quality over framerate, the scene is static. */}
      <SoftShadows size={25} samples={16} focus={0.5} />

      {/* KEY — warm overhead, the hero light. Strong enough to throw a
          legible shadow once peripherals land in #7/#8/#9. */}
      <directionalLight
        position={[3.5, 6, 2]}
        color="#ffcc88"
        intensity={4.0}
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
        position={[-2.5, 2, 1]}
        color="#5577aa"
        intensity={0.25}
      />

      {/* RIM — hot saturated orange from low-back. Lights up the rear chamfer
          edge and the front-right corner where the chamfer wraps. The drama. */}
      <directionalLight
        position={[0, 1.6, -4]}
        color="#ff7a3a"
        intensity={2.2}
      />

      {/* Implied warm desk-lamp — closer + stronger than v1, so it actually
          contributes a visible specular pop on the right side of the surface. */}
      <pointLight
        position={[1.8, 1.5, 0.5]}
        color="#ffb87a"
        intensity={6.0}
        distance={6}
        decay={2}
      />

      {/* Implied window cool leak — broader, gentler, deeper in the scene */}
      <pointLight
        position={[-3, 3, -2]}
        color="#7090b0"
        intensity={3.0}
        distance={10}
        decay={2}
      />

      {/* Accent — saturated cyan kicker from below-front. Adds a third colour
          beat so the scene isn't just warm/cool. Subtle but present. */}
      <pointLight
        position={[0, -0.8, 2.5]}
        color="#3aa0ff"
        intensity={1.2}
        distance={3.5}
        decay={2}
      />

      {/* Minimal ambient — shadows must read as DEEP, not washed. */}
      <ambientLight intensity={0.06} />

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
}
