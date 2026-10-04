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
import { CARD_TEXTURE_PAIRS, isLobbyReleased } from "./release-assets";
export { LOBBY_MODELS } from "./asset-manifest";

DefaultLoadingManager.setURLModifier(lobbyAssetUrl);

// Keep Draco decoding on our origin: no external CDN round trip or dependency.
useGLTF.setDecoderPath("/lobby/draco/");

// The gate can skip before this chunk evaluates; preloading then would park
// ~3 MB in a cache nothing will read or release.
if (!isLobbyReleased()) {
  for (const path of Object.values(LOBBY_MODELS)) {
    useGLTF.preload(path);
  }

  // Same array keys as the useTexture calls in the card decks, so these are the entries that get read.
  for (const pair of CARD_TEXTURE_PAIRS) {
    useTexture.preload([...pair]);
  }
}
