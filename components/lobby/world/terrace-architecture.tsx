"use client";

import { useEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import { Color, ExtrudeGeometry, Float32BufferAttribute, RepeatWrapping, Shape, SRGBColorSpace, type BufferGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { applyOutdoorLight, useOutdoorLight } from "./outdoor-lighting";
import { FORECOURT_BEDS } from "@/lib/lobby/plant-communities";
import { paintedStone } from "./painted-stone";

// Cut masonry has narrow bevels, flat faces and real recessed joints. These
// dimensions are in the same world scale as the desk, not texture pixels.
function cutBlock(width: number, height: number, depth: number, bevel = 0.012) {
  const s = new Shape();
  s.moveTo(-width / 2 + bevel, -height / 2 + bevel);
  s.lineTo(width / 2 - bevel, -height / 2 + bevel);
  s.lineTo(width / 2 - bevel, height / 2 - bevel);
  s.lineTo(-width / 2 + bevel, height / 2 - bevel);
  s.closePath();
  const g = new ExtrudeGeometry(s, { depth: depth - bevel * 2, bevelEnabled: true,
    bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, steps: 1 });
  g.translate(0, 0, -depth / 2 + bevel);
  return g;
}

function tint(geometry: BufferGeometry, color: Color) {
  const values = [];
  for (let i = 0; i < geometry.attributes.position.count; i++) values.push(color.r, color.g, color.b);
  geometry.setAttribute("color", new Float32BufferAttribute(values, 3));
  return geometry;
}

export function TerraceArchitecture({ floorY }: { floorY: number }) {
  const light=useOutdoorLight();
  const source = useTexture("/lobby/world/limestone.webp");
  const pigment = useMemo(() => {
    const texture = source.clone();
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    return texture;
  }, [source]);
  useEffect(() => () => pigment.dispose(), [pigment]);
  const { masonry, paving, stone, floor } = useMemo(() => {
    const blocks: BufferGeometry[] = [], slabs: BufferGeometry[] = [];
    let blockIndex = 0;
    const place = (g: BufferGeometry, x: number, y: number, z: number, yaw = 0, isFloor = false) => {
      g.rotateY(yaw); g.translate(x, y, z);
      // Small, deterministic variation: no alternating checkerboard or noise.
      const value = 0.92 + Math.sin(++blockIndex * 7.13) * 0.07;
      tint(g, new Color().setRGB(value, value, value));
      g.clearGroups(); (isFloor ? slabs : blocks).push(g);
    };
    const block = (x: number, y: number, z: number, w: number, h: number, d: number, yaw = 0) =>
      place(cutBlock(w, h, d), x, y, z, yaw);

    // A quiet limestone terrace. The joints are 8 mm, not deep rock fissures.
    for (let row = 0; row < 12; row++) {
      const z = -4.0 + row * 0.72;
      for (let col = 0; col < 10; col++) {
        const x = -4.5 + col * 0.94 + (row % 2) * 0.47;
        if (x > 4.55) continue;
        place(cutBlock(0.932, 0.055, 0.712, 0.004), x, -0.028, z, 0, true);
      }
    }
    // Front retaining wall, coping and a central stair create a terrace edge.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const x = side * (1.95 + i * 0.78);
        for (let row = 0; row < 1; row++) {
          if (side === -1 && i === 2 && row === 1) continue;
          block(x, 0.14 + row * 0.24, -4.65, 0.768, 0.23, 0.38);
        }
        if (!(side === -1 && i === 2)) block(x, 0.30, -4.65, 0.78, 0.085, 0.5);
      }
      for (let i = 0; i < 8; i++) {
        const z = -4.25 + i * 1.13;
        block(side * 4.85, 0.13, z, 0.4, 0.26, 1.118);
        block(side * 4.85, 0.3, z, 0.52, 0.08, 1.13);
      }
      // Capped pier at the stair entrance.
      block(side * 1.63, 0.23, -4.65, 0.5, 0.46, 0.5);
      block(side * 1.63, 0.49, -4.65, 0.61, 0.09, 0.61);
    }
    for (let i = 0; i < 5; i++) block(0, -0.09 - i * 0.115, -4.72 - i * 0.48, 2.75, 0.14, 0.5);

    // A thick, broken arcade frames the right of the view. Its voussoirs are
    // individual wedge stones, not a scaled torus with an inflated profile.
    const centerX = 5.2, centerZ = -7.7, spring = 2.2, inner = 1.45, outer = 1.91;
    for (const side of [-1, 1]) {
      const x = centerX + side * (inner + outer) / 2;
      block(x, 0.12, centerZ, 0.77, 0.24, 0.94);
      block(x, 0.3, centerZ, 0.64, 0.12, 0.8);
      for (let course = 0; course < 6; course++) {
        block(x + Math.sin(course * 2) * 0.008, 0.44 + course * 0.31, centerZ,
          0.49, 0.298, 0.65);
      }
      block(x, spring - 0.05, centerZ, 0.64, 0.16, 0.85);
      block(x, spring + 0.06, centerZ, 0.7, 0.075, 0.9);
    }
    for (let i = 0; i < 15; i++) {
      const a = i / 15 * Math.PI + 0.004, b = (i + 1) / 15 * Math.PI - 0.004;
      const s = new Shape();
      s.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      s.absarc(0, 0, inner, a, b, false);
      s.lineTo(Math.cos(b) * outer, Math.sin(b) * outer);
      s.absarc(0, 0, outer, b, a, true); s.closePath();
      const g = new ExtrudeGeometry(s, { depth: 0.67, bevelEnabled: true, bevelSize: 0.008,
        bevelThickness: 0.008, bevelSegments: 1, curveSegments: 4 });
      place(g, centerX, spring, centerZ - 0.335);
    }
    // A partial second bay gives the ruin a structural continuation.
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3 - Math.floor(row / 2); col++)
        block(-4.9 + col * 0.68, 0.17 + row * 0.33, -4.85, 0.665, 0.318, 0.55);
    }
    for(const [cx,cz]of FORECOURT_BEDS){
      for(let i=0;i<10;i++){
        const a=i/10*Math.PI*2;
        block(cx+Math.sin(a)*.64,.12,cz+Math.cos(a)*.59,.39,.24,.17,a);
      }
      const soil=cutBlock(.95,.16,.85,.005);soil.translate(cx,.13,cz);
      tint(soil,new Color('#55452e'));soil.clearGroups();blocks.push(soil);
    }
    const masonry = mergeGeometries(blocks)!;
    const paving = mergeGeometries(slabs)!;
    blocks.forEach(g => g.dispose()); slabs.forEach(g => g.dispose());
    return { masonry, paving, stone: applyOutdoorLight(paintedStone("#c6c4a9", pigment),light), floor: applyOutdoorLight(paintedStone("#bdbdab", pigment),light) };
  }, [pigment,light]);
  useEffect(() => () => { masonry.dispose(); paving.dispose(); stone.dispose(); floor.dispose(); }, [masonry, paving, stone, floor]);
  return <group position={[0, floorY, 0]}>
    <mesh geometry={paving} material={floor} receiveShadow raycast={() => {}} />
    <mesh geometry={masonry} material={stone} castShadow receiveShadow raycast={() => {}} />
    <mesh position={[0, -0.1, 0]} receiveShadow raycast={() => {}}>
      <boxGeometry args={[9.9, 0.12, 8.8]} />
      <meshStandardMaterial color="#777d6d" roughness={1} />
    </mesh>
  </group>;
}
