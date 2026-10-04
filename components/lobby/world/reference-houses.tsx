"use client";
import { isReferenceHouse, settleOnTerrain, settlementKind, settlementPlacements, type FoundationPlacement } from "@/lib/lobby/settlement-placements";
import { applyOutdoorLight, useOutdoorLight } from "./outdoor-lighting";

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { Box3, BoxGeometry, Mesh, MeshStandardMaterial, type BufferGeometry, type Object3D } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { InstanceBatch, useBakedGeometry } from "./art-directed-terrace";

/** One draw per material instead of per node: the ramen stand alone is 251 nodes over 31 materials. */
function mergeByMaterial(root: Object3D | undefined, geometries: Map<string, BufferGeometry>) {
  const groups = new Map<string, { material: MeshStandardMaterial; parts: BufferGeometry[] }>();
  root?.traverse(o => {
    const geometry = o instanceof Mesh ? geometries.get(o.name) : undefined;
    if (!geometry) return;
    const material = (o as Mesh).material as MeshStandardMaterial;
    // mergeGeometries needs identical attribute layouts.
    const layout = Object.entries(geometry.attributes).map(([name, a]) => `${name}${a.itemSize}${a.normalized}${a.array.constructor.name}`).sort().join();
    const key = `${material.uuid}|${geometry.index ? 'i' : 'n'}|${layout}`;
    const group = groups.get(key) ?? { material, parts: [] };
    group.parts.push(geometry);
    groups.set(key, group);
  });
  return [...groups.values()].flatMap(({ material, parts }) => {
    const merged = parts.length > 1 ? mergeGeometries(parts) : null;
    return merged ? [{ geometry: merged, material, owned: true }] : parts.map(geometry => ({ geometry, material, owned: false }));
  });
}

/** Textured franchise-reference buildings placed by the shared settlement layout.
 * Sources and licenses: assets/lobby-world/reference-house-sources.json. */
export function ReferenceHouses({ floorY }: { floorY: number }) {
  const light = useOutdoorLight();
  const { scene } = useGLTF('/lobby/world/reference-houses.glb');
  const geometries = useBakedGeometry(scene);
  const materials = useMemo(() => {
    const materials = new Map<MeshStandardMaterial, MeshStandardMaterial>();
    scene.traverse(object => {
      if (!(object instanceof Mesh)) return;
      const source = object.material as MeshStandardMaterial;
      if (materials.has(source)) return;
      const material = source.clone();
      material.roughness = Math.max(.7, material.roughness);
      material.metalness = 0;
      material.envMapIntensity = .15;
      materials.set(source, applyOutdoorLight(material, light));
    });
    return materials;
  }, [scene, light]);
  useEffect(() => () => { for (const material of materials.values()) material.dispose(); }, [materials]);
  const { placements, foundations } = useMemo(() => {
    const placements = Object.fromEntries(Object.entries(settlementPlacements(floorY)).filter(([key]) => isReferenceHouse(settlementKind(key))));
    const foundations: FoundationPlacement[] = [];
    for (const [key, houses] of Object.entries(placements)) {
      const kind = settlementKind(key);
      // The island model carries its own shore; hobbit holes are cut into the slope rather than raised on a plinth.
      if (kind === 'kame-house') continue;
      const footprint = new Box3();
      scene.getObjectByName(kind)?.traverse(o => {
        const geometry = o instanceof Mesh ? geometries.get(o.name) : undefined;
        if (!geometry) return;
        geometry.computeBoundingBox();
        footprint.union(geometry.boundingBox!);
      });
      if (footprint.isEmpty()) continue;
      const plinths = settleOnTerrain(houses, footprint, floorY, kind === 'hobbit-house' ? .35 : .7);
      if (kind !== 'hobbit-house') foundations.push(...plinths);
    }
    return { placements, foundations };
  }, [floorY, geometries, scene]);
  const batches = useMemo(() => new Map(Object.keys(placements).map(key => {
    const kind = settlementKind(key);
    return [key, mergeByMaterial(scene.getObjectByName(kind), geometries)];
  })), [placements, scene, geometries]);
  useEffect(() => () => { for (const parts of batches.values()) for (const p of parts) if (p.owned) p.geometry.dispose(); }, [batches]);
  const foundationResources = useMemo(() => ({ geometry: new BoxGeometry(1, 1, 1), material: applyOutdoorLight(new MeshStandardMaterial({ color: '#939988', roughness: 1, envMapIntensity: .15 }), light) }), [light]);
  useEffect(() => () => { foundationResources.geometry.dispose(); foundationResources.material.dispose(); }, [foundationResources]);
  return <group name="reference-houses">
    <InstanceBatch geometry={foundationResources.geometry} material={foundationResources.material} placements={foundations} />
    {Object.entries(placements).flatMap(([key, houses]) =>
      (batches.get(key) ?? []).map((part, i) => <InstanceBatch key={`${key}:${i}`} geometry={part.geometry} material={materials.get(part.material)!} placements={houses} />))}
  </group>;
}
