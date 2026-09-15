"use client";

import { Suspense, useEffect, useRef } from 'react';
import { useGLTF, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Group, Mesh, MeshStandardMaterial } from 'three';
import { createCharacterInstance } from '@/lib/lobby/character-instance';
import { WORLD_CHARACTERS, type WorldCharacterAsset } from '@/lib/lobby/world-characters';
import { applyOutdoorLight, useOutdoorLight } from './outdoor-lighting';
import { WorldBoundary } from './world-boundary';

/** A raised court and throne give the king a place in the landscape. */
function AinzCourt() {
  const { scene } = useGLTF('/lobby/world/characters/royal-court.glb');
  const rune = useTexture('/lobby/world/characters/ainz-circle.jpg');
  const light = useOutdoorLight(), container = useRef<Group>(null);
  useEffect(() => {
    const parent = container.current;
    if (!parent) return;
    const court = scene.clone(true), materials = new Map<MeshStandardMaterial, MeshStandardMaterial>();
    court.traverse(object => {
      if (!(object instanceof Mesh)) return;
      const shade = (source: MeshStandardMaterial) => {
        if (!materials.has(source)) materials.set(source, applyOutdoorLight(source.clone(), light));
        return materials.get(source)!;
      };
      object.material = Array.isArray(object.material) ? object.material.map(shade) : shade(object.material);
      object.raycast = () => {};
    });
    parent.add(court);
    return () => { parent.remove(court); materials.forEach(material => material.dispose()); };
  }, [scene, light]);
  return <group ref={container} position={[0, -1.4, 0]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.42, 0]} raycast={() => {}}>
      <planeGeometry args={[11.8, 11.8]} />
      <meshBasicMaterial alphaMap={rune} color="#76d8ef" transparent opacity={.65}
        blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  </group>;
}

function Character({ asset, floorY, active }: {
  asset: WorldCharacterAsset; floorY: number; active: boolean;
}) {
  const loaded = useGLTF(asset.url), light = useOutdoorLight();
  const container = useRef<Group>(null);
  const instance = useRef<ReturnType<typeof createCharacterInstance> | null>(null);
  useEffect(() => {
    const parent = container.current;
    if (!parent) return;
    const character = createCharacterInstance(loaded.scene, loaded.animations, {
      size: asset.size,
      sizeAxis: asset.sizeAxis,
      clip: asset.clip,
      shade(material) {
        if (material instanceof MeshStandardMaterial) applyOutdoorLight(material, light);
      },
    });
    character.root.name = `world-character-${asset.id}`;
    parent.add(character.root);
    instance.current = character;
    return () => {
      instance.current = null;
      parent.remove(character.root);
      character.dispose();
    };
  }, [loaded, asset, light]);
  useFrame((_, delta) => {
    if (!active) return;
    instance.current?.update(delta);
    if (asset.id === 'going-merry' && instance.current) {
      const root = instance.current.root, time = light.time.value;
      root.position.y = Math.sin(time * .65) * .14;
      root.rotation.x = Math.sin(time * .41) * .009;
      root.rotation.z = Math.sin(time * .53) * .012;
    }
  });
  return <group ref={container}
    position={[asset.position[0], floorY + asset.position[1] + (asset.baseOffset ?? 0), asset.position[2]]}
    rotation={[0, asset.yaw, 0]}>
    {asset.id === 'ainz' && <AinzCourt />}
  </group>;
}

/** Each resident loads independently; none participates in desk readiness. */
export function WorldCharacters({ floorY, active }: { floorY: number; active: boolean }) {
  return <group name="selected-world-characters">
    {WORLD_CHARACTERS.map(asset => <WorldBoundary key={asset.id}>
      <Suspense fallback={null}><Character asset={asset} floorY={floorY} active={active} /></Suspense>
    </WorldBoundary>)}
  </group>;
}
