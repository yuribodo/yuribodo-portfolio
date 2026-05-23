"use client";

import { RoundedBox } from "@react-three/drei";

const DESK_WIDTH = 1.6;
const DESK_HEIGHT = 0.04;
const DESK_DEPTH = 0.8;
const DESK_CHAMFER = 0.003;

export default function Desk() {
  return (
    <RoundedBox
      args={[DESK_WIDTH, DESK_HEIGHT, DESK_DEPTH]}
      radius={DESK_CHAMFER}
      smoothness={4}
      position={[0, -DESK_HEIGHT / 2, 0]}
      castShadow
      receiveShadow
    >
      <meshPhysicalMaterial
        color="#2a1f1a"
        roughness={0.55}
        metalness={0}
        clearcoat={0.4}
        clearcoatRoughness={0.2}
      />
    </RoundedBox>
  );
}
