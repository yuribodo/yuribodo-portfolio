import { RIVER_STOPS } from './riverbank-habitats';
import { characterClearing } from './world-characters';
import { HAMLETS } from './fantasy-landmarks';
import { FANTASY_RESIDENTS } from './wildlife-habitats';
import { riverCenter, riverLevel, riverWidth, roadCenter, VISTA_STREAMS, vistaStream, worldHeight, worldSlope } from './world-geography';
import { vistaSpread } from './world-distance';

export interface SettlementPlacement { position: [number, number, number]; scale: number; yaw: number }
export interface FoundationPlacement { position: [number, number, number]; scale: [number, number, number]; yaw: number }
interface FootprintBounds { min: { x: number; z: number }; max: { x: number; z: number } }

/** Seat each building on the highest sampled corner and return the plinth that closes the gap to the lowest one. */
export function settleOnTerrain(placements: SettlementPlacement[], bounds: FootprintBounds, floorY: number, footprint = .75): FoundationPlacement[] {
  const foundations: FoundationPlacement[] = [];
  for (const p of placements) {
    const width = (bounds.max.x - bounds.min.x) * p.scale * footprint, depth = (bounds.max.z - bounds.min.z) * p.scale * footprint;
    const spread = vistaSpread(p.position[2]), c = Math.cos(p.yaw), s = Math.sin(p.yaw);
    const heights = [worldHeight(p.position[0], p.position[2])];
    for (const x of [-width / 2, width / 2]) for (const z of [-depth / 2, depth / 2]) heights.push(worldHeight(p.position[0] + (x * c + z * s) / spread, p.position[2] + (-x * s + z * c) / spread));
    const top = Math.max(...heights) + .08, bottom = Math.min(...heights) - .35;
    p.position[1] = floorY + top - .04;
    foundations.push({ position: [p.position[0], floorY + (top + bottom) / 2, p.position[2]], scale: [width, top - bottom, depth], yaw: p.yaw });
  }
  return foundations;
}

/** Quaternius village buildings (`valley-village.glb`). */
export const VILLAGE_KINDS = ['house-a', 'house-b', 'house-c', 'inn', 'mill', 'tower', 'market', 'well'] as const;
/** Franchise-reference buildings (`reference-houses.glb`); see assets/lobby-world/reference-house-sources.json. */
export const REFERENCE_HOUSE_KINDS = ['anime-house', 'kame-house', 'ichiraku-ramen', 'pokemon-center', 'hobbit-house', 'pineapple-house'] as const;
export type VillageKind = (typeof VILLAGE_KINDS)[number];
export type ReferenceHouseKind = (typeof REFERENCE_HOUSE_KINDS)[number];
export type SettlementKind = VillageKind | ReferenceHouseKind;

/** Placement keys are `${kind}:${'front' | 'rear'}`; the front vista is drawn at 2.1× model scale. */
export type SettlementRegions = Record<string, SettlementPlacement[]>;

export function settlementKind(key: string) { return key.split(':')[0] as SettlementKind; }
export function isReferenceHouse(kind: string): kind is ReferenceHouseKind {
  return (REFERENCE_HOUSE_KINDS as readonly string[]).includes(kind);
}

/** The Kame House island sits in the river; everything else stands on the terrain. */
export const KAME_ISLAND_Z = -196;

/** Every reference model was authored with its entrance on +Z; turn that toward the desk at the origin. */
export function facingDesk(x: number, z: number, offset = 0) { return Math.atan2(-x, -z) + offset; }

/** Landmark buildings, one each, spread across the visible vista (village coordinates). */
// Spots were chosen from a rendered visibility pass: each sits on open, gently
// sloped ground with a clear line of sight from the desk, spread across the frame.
const LANDMARKS: readonly { kind: ReferenceHouseKind; x: number; z: number; scale?: number; turn?: number }[] = [
  { kind: 'ichiraku-ramen', x: -29, z: -108, scale: 1.05, turn: .1 },    // near, left of the road
  { kind: 'pineapple-house', x: -48, z: -139, scale: 1.15, turn: .08 },   // mid, open plateau left of the town
  { kind: 'pokemon-center', x: 47, z: -179, scale: 1.1, turn: -.06 },    // mid-right, far bank below the arch
];
/** Hobbit holes read as doors cut into the far slopes. */
const HOBBIT_SLOPES: readonly [number, number][] = [[-40, -217], [57, -187], [75, -139]];
/** Small timber-house groups on the plateau and the far right bank keep the settlement from reading as one ribbon of roofs. */
const HOUSE_CLUSTERS: readonly [number, number][] = [[-59, -135], [-47, -167], [68, -132], [78, -126]];
/** Frontage slot handed to Ichiraku. */
const FRONTAGE_GAP = { row: 2, side: -1 } as const;

