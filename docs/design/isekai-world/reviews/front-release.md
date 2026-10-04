# Forward-facing first release

The first release stays at the desk. Look-around controls, keyboard/drag orbit handlers and the return-before-entry state are removed. The original seated camera pose, small pointer parallax, object interactions and monitor dive remain. Escape still skips the lobby. Capture and profile tools now exercise the supported forward view; historical rear captures are retained only as earlier review evidence.

## Paths and the left clearing

Seven curved dirt lanes branch from the existing riverside road and bridge approaches. They connect the left village and orchard, the western farmsteads and the eastern village, with small loops through settled areas. A 1024² terrain mask blends the existing soil material into the actual ground, so roads follow slopes without floating mesh ribbons. Vegetation placements leave the lanes clear. The mask does not affect the desk courtyard or rear terrain.

The distant slime clearing gains a small orchard with shrub understory, flower beds, a well, a market shelter and a mushroom grove. The existing residents and desk models are preserved. These details reuse the existing models and materials.

## Dragon diagnosis and fix

The model's authored animation was present. The bug was lifecycle ownership: a memoized mixer was stopped and uncached by effect cleanup. React StrictMode's setup/cleanup/setup cycle then reused that stopped mixer while the separate flight path continued to move the model. This produced a dragon flying around in a fixed wing pose.

Mixer and model creation now happen in effect setup, paired with their teardown. Every remount creates a fresh playing action. Whole-dragon camera culling and the shared world clock remain.

A native-browser probe mounts the actual ValleyCreatures component and licensed asset inside StrictMode and samples the rig/morph inputs every ~0.3 seconds. Its camera is explicitly aimed at the flight envelope, and visibility is asserted so offscreen culling cannot produce a false frozen-pose result.

- Previous code: 14 visible samples, 1,275 sampled values per pose; every consecutive pose delta was zero.
- Fixed code: every consecutive pose changed; no runtime errors. Actual desk footage also shows the wing strokes.
- Reproduction: with the local app running, execute `node scripts/check-dragon-flight.mjs`; optionally set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` for the native browser and supply a JSON output path.

## Verification

Production build, TypeScript, lint for changed files, 27 unit tests, all seven lobby browser scenarios and the StrictMode flight regression passed. Tests cover dry-ground paths, trail-mask continuity, absence of orbit controls, arrow/drag attempts retaining the desk view, mouse and keyboard object interactions, monitor entry, asset failures and mobile/reduced-motion bypasses.

The initial desk recording had no console/runtime errors. Final evidence and the before/after motion probe are in ../implementation/front-release/. See [the comparison and video](front-release.html).

The final production recording is 18 seconds and contains no console/runtime errors. A warm local RTX 3050 Laptop sample at 1440×900/DPR 1 measured about 31.9 FPS at the desk with the authored wing animation running. Rendering cost remains substantial; this is a local observation rather than a device-independent guarantee. No rear-view performance claim applies to this forward-only release.
