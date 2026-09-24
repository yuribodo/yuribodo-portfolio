# River surroundings and authored dragon flight

The approved slimes, terrace, desk and camera composition are preserved. This pass develops the river banks and replaces the rejected dragon model rather than adjusting its procedural wing hinges again.

## River surroundings

- 725 additional rooted placements: 187 broadleaf trees, 379 shrubs, 124 tall-grass clumps and 35 rocks. Density follows five sheltered coves and the shoreline; existing vegetation remains.
- Low vegetation joins water to the upper banks. Larger grove canopies break up the empty right-bank hillside. Rocks are clustered instead of scattered uniformly along the entire river.
- Bridge approaches, tributary channels and two landing approaches retain open space. New habitat coverage has a regression check against water levels and waterfall corridors.
- Two small working landings at design z −132 and −214 use terrain-sampled steps, deck boards, piles and rope rails. Open, curved clinker-style rowing boats float alongside the docks and rock subtly with the shared world clock.
- Two riverside houses and small market shelters reuse the existing licensed village kit and its terrain-fitting foundations.
- Trees reuse the existing eight-view distant canopy LOD; shrubs and rocks use the existing Poly Haven assets. No new vegetation downloads.

## Dragon replacement

“Dragon flying” by NORBERTO-3D, CC BY 4.0:

- Original: https://sketchfab.com/3d-models/dragon-flying-78f809b98bbe426e94d4024dc894b206
- Attributed redistribution: https://github.com/RobertTownley/gamehook/tree/0393225db7/public/resources/dragon
- The original scene.gltf's asset.extras explicitly identifies author, license, original URL and title. Provenance, modifications and output SHA-256 are recorded in assets/lobby-world/wildlife-sources.json and public/CREDITS.md.
- One dragon and rider replaces the previous two simple dragons. The model has 7,412 triangles and an authored 1.7-second animation, played at 0.68 speed (~2.5 seconds per cycle).
- Both skeletal and morph animation are preserved; wings, body, feet and tail move together. The obsolete procedural wing function and its tests were removed. Flight-tangent heading and terrain-clearance tests remain.
- The posed opening frame supplies the size bounds. Rest-pose bounds overestimate this model by about 2×. The runtime uses a 25-metre opening wingspan.
- Painted texture emission is disabled for ordinary daylight shading. Roughness, metalness and environment contribution are adapted to the scene.
- Cached source meshes/textures remain shared. Instances own cloned materials, skeletons and their mixer and dispose those resources on unmount.
- Runtime asset: public/lobby/world/dragon-flying.glb (~7.77 MB). More data than the old asset, especially due to the authored morph targets. Loaded inside the existing optional-world Suspense/error boundary.

Rebuild from the downloaded, attributed source directory:

```sh
npx gltf-transform optimize /tmp/norberto-dragon/scene.gltf public/lobby/world/dragon-flying.glb --compress draco --texture-compress webp --texture-size 1024
```

## Review

[Interactive comparison and recording](river-dragon.html). Captures are in ../implementation/river-dragon/. The previous fantasy-life captures remain a historical record.

The main camera is still a distant view: the landing details read as small signs of settlement. This is an iteration of the current art direction, not a claim of AAA rendering quality or a guaranteed frame rate.

## Validation and limits

- 23 unit tests passed; TypeScript, ESLint and production build passed.
- All seven lobby browser scenarios passed on native WebGL. The missing-assets scenario was also rerun with the new dragon URL explicitly blocked and passed.
- The dragon is culled as a whole using a conservative 27-metre sphere, since skinned/morph bounds vary during flight. Offscreen rendering and mixer evaluation are skipped; returning to view samples the shared world time, avoiding replay/reset.
- An initial production profile measured ~15.4 FPS at the desk and ~20.3 FPS facing rear, before whole-dragon culling. GPU usage remained ~88% after our browser exited, with other desktop Chrome processes active. These numbers are contended local observations and cannot be compared cleanly against earlier ~31/42 FPS runs. The additional shrubs still increase geometry cost; no universal frame-rate claim is made.

Final production observation after culling (RTX 3050 Laptop, 1440×900, DPR 1, 180 warm frames/view): **29.1 FPS desk / 42.2 FPS rear**, no browser errors. Rear submissions fell from ~241 to ~213 draws, confirming the off-camera dragon is skipped. The large FPS change between samples also reflects changing desktop/GPU load, so it is not attributed solely to culling. The final desk submits ~13.53 million triangles including shadow passes; performance remains a constraint. See ../implementation/river-dragon/frame-profile.json.
