"use client";
import {distantPosition} from "@/lib/lobby/world-distance";
import {spreadLandscape} from "./landscape-distance";
import { applyOutdoorLight, useOutdoorLight } from "./outdoor-lighting";

import { useGLTF, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  Color, DoubleSide, Float32BufferAttribute, InstancedMesh, Frustum, Matrix4, Sphere,
  Mesh, MeshStandardMaterial, Object3D, PlaneGeometry,
  type BufferGeometry, type Group, type Material,
} from "three";

import { worldHeight as terrainHeight } from "@/lib/lobby/world-geography";

import { visibleInstances } from "@/lib/lobby/instance-visibility";

import { groundMaterial, GROUND_TEXTURES } from "./terrain-pigment";

// meshopt quantization may place a decode transform on each glTF node.
// Bake it into a private geometry before supplying our own instance matrices.
export function useBakedGeometry(scene: Group) {
  const geometries = useMemo(() => {
    const root = scene.clone(true);
    root.updateMatrixWorld(true);
    const geometries = new Map<string, BufferGeometry>();
    root.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const geometry = object.geometry.clone();
      // Integer-normalized attributes cannot hold a baked world-space position.
      for (const name of ["position", "normal", "tangent"]) {
        const attribute = geometry.getAttribute(name);
        if (!attribute || attribute.array instanceof Float32Array) continue;
        const values = [];
        for (let i = 0; i < attribute.count; i++) {
          values.push(attribute.getX(i), attribute.getY(i), attribute.getZ(i));
          if (attribute.itemSize === 4) values.push(attribute.getW(i));
        }
        geometry.setAttribute(name, new Float32BufferAttribute(values, attribute.itemSize));
      }
      geometry.applyMatrix4(object.matrixWorld);
      if (object.name.endsWith("_leaves") || object.name.startsWith("F1_Bush")) {
        // Smooth canopy lighting across intersecting cards; individual polygon
        // normals otherwise produce noisy light/dark speckles at this distance.
        geometry.computeBoundingBox();
        const bounds = geometry.boundingBox!;
        const cx = (bounds.min.x + bounds.max.x) / 2;
        const cy = (bounds.min.y + bounds.max.y) / 2;
        const cz = (bounds.min.z + bounds.max.z) / 2;
        const position = geometry.getAttribute("position"), normals = [], colors = [];
        const shade = new Color("#395e54"), light = new Color("#bdcb8f");
        for (let i = 0; i < position.count; i++) {
          const x = (position.getX(i) - cx) * 0.2;
          const y = Math.max(0.6, (position.getY(i) - cy) * 0.2 + 1.2);
          const z = (position.getZ(i) - cz) * 0.2;
          const length = Math.hypot(x, y, z);
          normals.push(x / length, y / length, z / length);
          const height = (position.getY(i) - bounds.min.y) / Math.max(0.01, bounds.max.y - bounds.min.y);
          const variation = 0.05 * Math.sin(position.getX(i) * 1.7 + position.getZ(i) * 1.3);
          const pigment = shade.clone().lerp(light, Math.min(1, Math.max(0, height + variation)));
          colors.push(pigment.r, pigment.g, pigment.b);
        }
        geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
        geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
      }
      geometries.set(object.name, geometry);
    });
    return geometries;
  }, [scene]);
  useEffect(() => () => { for (const geometry of geometries.values()) geometry.dispose(); }, [geometries]);
  return geometries;
}

export { worldHeight as terrainHeight } from "@/lib/lobby/world-geography";

export function TerraceTerrain({ floorY }: { floorY: number }) {
  const light=useOutdoorLight();
  const textures = useTexture(GROUND_TEXTURES);
  const geometry = useMemo(() => {
    const geometry = new PlaneGeometry(170, 170, 288, 288);
    geometry.rotateX(-Math.PI / 2);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      position.setY(i, terrainHeight(position.getX(i), position.getZ(i)));
    }
    return spreadLandscape(geometry,true);
  }, []);
  const material = useMemo(() => applyOutdoorLight(groundMaterial(textures),light), [textures,light]);
  useEffect(() => () => { geometry.dispose(); material.userData.disposeGroundTextures?.(); material.dispose(); }, [geometry, material]);
  return <mesh position={[0, floorY, 0]} geometry={geometry} material={material} receiveShadow raycast={() => {}} />;
}

