import { useGLTF } from "@react-three/drei";

// Single source of truth for every GLB the lobby loads. Adding a new model:
// 1. drop the compressed GLB at public/lobby/models/<name>.glb
// 2. add an entry below
// 3. import LOBBY_MODELS.<name> wherever you load it via useGLTF()
//
// useGLTF.preload runs at module load — by the time DeskScene mounts, the
// browser has already kicked off the fetches in parallel.

export const LOBBY_MODELS = {
  desk: "/lobby/models/wooden_desk.glb",
  monitor: "/lobby/models/monitor.glb",
  macbook: "/lobby/models/macbook_pro_closed.glb",
  keyboard: "/lobby/models/keyboard-razer.glb",
  mouse: "/lobby/models/mouse-razer.glb",
  figureMinato: "/lobby/models/minato.glb",
  figureSeismitoad: "/lobby/models/seismitoad.glb",
  figureDrago: "/lobby/models/drago.glb",
  nintendoDs: "/lobby/models/nintendo-ds.glb",
  xboxController: "/lobby/models/xbox-controller.glb",
  beybladePegasus: "/lobby/models/beyblade-pegasus.glb",
} as const;

for (const path of Object.values(LOBBY_MODELS)) {
  useGLTF.preload(path);
}
