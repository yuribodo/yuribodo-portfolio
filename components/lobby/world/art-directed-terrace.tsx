"use client";

import { useGLTF, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  Color, DoubleSide, Float32BufferAttribute, InstancedMesh,
  Mesh, MeshStandardMaterial, Object3D, PlaneGeometry, RepeatWrapping,
  SRGBColorSpace, Vector2, type BufferGeometry, type Group,
} from "three";

// meshopt quantization may place a decode transform on each glTF node.
// Bake it into a private geometry before supplying our own instance matrices.
function useBakedGeometry(scene: Group) {
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
        if (!attribute) continue;
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
        const shade = new Color("#476443"), light = new Color("#bdcb9a");
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

export function terrainHeight(x: number, z: number) {
  // A level inhabited terrace opens onto a slope, then a descending valley.
  const distance = Math.hypot(x / 1.2, z - 1);
  const edge = Math.max(0, distance - 6);
  const valley = -Math.pow(edge, 1.12) * 0.26;
  const hills = Math.sin(x * 0.16) * Math.cos(z * 0.13) * Math.min(edge * 0.13, 2.8);
  const plateau = (cx: number, cz: number, width: number, height: number) =>
    height * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (width ** 2));
  const ridges = plateau(-20, -24, 12, 6) + plateau(27, -35, 17, 9) + plateau(-32, 18, 15, 8);
  return -0.13 + valley + hills + ridges * Math.min(1, edge / 12);
}

export function TerraceTerrain({ floorY }: { floorY: number }) {
  const textures = useTexture(["/lobby/world/earth-color.webp", "/lobby/world/earth-normal.webp"]);
  const geometry = useMemo(() => {
    const geometry = new PlaneGeometry(170, 170, 144, 144);
    geometry.rotateX(-Math.PI / 2);
    const position = geometry.attributes.position;
    const colors: number[] = [];
    const soil = new Color("#d8ca9c"), grass = new Color("#70b264");
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), z = position.getZ(i);
      position.setY(i, terrainHeight(x, z));
      // A worn path winds through the grass behind the desk.
      const path = Math.abs(x - Math.sin(z * 0.17) * 1.6);
      const patch = 0.85 + 0.1 * Math.sin(x * 0.8 + Math.sin(z)) + 0.05 * Math.cos(z * 0.7);
      const cover = Math.min(1, Math.max(0, (path - 1.2) * 0.8)) * patch;
      const color = soil.clone().lerp(grass, cover).multiplyScalar(0.94 + 0.06 * Math.sin(x * 0.44 + z * 0.29));
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return geometry;
  }, []);
  const material = useMemo(() => {
    const [map, normalMap] = textures.map((texture) => texture.clone());
    for (const texture of [map, normalMap]) {
      texture.wrapS = texture.wrapT = RepeatWrapping;
      texture.repeat.set(30, 30);
      texture.needsUpdate = true;
    }
    map.colorSpace = SRGBColorSpace;
    const material = new MeshStandardMaterial({ map, normalMap, normalScale: new Vector2(0.22, 0.22), vertexColors: true, roughness: 1 });
    // Keep the painted ground's value variation without multiplying its brown hue into grass.
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `
        #ifdef USE_MAP
          vec4 earth = texture2D(map, vMapUv);
          float value = dot(earth.rgb, vec3(0.2126, 0.7152, 0.0722));
          diffuseColor.rgb *= 0.4 + value;
        #endif
      `);
    };
    material.customProgramCacheKey = () => "painted-earth-values-v1";
    return material;
  }, [textures]);
  useEffect(() => () => { geometry.dispose(); material.map?.dispose(); material.normalMap?.dispose(); material.dispose(); }, [geometry, material]);
  return <mesh position={[0, floorY, 0]} geometry={geometry} material={material} receiveShadow raycast={() => {}} />;
}

