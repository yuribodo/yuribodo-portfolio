import { distantPosition, vistaSpread } from './world-distance';
import { riverCenter, riverLevel, riverWidth, roadCenter, worldHeight } from './world-geography';

export type WorldCharacterId = 'going-merry' | 'snorlax' | 'lancelot' | 'ainz' | 'fishstick';

/** Converted local assets, kept out of desk preloads. */
export interface WorldCharacterAsset {
  id: WorldCharacterId;
  url: string;
  /** Final scene coordinates, after distantPosition; y is relative to floorY. */
  position: readonly [number, number, number];
  yaw: number;
  /** Fit the opening pose to this height (or hull length for the Merry). */
  size: number;
  sizeAxis: 'x' | 'y' | 'z';
  /** Negative for a ship's submerged keel. */
  baseOffset?: number;
  clip?: string;
  clearance?: number;
}

const ground = (x: number, z: number) => distantPosition([x, worldHeight(x, z), z]);
const dockZ = -132;
const dockX = riverCenter(dockZ) + riverWidth(dockZ) + 1.7;
const dock = distantPosition([dockX, riverLevel(dockZ) + 1.1, dockZ]);

export const WORLD_CHARACTERS: readonly WorldCharacterAsset[] = [
  { id: 'going-merry', url: '/lobby/world/characters/going-merry.glb',
    position: distantPosition([riverCenter(dockZ) - 1, riverLevel(dockZ), dockZ]),
    yaw: .35, size: 26, sizeAxis: 'x', baseOffset: -2.1 },
  { id: 'snorlax', url: '/lobby/world/characters/snorlax.glb',
    position: ground(roadCenter(-145), -145), yaw: 1.5, size: 9, sizeAxis: 'y',
    baseOffset: -.15, clip: 'Snorlax_Breath', clearance: 12 },
  { id: 'lancelot', url: '/lobby/world/characters/lancelot.glb',
    position: distantPosition([riverCenter(-172) - riverWidth(-172) - 8, riverLevel(-172) + 6.8, -172]), yaw: .12, size: 17, sizeAxis: 'y', clearance: 18 },
  { id: 'ainz', url: '/lobby/world/characters/ainz.glb',
    position: ground(38, -135), yaw: -.22, size: 16, sizeAxis: 'y', baseOffset: 1.4, clearance: 23 },
  { id: 'fishstick', url: '/lobby/world/characters/fishstick.glb',
    position: [dock[0] - 4.8, dock[1], dock[2]], yaw: -.08,
    size: 12, sizeAxis: 'y', clip: 'Orange_Justice' },
];

/** Keep vegetation and small settlement props out of the occupied footprints. */
export function characterClearing(x: number, z: number) {
  const spread = vistaSpread(z);
  return WORLD_CHARACTERS.some(asset => asset.clearance !== undefined &&
    Math.hypot(x * spread - asset.position[0], z * spread - asset.position[2]) < asset.clearance);
}

export const SELECTED_WORLD_CHARACTERS = [
  { id: 'going-merry', label: 'Going Merry', source: '0e1f16189e8b4b4d9d9c3c60893d692b' },
  { id: 'snorlax', label: 'Snorlax', source: '2091c36f65084da582e22bd63c72aa67' },
  { id: 'lancelot', label: 'Lancelot Albion', source: 'dbbe317f6c61481fb33ffc66d9b52c55' },
  { id: 'ainz', label: 'Ainz Ooal Gown', source: 'e62df306954144fbb613c6fc3b04e682' },
  { id: 'fishstick', label: 'Fishstick', source: 'afc52bc2e68247bf8500cbe301f81528' },
] as const;

export const FISHSTICK_DANCE = {
  name: 'Orange Justice',
  source: '31b3596641af4e238c1491c450cc6df5',
} as const;