type Placement = { position: [number, number, number]; scale?: number | [number, number, number]; yaw?: number };

export function InstanceBatch({ geometry, material, placements, shadows = false, depthMaterial }: {
  geometry: BufferGeometry; material: MeshStandardMaterial; placements: Placement[]; shadows?: boolean; depthMaterial?: Material;
}) {
  const ref = useRef<InstancedMesh>(null);
  const data = useMemo(() => {
    if (!geometry.boundingSphere) geometry.computeBoundingSphere();
    const transform = new Object3D();
    const matrices = placements.map(({ position, scale = 1, yaw = 0 }) => {
      transform.position.set(...distantPosition(position));
      if (typeof scale === "number") transform.scale.setScalar(scale); else transform.scale.set(...scale);
      transform.rotation.set(0, yaw, 0);
      transform.updateMatrix();
      return transform.matrix.clone();
    });
    return { matrices, bounds: matrices.map(matrix => geometry.boundingSphere!.clone().applyMatrix4(matrix)) };
  }, [geometry, placements]);
  const visibility = useRef({ frustum: new Frustum(), projection: new Matrix4(), previousProjection: new Matrix4(),
      previousWorld: new Matrix4(), scratch: new Sphere(), indices: [] as number[], initialized: false });
  useLayoutEffect(() => {
    const mesh = ref.current!;
    data.matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.count = data.matrices.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    visibility.current.initialized = false;
    // InstancedMesh owns its instance buffers; geometry/material stay shared.
    return () => { mesh.dispose(); };
  }, [data]);
  useFrame(({ camera }) => {
    const mesh = ref.current;
    // Keep off-camera casters: they can still cast visible terrace shadows.
    if (!mesh || shadows) return;
    const cache = visibility.current;
    camera.updateMatrixWorld();
    mesh.updateWorldMatrix(true, false);
    cache.projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    if (cache.initialized && cache.projection.equals(cache.previousProjection) && mesh.matrixWorld.equals(cache.previousWorld)) return;
    cache.previousProjection.copy(cache.projection); cache.previousWorld.copy(mesh.matrixWorld);
    cache.frustum.setFromProjectionMatrix(cache.projection);
    const indices = visibleInstances(data.bounds, cache.frustum, mesh.matrixWorld, cache.scratch);
    if (!cache.initialized || indices.length !== cache.indices.length || indices.some((index, i) => index !== cache.indices[i])) {
      indices.forEach((index, i) => mesh.setMatrixAt(i, data.matrices[index]));
      mesh.count = indices.length;
      mesh.instanceMatrix.needsUpdate = true;
      cache.indices = indices;
    }
    cache.initialized = true;
  });
  return <instancedMesh ref={ref} args={[geometry, material, placements.length]} frustumCulled={shadows} castShadow={shadows} customDepthMaterial={depthMaterial} receiveShadow raycast={() => {}} dispose={null} />;
}