export function TerracePaving({ floorY }: { floorY: number }) {
  const textures = useTexture(["/lobby/world/paving-color.webp", "/lobby/world/paving-normal.webp", "/lobby/world/paving-roughness.webp", "/lobby/world/paving-ao.webp"]);
  const material = useMemo(() => {
    const [map, normalMap, roughnessMap, aoMap] = textures.map((texture) => texture.clone());
    for (const texture of [map, normalMap, roughnessMap, aoMap]) {
      texture.wrapS = texture.wrapT = RepeatWrapping;
      // The source scan covers 1.8 metres; joints stay at a human scale.
      texture.repeat.set(8.6 / 1.8, 8.2 / 1.8);
      texture.anisotropy = 8;
      texture.needsUpdate = true;
    }
    map.colorSpace = SRGBColorSpace;
    return new MeshStandardMaterial({ map, normalMap, roughnessMap, aoMap,
      color: "#d8d4cc", roughness: 0.95, normalScale: new Vector2(0.42, 0.42),
      aoMapIntensity: 0.45, envMapIntensity: 0.2 });
  }, [textures]);
  useEffect(() => () => {
    for (const texture of [material.map, material.normalMap, material.roughnessMap, material.aoMap]) texture?.dispose();
    material.dispose();
  }, [material]);
  return <group>
    <mesh position={[0, floorY - 0.075, 0.41]} receiveShadow raycast={() => {}}>
      <boxGeometry args={[8.6, 0.14, 8.2]} />
      <meshStandardMaterial color="#78786b" roughness={1} />
    </mesh>
    <mesh position={[0, floorY - 0.002, 0.41]} rotation={[-Math.PI / 2, 0, 0]} material={material} receiveShadow raycast={() => {}}>
      <planeGeometry args={[8.6, 8.2]} />
    </mesh>
  </group>;
}

type Placement = { position: [number, number, number]; scale?: number | [number, number, number]; yaw?: number };

