"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { DoubleSide, Mesh, MeshStandardMaterial, type Group } from "three";
import { InstanceBatch, useBakedGeometry } from "./art-directed-terrace";
import { riverCenter, riverWidth, riverLevel, roadCenter, worldHeight, worldSlope } from "@/lib/lobby/world-geography";

function makeRandom() {
  let seed = 9187;
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

export function ValleyWoodland({ floorY }: { floorY: number }) {
  const { scene } = useGLTF("/lobby/world/valley-nature.glb");
  const geometries = useBakedGeometry(scene);
  const materials = useMemo(() => {
    const result = new Map<MeshStandardMaterial, MeshStandardMaterial>();
    scene.traverse(o => {
      if (!(o instanceof Mesh)) return;
      const source = o.material as MeshStandardMaterial;
      if (result.has(source)) return;
      const m = source.clone(); m.roughness = 1; m.envMapIntensity = .1;
      if (source.name === "Tree_Leaves") {
        m.color.set("#a1b88c"); m.vertexColors = true; m.side = DoubleSide;
        m.transparent = false; m.depthWrite = true; m.alphaTest = .25; m.alphaToCoverage = true;
      }
      result.set(source, m);
    });
    return result;
  }, [scene]);
  const placements = useMemo(() => {
    const random = makeRandom();
    const batches: Record<string, {position: [number, number, number]; scale: number; yaw: number}[]> = { F1_Tree1: [], F1_Tree2: [] };
    const heights: Record<string, number> = {};
    for (const name of Object.keys(batches)) {
      let height = 0;
      scene.getObjectByName(name)?.traverse(o => { if (o instanceof Mesh) {
        const g = geometries.get(o.name)!; g.computeBoundingBox(); height = Math.max(height, g.boundingBox!.max.y);
      } });
      heights[name] = Math.max(1, height);
    }
    for (let i = 0; i < 1600; i++) {
      const x = (random() - .5) * 650, z = (random() - .5) * 740;
      if (Math.hypot(x, z) < 44 || Math.hypot(x + 12, z - 160) < 23) continue;
      const y = worldHeight(x, z);
      if (y < riverLevel(z) + 2 || worldSlope(x, z) > .7 || (z < -40 && Math.abs(x - roadCenter(z)) < 17)) continue;
      if (z < -50 && Math.abs(x - riverCenter(z)) < riverWidth(z) + 2) continue;
      // Groves occupy broad patches, with clearings around routes and rooftops.
      if (Math.sin(x * .042) + Math.sin(z * .055 + x * .016) < -.35) continue;
      if (x > -85 && x < -42 && z > 120 && z < 162) continue;
      const name = i % 3 ? "F1_Tree1" : "F1_Tree2";
      batches[name].push({ position: [x, floorY + y - .08, z], scale: (3 + random() * 4.5) / heights[name], yaw: random() * Math.PI * 2 });
    }
    // One world-sized instance batch would submit every tree from every view.
    // Regional bounds let Three cull forests behind the seated camera while
    // retaining shared geometry/materials and the complete 360-degree world.
    const regions: typeof batches = {};
    for (const [name, instances] of Object.entries(batches)) {
      for (const instance of instances) {
        const key = `${name}:${Math.floor(instance.position[0] / 80)}:${Math.floor(instance.position[2] / 80)}`;
        (regions[key] ??= []).push(instance);
      }
    }
    return regions;
  }, [floorY, scene, geometries]);
  useEffect(() => () => { materials.forEach(m => m.dispose()); }, [materials]);
  return <group name="valley-woodland">{Object.entries(placements).flatMap(([region, placements]) => {
    const group = scene.getObjectByName(region.split(":")[0]) as Group;
    const meshes: Mesh[] = [];
    group?.traverse(o => { if (o instanceof Mesh) meshes.push(o); });
    return meshes.map(mesh => <InstanceBatch key={`${region}:${mesh.uuid}`} geometry={geometries.get(mesh.name)!} material={materials.get(mesh.material as MeshStandardMaterial)!} placements={placements} />);
  })}</group>;
}
