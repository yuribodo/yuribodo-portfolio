import { DefaultLoadingManager } from "three";
import { lobbyAssetUrl } from "./asset-url";
import { useGLTF, useTexture } from "@react-three/drei";

// Single source of truth for every GLB the lobby loads. Adding a new model:
// 1. drop the compressed GLB at public/lobby/models/<name>.glb
// 2. add an entry below
// 3. import LOBBY_MODELS.<name> wherever you load it via useGLTF()
//
// useGLTF.preload runs at module load — by the time DeskScene mounts, the
// browser has already kicked off the fetches in parallel.

import { LOBBY_MODELS } from "./asset-manifest";
export { LOBBY_MODELS } from "./asset-manifest";

DefaultLoadingManager.setURLModifier(lobbyAssetUrl);

// Keep Draco decoding on our origin: no external CDN round trip or dependency.
useGLTF.setDecoderPath("/lobby/draco/");

for (const path of Object.values(LOBBY_MODELS)) {
  useGLTF.preload(path);
}

for (const file of ["pokemon-front-charizard", "pokemon-back", "yugioh-front-mago-negro", "yugioh-back"]) {
  useTexture.preload(`/lobby/textures/${file}.webp`);
}
