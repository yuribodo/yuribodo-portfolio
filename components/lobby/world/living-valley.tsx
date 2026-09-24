"use client";
import {VALLEY_AXIS} from "@/lib/lobby/valley-terrain-grid";
import {spreadLandscape} from "./landscape-distance";
import { applyOutdoorLight, useOutdoorLight, type OutdoorLight } from "./outdoor-lighting";

import { useEffect, useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import { TerrainDataLoader } from "@/lib/lobby/terrain-data-loader";
import { TERRAIN_DATA_URL } from "@/lib/lobby/terrain-data-manifest";
import { useGroundTextures } from "./ground-textures";
import { groundMaterial } from "./terrain-pigment";
import { RiverWater } from "./river-water";
import {
  BoxGeometry, BufferGeometry, Color, Float32BufferAttribute, Group,
  Mesh, MeshStandardMaterial, Shape, ExtrudeGeometry,
  type Material,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { riverCenter, riverWidth, riverLevel, roadCenter, worldHeight } from "@/lib/lobby/world-geography";

function landGeometry(heights: Float32Array) {
  const axis=VALLEY_AXIS;
  const positions: number[] = [], indices: number[] = [], uv: number[] = [];
  let sample = 0;
  for (const z of axis) for (const x of axis) {
    const y = heights[sample++];
    positions.push(x, y, z); uv.push((x + 85) / 170, (85 - z) / 170);
  }
  const n = axis.length;
  for (let z = 0; z < n - 1; z++) for (let x = 0; x < n - 1; x++) {
    // The original high-resolution near ground owns this exact square.
    if (axis[x] >= -85 && axis[x + 1] <= 85 && axis[z] >= -85 && axis[z + 1] <= 85) continue;
    const a = z * n + x, b = a + 1, c = a + n, d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return spreadLandscape(geometry,true);
}

/** Continuous ground plus readable destinations, all real geometry. Repeated
 * buildings/trees are merged by material; distant scenery casts no desk shadows.
 */
function buildSettlement(light: OutdoorLight) {
  const buckets: Record<string, BufferGeometry[]> = { stone: [], roof: [], timber: [], windows: [], road: [], crops: [] };
  function add(g: BufferGeometry, surface: string, p = [0, 0, 0], yaw = 0, tint = 1) {
    g.rotateY(yaw); g.translate(p[0], p[1], p[2]);
    if (g.index) { const source = g; g = g.toNonIndexed(); source.dispose(); }
    g.deleteAttribute("uv"); g.clearGroups();
    const colors: number[] = [];
    const color = new Color().setRGB(tint, tint, tint);
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(color.r, color.g, color.b);
    g.setAttribute("color", new Float32BufferAttribute(colors, 3));
    buckets[surface].push(g);
  }
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, surface: string, yaw = 0, tint = 1) =>
    add(new BoxGeometry(w, h, d), surface, [x, y, z], yaw, tint);

  // Worn routes are now blended into the terrain material.
  // Stone viaducts cross the actual river channel at the town approaches.
  for (const z of [-96, -172]) {
    const x = riverCenter(z), half = riverWidth(z) + 7, y = riverLevel(z) + 7;
    box(x, y, z, half * 2, .5, 2.5, "stone");
    for (const side of [-1, 1]) box(x, y + .7, z + side * 1.15, half * 2, .55, .24, "stone");
    for (let pier = -2; pier <= 2; pier++) {
      const px = x + pier * half / 2.4;
      box(px, riverLevel(z) + 3.1, z, 1, 6.3, 2.3, "stone");
    }
    for (let span = -2; span < 2; span++) {
      const cx = x + (span + .5) * half / 2.4, r = half / 4.8 - .45;
      for (let stone = 0; stone < 11; stone++) {
        const a = stone / 11 * Math.PI, b = (stone + 1) / 11 * Math.PI;
        const s = new Shape();
        s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        s.absarc(0, 0, r, a, b, false);
        s.lineTo(Math.cos(b) * (r + .55), Math.sin(b) * (r + .55));
        s.absarc(0, 0, r + .55, b, a, true); s.closePath();
        add(new ExtrudeGeometry(s, { depth: 2.3, bevelEnabled: false, curveSegments: 3 }), "stone",
          [cx, y - r - .55, z - 1.15], 0, .75 + (stone % 3) * .07);
      }
    }
    // Approaches climb from each bank to the bridge deck.
    for (const side of [-1, 1]) {
      const p: number[] = [], idx: number[] = [];
      for (let i = 0; i <= 12; i++) {
        const xx = x + side * (half + i), t = i / 12;
        for (const dz of [-1.1, 1.1]) p.push(xx, (y + .28) * (1 - t) + (worldHeight(xx, z + dz) + .08) * t, z + dz);
        if (i < 12) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      const g = new BufferGeometry(); g.setAttribute("position", new Float32BufferAttribute(p, 3)); g.setIndex(idx); g.computeVertexNormals();
      // Both bridge approach directions need upward-facing triangles.
      if (side < 0) { const idx = g.getIndex()!; for (let i = 0; i < idx.count; i += 3) { const b = idx.getX(i + 1); idx.setX(i + 1, idx.getX(i + 2)); idx.setX(i + 2, b); } g.computeVertexNormals(); }
      add(g, "road");
    }
  }
  // Cultivated parcels beside the mill make the valley feel occupied. Every
  // row follows the same terrain surface, with an irregular grass margin.
  for (const [cx,cz,w,d] of [[-106,173,23,18],[-78,182,22,16],[roadCenter(-155)-34,-155,18,24]]) {
    const p:number[]=[], idx:number[]=[], c:number[]=[];
    const cols=32, rows=28;
    for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++) {
      const z=cz+(j/rows-.5)*d, x=cx+(i/cols-.5)*w+Math.sin(j/rows*Math.PI)*1.2;
      p.push(x,worldHeight(x,z)+.055,z);
      const furrow=i%4===0, shade=furrow?.58:.85+.12*Math.sin(j*.55+i*.8);
      const pigment=new Color(cz>0?"#b9ae76":"#91a269").multiplyScalar(shade);
      c.push(pigment.r,pigment.g,pigment.b);
      if(i<cols&&j<rows){const a=j*(cols+1)+i;idx.push(a,a+cols+1,a+1,a+1,a+cols+1,a+cols+2);}
    }
    const g=new BufferGeometry();g.setAttribute("position",new Float32BufferAttribute(p,3));
    g.setAttribute("color",new Float32BufferAttribute(c,3));g.setIndex(idx);g.computeVertexNormals();
    const nonIndexed=g.toNonIndexed();g.dispose();buckets.crops.push(nonIndexed);
  }
  const palette: Record<string, string> = { crops: "#ffffff", stone: "#c3c3a7", roof: "#9e7460", timber: "#556458", windows: "#4b717e", leaves: "#527d4e", road: "#b4b38c" };
  const group = new Group(); group.name = "valley-settlements-and-forest";
  for (const [key, geometries] of Object.entries(buckets)) {
    if (!geometries.length) continue;
    const geometry = mergeGeometries(geometries)!;
    geometries.forEach(g => g.dispose());
    const material = new MeshStandardMaterial({ color: palette[key], vertexColors: true, roughness: 1, envMapIntensity: .1 });
    applyOutdoorLight(material,light);
    spreadLandscape(geometry);
    const mesh = new Mesh(geometry, material); mesh.raycast = () => {}; group.add(mesh);
  }
  return group;
}

export function LivingValley({ floorY, active }: { floorY: number; active: boolean }) {
  const light=useOutdoorLight();
  const baked = useLoader(TerrainDataLoader, TERRAIN_DATA_URL);
  const textures = useGroundTextures(active);
  const land = useMemo(() => landGeometry(baked.far), [baked]);
  const landMaterial = useMemo(() => applyOutdoorLight(groundMaterial(textures,baked),light), [textures,light,baked]);
  const settlement = useMemo(() => buildSettlement(light), [light]);
  useEffect(() => () => land.dispose(), [land]);
  useEffect(() => () => { landMaterial.userData.disposeGroundTextures?.(); landMaterial.dispose(); }, [landMaterial]);
  useEffect(() => () => {
    settlement.traverse(o => { if (o instanceof Mesh) { o.geometry.dispose(); (o.material as Material).dispose(); } });
  }, [settlement]);
  return <group position={[0, floorY, 0]} name="continuous-valley">
    <mesh geometry={land} material={landMaterial} raycast={() => {}} />
    <primitive object={settlement} dispose={null} />
    <RiverWater active={active} />
  </group>;
}