function InstanceBatch({ geometry, material, placements, shadows = false }: {
  geometry: BufferGeometry; material: MeshStandardMaterial; placements: Placement[]; shadows?: boolean;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const transform = new Object3D();
    for (let i = 0; i < placements.length; i++) {
      const { position, scale = 1, yaw = 0 } = placements[i];
      transform.position.set(...position);
      if (typeof scale === "number") transform.scale.setScalar(scale); else transform.scale.set(...scale);
      transform.rotation.set(0, yaw, 0);
      transform.updateMatrix();
      ref.current.setMatrixAt(i, transform.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [placements]);
  return <instancedMesh ref={ref} args={[geometry, material, placements.length]} castShadow={shadows} receiveShadow raycast={() => {}} dispose={null} />;
}

export function AuthoredRuins({ floorY }: { floorY: number }) {
  const { scene } = useGLTF("/lobby/world/ruins-kit.glb");
  const geometries = useBakedGeometry(scene);
  const materials = useMemo(() => {
    const materials = new Map<MeshStandardMaterial, MeshStandardMaterial>();
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const source = object.material as MeshStandardMaterial;
      if (materials.has(source)) return;
      const material = source.clone();
      material.roughness = 0.95;
      material.envMapIntensity = 0.25;
      material.color.set("#eef2df");
      material.normalScale.setScalar(0.8);
      materials.set(source, material);
    });
    return materials;
  }, [scene]);
  useEffect(() => () => { for (const material of materials.values()) material.dispose(); }, [materials]);
  const batches = useMemo(() => {
    const batches: Record<string, Placement[]> = {
      A3_Door1: [{ position: [4.5, floorY + terrainHeight(4.5, -5.9), -5.9], scale: 0.8, yaw: -0.16 }],
      A3_Gothic1: [{ position: [4.5, floorY + terrainHeight(4.5, -5.9) + 4.09, -5.9], scale: 0.75, yaw: -0.16 }],
      A1_StoneWall5: [{ position: [-5.1, floorY + terrainHeight(-5.1, -4.5) - 0.04, -4.5], scale: 0.8, yaw: 0.22 }],
      A2_StoneWall6: [
        { position: [6.4, floorY + terrainHeight(6.4, -4.4) - 0.04, -4.4], scale: 0.8, yaw: -0.65 },
        { position: [-6.3, floorY + terrainHeight(-6.3, 2.5) - 0.04, 2.5], scale: 0.8, yaw: 1.2 },
        { position: [6.4, floorY + terrainHeight(6.4, 4.3) - 0.04, 4.3], scale: 0.7, yaw: -1.3 },
      ],
      A2_StoneWall4: [{ position: [-4.4, floorY + terrainHeight(-4.4, 7.5) - 0.04, 7.5], scale: 0.65, yaw: -0.15 }],
      A3_LongStone1: [], A2_Stone3: [], A2_Stone5: [], A2_Stone7: [],
    };
    // Descending, worn steps connect the paved platform to the land below.
    for (let i = 0; i < 7; i++) batches.A3_LongStone1.push({ position: [Math.sin(i * 0.3) * 0.3, floorY - 0.12 - i * 0.13, -4.4 - i * 0.75], scale: [0.9, 0.36, 1.2] });
    for (let i = 0; i < 23; i++) {
      const side = i % 2 ? 1 : -1, x = side * (3.2 + 2 * Math.abs(Math.sin(i * 2.1))), z = -5 + (i % 11) * 1.1;
      batches[["A2_Stone3", "A2_Stone5", "A2_Stone7"][i % 3]].push({ position: [x, floorY + terrainHeight(x, z) - 0.02, z], scale: 0.5 + (i % 4) * 0.15, yaw: i * 1.3 });
    }
    return batches;
  }, [floorY]);
  return <group>{Object.entries(batches).map(([name, placements]) => {
    const mesh = scene.getObjectByName(name) as Mesh;
    if (!mesh) return null;
    return <InstanceBatch key={name} geometry={geometries.get(mesh.name)!} material={materials.get(mesh.material as MeshStandardMaterial)!} placements={placements} shadows />;
  })}</group>;
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
          material.color.set("#8ba66e");
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
      F1_Tree1: [{ position: [-12, floorY + terrainHeight(-12, -12) - 0.08, -12], scale: 0.7, yaw: 0.8 }],
      F1_Tree2: [{ position: [10, floorY + terrainHeight(10, -18) - 0.08, -18], scale: 0.75, yaw: -0.8 }, { position: [-9, floorY + terrainHeight(-9, 12) - 0.08, 12], scale: 0.7, yaw: 2.3 }],
      F1_BushLow: [], F1_BushMid: [], F1_LowGrass: [], F1_Foliage1Patch: [], F1_Flower2Patch: [],
    };
    for (const [x, z, scale, yaw] of [[-17, -20, 0.7, 0.2], [-23, -19, 0.85, 1.6], [-14, 15, 0.7, 2.2], [18, -22, 0.8, 0.8], [24, -28, 1, 2.4], [-22, 26, 0.95, 1.1]]) {
      const name = x < 0 ? "F1_Tree1" : "F1_Tree2";
      batches[name].push({ position: [x, floorY + terrainHeight(x, z) - 0.08, z], scale, yaw });
    }
    for (let i = 0; i < 85; i++) {
      const angle = i * 2.39996, radius = 4.4 + (i % 17) * 0.62;
      const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      if (Math.abs(x - Math.sin(z * 0.17) * 1.6) < 1.7) continue;
      const name = i % 3 ? "F1_BushLow" : "F1_BushMid";
      batches[name].push({ position: [x, floorY + terrainHeight(x, z), z], scale: 0.28 + (i % 5) * 0.08, yaw: angle });
    }
    for (let i = 0; i < 1800; i++) {
      const angle = i * 2.39996, radius = 3.9 + (i / 1800) * 15;
      const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      if (Math.abs(x) < 4.3 && z > -3.7 && z < 4.55) continue;
      if (Math.abs(x - Math.sin(z * 0.17) * 1.6) < 1.25) continue;
      const name = i % 37 === 0 ? "F1_Flower2Patch" : i % 4 === 0 ? "F1_Foliage1Patch" : "F1_LowGrass";
      batches[name].push({ position: [x, floorY + terrainHeight(x, z) - 0.015, z], scale: 0.6 + (i % 7) * 0.14, yaw: angle });
    }
    return batches;
  }, [floorY]);
  return <group>{Object.entries(placements).flatMap(([name, placements]) => {
    const group = scene.getObjectByName(name) as Group | undefined;
    const meshes: Mesh[] = [];
    group?.traverse((object) => { if (object instanceof Mesh) meshes.push(object); });
    return meshes.map((mesh) => <InstanceBatch key={mesh.uuid} geometry={geometries.get(mesh.name)!} material={materials.get(mesh.material as MeshStandardMaterial)!} placements={placements} shadows={name.startsWith("F1_Tree")} />);
  })}</group>;
}

export function ValleyCliffs({ floorY }: { floorY: number }) {
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
    return material;
  }, [source]);
  useEffect(() => () => material.dispose(), [material]);
  const placements = useMemo<Placement[]>(() => [
    { position: [-20, floorY - 11, -22], scale: [0.8, 0.85, 1], yaw: -0.22 },
    { position: [26, floorY - 14, -34], scale: [1.1, 1.15, 1.2], yaw: 0.35 },
    { position: [-32, floorY - 14, 18], scale: [0.9, 1.1, 1], yaw: 1.7 },
  ], [floorY]);
  // Retained source UVs carry the scan's erosion; this is actual midground geometry.
  return <InstanceBatch geometry={geometries.get(source.name)!} material={material} placements={placements} />;
}
