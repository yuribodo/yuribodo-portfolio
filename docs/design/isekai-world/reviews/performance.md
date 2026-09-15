# Skybound performance pass

The approved forward desk composition is preserved. This pass removes hidden work, reduces CPU/GPU resource preparation, and keeps the authored dragon flight, fantasy inhabitants, volumetric sky, terrain and desk interactions.

## Changes

- The portfolio's full-screen gradient/dithering and ASCII artwork pause behind the lobby and when the page is hidden. The hero resumes during the monitor dive, before the handoff. Its render loop also pauses when scrolled offscreen.
- The hero and monitor share a small Bayer lookup implementation. Unit coverage compares its byte output with the original quantization formula, including Canvas rounding and alpha preservation. Resolution and palette are unchanged.
- World instance batches submit only instances whose padded geometry bounds intersect the camera. Off-camera shadow casters remain intact. Parent transforms, camera movement and resize are respected; unchanged camera matrices reuse the selection. Instance buffers are released independently of their shared geometry/materials.
- Geometry baking retains existing float attributes instead of rebuilding them through temporary JavaScript arrays. Geometry bounds are computed only when absent.
- The rear academy is omitted from this forward-only release. Other visible landmarks and the terrace retain their positions.
- The authored dragon is re-encoded with Meshopt, reducing 7,765,504 to 2,583,116 bytes. Rig and morph animation remain, with the StrictMode flight regression passing on the actual compressed asset.
- Normal/roughness/occlusion maps on the four loaded organic vegetation/rock kits are capped at 1024 pixels and encoded at WebP quality 95. Original albedo/alpha images and all geometry buffers are retained byte-for-byte. This saves about 192 MiB of theoretical RGBA texture storage including mipmaps across these files; it is an estimate, not measured VRAM. The desk's assets are untouched.
- Cloud density and light fields are baked offline, packed into two channels, then gzip-compressed to 898,710 bytes total. The browser reconstructs the same four-channel voxels; automated tests compare every byte with the original generator. Clouds still use the original 3D volume raymarch, lighting and animation shaders. Their optional boundary preserves entry if a file fails.
- Draco decoder files and their licenses are served locally, removing the external decoder request.
- The entire R3F render loop pauses in a hidden tab and resumes on return.

## Measurements

See `../implementation/performance/before.json`, `after.json` and `after-repeat.json`. The baseline is production commit f5b00f4. Measurements use native GPU Chromium, RTX 3050 Laptop, 1440×900, DPR 1, fresh browser contexts and 180 warm animation frames. One browser at a time; other desktop applications may be running. These are local observations, not a device-independent 60 FPS or peak-memory guarantee.

| Metric | Before | After (two runs) |
|---|---:|---:|
| Desk ready (s) | 9.6 | 8.0–8.6 |
| Warm rAF cadence (FPS) | 26.6 | 49.8–59.3 |
| P95 frame duration (ms) | 50.1 | 16.8–33.4 |
| JS heap estimate (MB) | 645.6 | 383.2–394.1 |
| Lobby asset bodies (MB) | 38.9 | 31.2–31.2 |
| Submitted triangles/frame (million) | 14.5 | 13.2–13.2 |


“Desk ready” is navigation to the `idle` state after the loaded desk renders two frames. At the time of these measurements, an entrance fade followed it. The subsequent [loading handoff fix](loading-handoff.md) removes that extra delay. Asset bytes count decoded HTTP resource bodies under `/lobby/`, including local decoders and cloud volumes; they exclude app JavaScript, fonts and HTML. They are not total network transfer bytes. Heap is Chromium's JavaScript estimate, sampled after warmup, without forcing garbage collection. Submitted triangles include shadow passes.

The intermediate `after-initial.json` and `after-clouds.json` document incremental measurements. Moving cloud generation alone did not improve the full load in that run; texture preparation remained expensive. The final measurements include the auxiliary texture optimization.

## Validation

- 30 unit tests, TypeScript, production build and ESLint on changed files.
- Eight native-browser scenarios, including covered artwork, hidden-tab render suspension/resume, desk interactions, monitor entry, loading skip, missing assets, mobile and reduced motion.
- Separate StrictMode flight regression: 14 changing poses, 1,275 rig/morph channels, no errors.
- Texture validation verifies unchanged geometry/accessors/nodes and unchanged base-color buffers.
- Before/after desktop captures and resized 1280×720 / 1920×1080 views retain the visible composition. Moving creatures, clouds and lighting are at different animation times.
- The three previously documented broader-lobby lint diagnostics in unchanged keyboard/mouse components are outside this patch.

At a simulated 20 Mbps download and 40 ms latency, the desk reached idle in 10.6 s and the last lobby asset response completed at 12.4 s. Optional world assets continue loading independently of desk readiness. No runtime/console errors were recorded. See `network-20mbps.json`; there is no pre-change throttled baseline, so this is a usability check rather than a speedup claim.

## Reproduce

```sh
npm test
npm run build
npm run start -- --port 3003
PLAYWRIGHT_HARDWARE_GPU=1 PLAYWRIGHT_BASE_URL=http://localhost:3003 npx playwright test tests/browser/lobby-world.spec.ts
WORLD_PROFILE_URL=http://localhost:3003 WORLD_PROFILE_OUTPUT=/tmp/world-profile.json node scripts/profile-world.mjs
WORLD_REVIEW_URL=http://localhost:3003 node scripts/check-dragon-flight.mjs /tmp/dragon-flight.json
npx tsx scripts/bake-cloud-volumes.ts
```

Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to a GPU-capable Chromium installation when needed. The profiler supports `WORLD_CPU_PROFILE=/tmp/load.cpuprofile`, `WORLD_PROFILE_SCREENSHOT=/tmp/desk.png` and `WORLD_NETWORK_MBPS=20` (40 ms simulated latency).

Dragon re-encoding from the previous committed asset:

```sh
npx gltf-transform meshopt input-dragon.glb output-dragon.glb --quantize-position 16 --quantize-normal 12 --quantize-texcoord 14 --quantize-weight 12
```

Texture optimization from each original organic kit:

```sh
node scripts/optimize-world-textures.mjs input.glb output.glb
```

The repacker requires separate input/output files and accepts the original Draco/WebP kits. It does not simplify geometry. Existing Poly Haven and dragon attribution remains in the earlier asset/review documentation; these optimizations are additional modifications to those assets.
