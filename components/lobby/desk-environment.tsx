"use client";

import { ContactShadows, Environment } from "@react-three/drei";

export default function DeskEnvironment() {
  return (
    <>
      {/* Atmospheric darkness — exponential fog absorbs anything past ~3 units.
          Color matches site --background for swap-free transition at handoff (#10). */}
      <fogExp2 attach="fog" args={["#0a0a0f", 0.08]} />

      {/* IBL reflections only — no skybox. Warehouse gives more directional
          highlights on fumed oak than the flatter studio preset. */}
      <Environment preset="warehouse" background={false} />

      {/* Key — warm desk lamp simulation, upper-right (~3000K) */}
      <directionalLight
        position={[2, 4, 1.5]}
        color="#ffd9a8"
        intensity={1.6}
      />

      {/* Fill — cool window ambient, low intensity, left (~6500K) */}
      <directionalLight
        position={[-2, 2, 1]}
        color="#a8c4e0"
        intensity={0.45}
      />

      {/* Rim — behind/above origin to separate object silhouettes (lit for #7's monitor) */}
      <directionalLight
        position={[0, 2, -3]}
        color="#ffffff"
        intensity={0.7}
      />

      {/* Implied off-camera warm lamp — deepens the right-side warmth.
          PointLight w/ default decay=2: effective ~0.13 at desk centre. */}
      <pointLight
        position={[2.5, 2, 1]}
        color="#ffb87a"
        intensity={2.5}
      />

      {/* Implied off-camera window glow — cool ambient leak from left-rear */}
      <pointLight
        position={[-3, 3, -2]}
        color="#7090b0"
        intensity={0.8}
      />

      {/* Just enough ambient to keep deep shadows from going crushed-black */}
      <ambientLight intensity={0.12} />

      {/* Invisible floor — only the soft grounding shadow remains visible */}
      <ContactShadows
        position={[0, -0.4, 0]}
        opacity={0.5}
        scale={4}
        blur={2.5}
        far={2}
      />
    </>
  );
}
