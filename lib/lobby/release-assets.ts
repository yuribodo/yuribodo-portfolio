import { useGLTF, useTexture } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { releaseGroundTextures } from "@/components/lobby/world/ground-textures";
import { LOBBY_MODELS } from "./asset-manifest";
import { CLOUD_VOLUMES, CloudVolumeLoader } from "./cloud-volume-loader";
import { closeBitmapTextures, installBitmapTextureLoader } from "./bitmap-texture-loader";
import { GROUND_PREVIEW_TEXTURES } from "./ground-preview-manifest";
import { forgetClosedBitmaps, haveClosedBitmaps } from "./texture-upload-queue";
import { TerrainDataLoader } from "./terrain-data-loader";
import { TERRAIN_DATA_URL } from "./terrain-data-manifest";
import { WORLD_ASSETS } from "./world-assets";
import { WORLD_CHARACTERS } from "./world-characters";

// Frees what the lobby parked in drei/suspend-react's module cache (parsed GLTF
// scenes, decoded images, terrain and cloud data) once the intro is over.
//
// Replay semantics: the lobby can run again in the same page load (client-side
// Link to '/#projects'). After a release every entry below is gone, so a replay
// re-fetches (HTTP cache) and re-parses: cold, but correct. Never assume a
// cached scene outlives a release. Run it only on the terminal 'done' state,
// after the R3F Canvas teardown; clearing under a mounted Suspense subtree
// re-suspends and refetches. Keys are the unversioned paths: lobbyAssetUrl()
// rewrites them inside the loader, not in the cache key.
//
// Bitmaps: once a scene's textures are on the GPU, PreparedGroup closes their decoded ImageBitmaps
// (texture-upload-queue releaseUploadedBitmaps; GLB images only: loose images decoded by bitmap-texture-loader
// are shared by every consumer of a cache entry and close here instead), so a cached scene can only be uploaded by the renderer that
// already has it. A replay that cancels the pending release (lobby-gate) must therefore clear the caches
// itself: see rearmLobbyAssets.
//
// Imported lazily by the gate so three/drei stay out of the entry bundle.

// assets.ts imports this module before its own module-level useTexture.preload calls, so loose images
// (card decks, terrace, canopies, ground) are all decoded to ImageBitmaps from the first request on.
installBitmapTextureLoader();

/** Not exported by any module; lib/lobby/release-assets.test.ts fails if a useGLTF/useTexture literal is missing. */
const SCATTERED_GLTF_URLS = [
  "/lobby/world/valley-nature.glb",
  "/lobby/world/valley-village.glb",
  "/lobby/world/meadow-flowers.glb",
  "/lobby/world/living-mill.glb",
  "/lobby/world/natural-vegetation.glb",
  "/lobby/world/toothless-flight.glb",
  "/lobby/world/organic-tree_small_02.glb",
  "/lobby/world/organic-pine_tree_01.glb",
  "/lobby/world/organic-shrub_02.glb",
  "/lobby/world/organic-fern_02.glb",
  "/lobby/world/organic-rock_moss_set_01.glb",
  "/lobby/world/nature-kit.glb",
  "/lobby/world/coastal-cliff.glb",
  "/lobby/world/reference-houses.glb",
  "/lobby/world/characters/royal-court.glb",
] as const;

export const LOBBY_GLTF_URLS: readonly string[] = [
  ...Object.values(LOBBY_MODELS),
  ...Object.values(WORLD_ASSETS),
  ...WORLD_CHARACTERS.map(({ url }) => url),
  ...SCATTERED_GLTF_URLS,
];

/** [front, back] as read by each deck's single array useTexture call. */
export const CARD_TEXTURE_PAIRS = [
  ["/lobby/textures/pokemon-front-charizard.webp", "/lobby/textures/pokemon-back.webp"],
  ["/lobby/textures/yugioh-front-mago-negro.webp", "/lobby/textures/yugioh-back.webp"],
] as const;

/** One cache entry per useTexture call: a string key, or an array key for an array call. */
export const LOBBY_TEXTURE_KEYS: readonly (string | readonly string[])[] = [
  ...CARD_TEXTURE_PAIRS,
  GROUND_PREVIEW_TEXTURES,
  "/lobby/world/limestone.webp",
  "/lobby/world/foliage.webp",
  "/lobby/world/rock-face-color.webp",
  "/lobby/world/canopy-pine_tree_01.webp",
  "/lobby/world/canopy-tree_small_02.webp",
  "/lobby/world/characters/ainz-circle.jpg",
];

let released = false;
const listeners = new Set<() => void>();

/** True between a release and the next rearm; assets.ts skips its module-level preloads while set. */
export const isLobbyReleased = () => released;

/** The lobby is about to run again (or its chunk is still loading after a replay). A replay that cancelled the
 * release timer would reuse cached scenes with closed bitmaps, so clear them now instead of keeping them. */
export function rearmLobbyAssets() {
  if (!released && haveClosedBitmaps()) clearCaches();
  released = false;
}

/** Runs after the caches are cleared on every release, for modules with their own lobby-lifetime state. */
export function onLobbyRelease(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function clearCaches() {
  forgetClosedBitmaps();
  for (const url of LOBBY_GLTF_URLS) useGLTF.clear(url);
  for (const key of LOBBY_TEXTURE_KEYS) useTexture.clear(key as string | string[]);
  useLoader.clear(TerrainDataLoader, TERRAIN_DATA_URL);
  useLoader.clear(CloudVolumeLoader, CLOUD_VOLUMES);
  releaseGroundTextures();
  closeBitmapTextures();
  for (const listener of listeners) listener();
}

/** Idempotent. Late loads that were still in flight lose their cache entry and are dropped when they land. */
export function releaseLobbyAssets() {
  released = true;
  clearCaches();
  performance.mark("lobby:released");
}