export function AuthoredNature({ floorY, active }: { floorY: number; active: boolean }) {
  const { scene } = useGLTF("/lobby/world/nature-kit.glb");
  const geometries = useBakedGeometry(scene);
  const clock = useRef(0);
  const materialRefs = useRef<MeshStandardMaterial[]>([]);
  const materials = useMemo(() => {
    const materials = new Map<MeshStandardMaterial, MeshStandardMaterial>();
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const source = object.material as MeshStandardMaterial;
      if (materials.has(source)) return;
      const material = source.clone();
      material.roughness = 1;
      material.envMapIntensity = 0.2;
      const foliage = source.name !== "Tree_Bark";
      if (foliage) {
        material.transparent = false;
        material.depthWrite = true;
        material.alphaTest = 0.4;
        material.alphaToCoverage = true;
        material.side = DoubleSide;
        if (source.name === "Tree_Leaves") {
          material.color.set("#a1b88c");
          material.vertexColors = true;
        }
        material.onBeforeCompile = (shader) => {
          shader.uniforms.leafTime = { value: 0 };
          shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_begin>", "#include <normal_fragment_begin>\n normal *= faceDirection;");
          material.userData.setWind = (time: number) => { shader.uniforms.leafTime.value = time; };
          shader.vertexShader = "uniform float leafTime;\n" + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n transformed.x += sin(leafTime + position.x * 1.7 + position.z) * 0.025 * smoothstep(0.0, 1.5, position.y);");
        };
        material.customProgramCacheKey = () => "authored-canopy-wind-v1";
      }
      materials.set(source, material);
    });
    return materials;
  }, [scene]);
  useEffect(() => {
    materialRefs.current = [...materials.values()];
    return () => { materialRefs.current = []; for (const material of materials.values()) material.dispose(); };
  }, [materials]);
  useFrame((_, delta) => {
    if (!active) return;
    clock.current += Math.min(delta, 0.1);
    for (const material of materialRefs.current) material.userData.setWind?.(clock.current);
  });
  const placements = useMemo(() => {
    const batches: Record<string, Placement[]> = {
      F1_Tree1: [{ position: [-5.8, floorY + terrainHeight(-5.8, -1.5), -1.5], scale: 0.58, yaw: 1.4 }, { position: [-12, floorY + terrainHeight(-12, -12) - 0.08, -12], scale: 0.9, yaw: 0.8 }],
      F1_Tree2: [{ position: [10, floorY + terrainHeight(10, -18) - 0.08, -18], scale: 0.75, yaw: -0.8 }, { position: [-9, floorY + terrainHeight(-9, 12) - 0.08, 12], scale: 0.7, yaw: 2.3 }],
      F1_BushLow: [], F1_BushMid: [], F1_LowGrass: [], F1_Foliage1Patch: [], F1_Flower2Patch: [],
    };
    for (const [x, z, scale, yaw] of [[-17, -20, 0.7, 0.2], [-23, -19, 0.85, 1.6], [-14, 15, 0.7, 2.2], [18, -22, 0.8, 0.8], [24, -28, 1, 2.4], [-22, 26, 0.95, 1.1]]) {
      const name = x < 0 ? "F1_Tree1" : "F1_Tree2";
      batches[name].push({ position: [x, floorY + terrainHeight(x, z) - 0.08, z], scale, yaw });
    }
    for (let i = 0; i < 30; i++) {
      const side = i % 2 ? 1 : -1;
      const x = side * (9 + (i % 7) * 2.5), z = -15 - Math.floor(i / 2) * 2.2;
      batches[i % 3 ? "F1_Tree1" : "F1_Tree2"].push({ position: [x, floorY + terrainHeight(x, z), z], scale: 0.32 + (i % 4) * 0.09, yaw: i * 1.7 });
    }
    for (let i = 0; i < 85; i++) {
      const angle = i * 2.39996, radius = 5.4 + (i % 17) * 0.62;
      const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      if (Math.abs(x - Math.sin(z * 0.17) * 1.6) < 1.7) continue;
      const name = i % 3 ? "F1_BushLow" : "F1_BushMid";
      batches[name].push({ position: [x, floorY + terrainHeight(x, z), z], scale: 0.28 + (i % 5) * 0.08, yaw: angle });
    }
    for (let i = 0; i < 1800; i++) {
      const angle = i * 2.39996, radius = 3.9 + (i / 1800) * 15;
      const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      if (Math.abs(x) < 5.1 && z > -4.4 && z < 4.6) continue;
      if (Math.abs(x - Math.sin(z * 0.17) * 1.6) < 1.25) continue;
      const name = i % 37 === 0 ? "F1_Flower2Patch" : i % 4 === 0 ? "F1_Foliage1Patch" : "F1_LowGrass";
      batches[name].push({ position: [x, floorY + terrainHeight(x, z) - 0.015, z], scale: 0.32 + (i % 7) * 0.07, yaw: angle });
    }
    return batches;
  }, [floorY]);
  return <group>{Object.entries(placements).flatMap(([name, placements]) => {
    const group = scene.getObjectByName(name.replace("Distant_", "")) as Group | undefined;
    const meshes: Mesh[] = [];
    group?.traverse((object) => { if (object instanceof Mesh) meshes.push(object); });
    return meshes.map((mesh) => <InstanceBatch key={mesh.uuid} geometry={geometries.get(mesh.name)!} material={materials.get(mesh.material as MeshStandardMaterial)!} placements={placements} shadows={name.startsWith("F1_Tree")} />);
  })}</group>;
}

