"use client";

import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { CatmullRomCurve3, Color, DoubleSide, Float32BufferAttribute, MeshStandardMaterial, PlaneGeometry, Shape, ShapeGeometry, SRGBColorSpace, TubeGeometry, Vector3, type BufferGeometry } from "three";
import { applyOutdoorLight, useOutdoorLight } from "./outdoor-lighting";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** Close planting belongs to the architecture: vines follow the arch and
 * flower beds collect at wall bases, leaving the occupied terrace clear. */
export function TerraceGarden({ floorY }: { floorY: number }) {
  const light=useOutdoorLight();
  const texture = useTexture("/lobby/world/foliage.webp", t => { t.colorSpace = SRGBColorSpace; });
  const { leaves, stems, leafMaterial, stemMaterial } = useMemo(() => {
    const leafParts: BufferGeometry[] = [], stemParts: BufferGeometry[] = [];
    const leaf = new Shape();
    leaf.moveTo(0, -0.8);
    leaf.bezierCurveTo(-0.65, -0.2, -0.6, 0.35, -0.25, 0.43);
    leaf.lineTo(0, 0.85); leaf.lineTo(0.25, 0.43);
    leaf.bezierCurveTo(0.6, 0.35, 0.65, -0.2, 0, -0.8);
    const base = new ShapeGeometry(leaf, 5);
    const pos = base.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, 0.16 * (1 - Math.abs(pos.getX(i))));
    base.computeVertexNormals();
    const colors = ["#416b4b", "#68884a", "#8e9f58", "#527d55"];
    for (let vine = 0; vine < 16; vine++) {
      const alongArch = vine < 10;
      const x = alongArch ? 3.4 + vine * 0.29 + Math.sin(vine * 1.7) * 0.11 : [-4.35, -3.92, -2.68, 2.2, 3.65, 4.3][vine - 10];
      const top = alongArch ? 2.2 + Math.sqrt(Math.max(0, 1.91 ** 2 - (x - 5.2) ** 2)) : 0.62;
      const length = alongArch ? 0.45 + (vine % 5) * 0.33 : 0.38 + (vine % 3) * 0.12;
      const z = alongArch ? -7.32 : -4.34;
      const points = Array.from({ length: 25 }, (_, i) => new Vector3(
        x + Math.sin(i * 0.48 + vine) * 0.055, top - i / 24 * length,
        z + Math.sin(i * 0.28) * 0.04));
      stemParts.push(new TubeGeometry(new CatmullRomCurve3(points), 28, 0.006, 3));
      for (let i = 1; i < points.length; i++) for (const side of [-1, 1]) {
        const g = base.clone(), scale = 0.031 + ((vine + i) % 4) * 0.008;
        g.scale(scale, scale * 1.35, scale);
        g.rotateY(side * 0.4); g.rotateZ(side * (0.5 + (i % 4) * 0.24));
        g.translate(points[i].x + side * 0.043, points[i].y, points[i].z + 0.02);
        const c = new Color(colors[(vine + i) % colors.length]), values = [];
        for (let n = 0; n < g.attributes.position.count; n++) values.push(c.r, c.g, c.b);
        g.setAttribute("color", new Float32BufferAttribute(values, 3));
        leafParts.push(g);
      }
    }
    base.dispose();
    const leaves = mergeGeometries(leafParts)!, stems = mergeGeometries(stemParts)!;
    [...leafParts, ...stemParts].forEach(g => g.dispose());
    return { leaves, stems,
      leafMaterial: applyOutdoorLight(new MeshStandardMaterial({ vertexColors: true, roughness: 1, side: DoubleSide, envMapIntensity: 0.1 }),light,.16),
      stemMaterial: applyOutdoorLight(new MeshStandardMaterial({ color: "#536442", roughness: 1 }),light),
    };
  }, [light]);
  useEffect(() => () => { leaves.dispose(); stems.dispose(); leafMaterial.dispose(); stemMaterial.dispose(); }, [leaves, stems, leafMaterial, stemMaterial]);
  const bedMaterial=useMemo(()=>applyOutdoorLight(new MeshStandardMaterial({map:texture,color:"#ccd3bb",alphaTest:.45,side:DoubleSide,roughness:1,envMapIntensity:.1}),light,.16),[texture,light]);
  useEffect(()=>()=>bedMaterial.dispose(),[bedMaterial]);
  const beds = useMemo(() => {
    const parts: BufferGeometry[] = [];
    for (let i = 0; i < 28; i++) {
      const side = i % 2 ? 1 : -1;
      const x = i < 14 ? side * (2.0 + (i % 7) * 0.43) : side * 4.7;
      const z = i < 14 ? -4.27 + Math.sin(i * 2.4) * 0.08 : -3.4 + (i - 14) * 0.55;
      const size = 0.56 + (i % 4) * 0.11;
      for (const angle of [0, Math.PI / 2]) {
        const g = new PlaneGeometry(size, size * 0.49);
        g.rotateY(angle + i * 0.73); g.translate(x, size * 0.21, z);
        parts.push(g);
      }
    }
    const geometry = mergeGeometries(parts)!;
    parts.forEach(g => g.dispose());
    return geometry;
  }, []);
  useEffect(() => () => beds.dispose(), [beds]);
  return <group position={[0, floorY, 0]}>
    <mesh geometry={leaves} material={leafMaterial} castShadow receiveShadow raycast={() => {}} />
    <mesh geometry={stems} material={stemMaterial} raycast={() => {}} />
    <mesh geometry={beds} material={bedMaterial} receiveShadow raycast={() => {}} />
  </group>;
}