export function settlementPlacements(floorY: number): SettlementRegions {
  const regions: SettlementRegions = {};
  let seed = 8173;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const add = (name: SettlementKind, x: number, z: number, scale = 1, yaw = 0, y = floorY + worldHeight(x, z) - .15) => {
    if (characterClearing(x, z)) return;
    if (z < 0 && VISTA_STREAMS.some((_, i) => Array.from({ length: 41 }, (_, j) => vistaStream(i, j / 40)).some(s => Math.hypot(x - s.x, z - s.z) < s.width * .5 + 2.2))) return;
    const key = `${name}:${z < 0 ? 'front' : 'rear'}`;
    (regions[key] ??= []).push({ position: [x, y, z], scale: scale * (z < 0 ? 2.1 : 1), yaw });
  };
  // Street frontage: anime timber houses turned toward the desk, smaller Quaternius houses behind them.
  for (let row = 0; row < 18; row++) {
    const z = -87 - row * 9.5;
    for (const side of [-1, 1]) {
      if (row === 1 || row === 6) continue;
      const x = roadCenter(z) + side * (6.5 + random() * 2);
      if (Math.abs(x - riverCenter(z)) < riverWidth(z) + 3 || worldSlope(x, z) > .58) continue;
      if (row !== FRONTAGE_GAP.row || side !== FRONTAGE_GAP.side) add('anime-house', x, z + (random() - .5) * 2, .82 + random() * .18, facingDesk(x, z, (random() - .5) * .2));
      if (row % 2 === 0) add('house-b', x + side * 7, z + 3, .8, -side * Math.PI / 2 + .12);
    }
  }
  for (const [x, z] of HOUSE_CLUSTERS) add('anime-house', x, z, .85 + random() * .2, facingDesk(x, z, (random() - .5) * .3));
  for (const { kind, x, z, scale = 1, turn = 0 } of LANDMARKS) add(kind, x, z, scale, facingDesk(x, z, turn));
  for (const [x, z] of HOBBIT_SLOPES) add('hobbit-house', x, z, 1.15, facingDesk(x, z));
  // Farmsteads occupy the upper edge of the cultivated terraces.
  for (const [x, z] of [[-61, -153], [-59, -185], [-58, -220], [-59, -255]]) {
    if (worldSlope(x, z) < .65) { add('house-b', x, z, .9, .35); add('house-a', x - 5, z + 4, 1.4, -.2); }
  }
  // Hillside hamlets have a square and irregular lanes, rather than a single
  // miniature ribbon of roofs along the river. Local model scale stays consistent.
  for (const [cx, cz, angle] of HAMLETS) {
    for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 9; i++) {
      if (i === 2 || i === 6) continue;
      const a = i / 9 * Math.PI * 2 + angle, r = ring ? 11 : 6;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r * .72;
      if (worldSlope(x, z) > 1.6 || FANTASY_RESIDENTS.some(r => Math.hypot(r.x - x, r.z - z) < 3.5)) continue;
      const kind: SettlementKind = i % 4 === 0 ? 'anime-house' : i % 3 === 0 ? 'house-a' : i % 2 ? 'house-b' : 'house-c';
      add(kind, x, z, 1.0 + random() * .24, kind === 'anime-house' ? facingDesk(x, z) : -a + Math.PI / 2);
    }
    add('well', cx, cz, 1.2);
    add('tower', cx - 3, cz - 8, 1.15, .1);
    add('market', cx + 2, cz + 1, 1.2, .5);
  }
  for (const { z, side } of RIVER_STOPS) {
    const x = riverCenter(z) + side * (riverWidth(z) + 8);
    add('house-b', x, z, 1.0, side * Math.PI / 2);
    add('market', x + side * 1.2, z + 4, .8, side * Math.PI / 2);
  }
  // Master Roshi's island sits mid-river where the channel is widest.
  add('kame-house', riverCenter(KAME_ISLAND_Z), KAME_ISLAND_Z, 1, facingDesk(riverCenter(KAME_ISLAND_Z), KAME_ISLAND_Z, .15), floorY + riverLevel(KAME_ISLAND_Z) + .2);
  add('market', -77, -97, 1.15, .5);
  add('well', -71, -95, 1.1);
  const squareZ = -144, squareX = roadCenter(squareZ);
  add('well', squareX - 3, squareZ);
  for (let i = 0; i < 4; i++) add('market', squareX - 5 - i % 2 * 4, squareZ - 4 + Math.floor(i / 2) * 5, 1, Math.PI / 2);
  add('tower', roadCenter(-120) - 18, -120, 1, .2);
  add('mill', roadCenter(-182) - 24, -182, 1, .35);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 5; col++) {
    const x = -84 + col * 8.5, z = 123 + row * 10;
    if (worldSlope(x, z) > .55) continue;
    add(col % 3 === 0 ? 'inn' : (col + row) % 2 ? 'house-c' : 'house-b', x, z, .8 + random() * .2, Math.PI + .22);
  }
  add('mill', -93, 140, 1.1, Math.PI + .3);
  return regions;
}