export function ValleyCliffs({ floorY }: { floorY: number }) {
  const light=useOutdoorLight();
  const { scene } = useGLTF("/lobby/world/coastal-cliff.glb");
  const geometries = useBakedGeometry(scene);
  const source = scene.getObjectByName("CoastalCliff") as Mesh;
  const material = useMemo(() => {
    const material = (source.material as MeshStandardMaterial).clone();
    material.color.set("white");
    // Art adaptation of the scan: retain erosion and UV variation, remap its
    // photographic albedo into the limestone / moss palette of the terrace.
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `
        #ifdef USE_MAP
          vec3 rock = texture2D(map, vMapUv).rgb;
          float value = dot(rock, vec3(0.2126, 0.7152, 0.0722));
          float moss = smoothstep(0.0, 0.055, rock.g - rock.r);
          vec3 pigment = mix(vec3(0.46, 0.51, 0.42), vec3(0.23, 0.39, 0.14), moss);
          diffuseColor.rgb *= pigment * (0.72 + smoothstep(0.02, 0.65, value) * 0.42);
        #endif
      `);
    };
    material.customProgramCacheKey = () => "painted-cliff-values-v1";
    material.normalScale.setScalar(0.35);
    material.roughness = 1;
    return applyOutdoorLight(material,light);
  }, [source,light]);
  useEffect(() => () => material.dispose(), [material]);
  const placements = useMemo<Placement[]>(() => [
    { position: [-20, floorY - 11, -22], scale: [0.8, 0.85, 1], yaw: -0.22 },
    { position: [26, floorY - 14, -34], scale: [1.1, 1.15, 1.2], yaw: 0.35 },
    { position: [-32, floorY - 14, 18], scale: [0.9, 1.1, 1], yaw: 1.7 },
  ], [floorY]);
  const outcropGeometry = useMemo(() => {
    const g = geometries.get(source.name)!.clone(), p = g.attributes.position;
    // Sink tapered ends into the hillside so a rectangular scan boundary never
    // becomes an artificial wall on the skyline.
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), taper = Math.pow(Math.max(0,1-(x/20.5)**2),.75);
      p.setY(i,p.getY(i)*taper*(.89+.11*Math.sin(x*.39)));
      p.setZ(i,p.getZ(i)+x*x*.004);
    }
    g.computeVertexNormals();g.computeBoundingSphere();return g;
  }, [geometries,source]);
  useEffect(() => () => outcropGeometry.dispose(), [outcropGeometry]);
  const outcrops = useMemo<Placement[][]>(() => [
    [[-110,-113,1.3,.22],[-135,-161,1.1,.35],[-157,-248,1.8,.15],[120,-166,1.5,-.35],[145,-279,1.8,-.2]],
    [[-95,100,1.1,2.8],[-126,150,1.4,2.9],[116,199,1.5,3.4],[155,257,1.9,3.1]],
  ].map(region => region.map(([x,z,size,yaw]) => ({
    position: [x,floorY + terrainHeight(x,z) - 4.5*size,z] as [number,number,number],
    scale: [size,size,size*1.2] as [number,number,number], yaw,
  }))), [floorY]);
  // The credited eroded scan also supplies rocky breaks in distant hillsides.
  return <group>
    <InstanceBatch geometry={geometries.get(source.name)!} material={material} placements={placements} />
    {outcrops.map((region,i) => <InstanceBatch key={i} geometry={outcropGeometry} material={material} placements={region} />)}
  </group>;
}
