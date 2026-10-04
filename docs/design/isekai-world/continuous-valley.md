# Continuous 3D valley

The user approved the revised terrace and identified the distant background as the remaining problem: it looked like a flat picture, without the sense that one could travel toward its landmarks. This pass replaces the two landscape cards with connected 3D terrain, a river, roads, bridges, settlements and woodland. The approved desk and terrace remain the foreground baseline.

## Spatial structure

`lib/lobby/world-geography.ts` is the common elevation source for the near ground, far ground, roads, building foundations, forest and academy. It preserves the previous terrain within 32 scene units of the desk and blends out to a river valley with surrounding ridges. The existing detailed near mesh owns the central 170 × 170 square; the distant mesh has a matching opening, and both use the same pigment/material at the boundary. The full landscape extends 600 scene units in each direction.

The front stair leads into a road through the riverside settlement. Two stone bridges with arched supports cross the river. The opposite route leads to the academy's front steps. Buildings have foundations, pitched roofs, chimneys, timber courses and inset windows. Distant trees reuse the credited nature kit and are instanced without shadow casting. Instances are grouped into 80-unit regions so frustum culling excludes forests behind the camera, instead of submitting the entire woodland in one global batch.

The river is a terrain-occluded mesh with animated flow shading. World materials keep the existing entry dimmer. Optional texture/forest failures still allow the desk and portfolio entry to work.

The landscape cards and the old panorama containing painted land are no longer requested. The subsequent atmosphere/art pass replaces the sky panorama as well: a procedural sky dome, raymarched cloud volumes and sky-derived reflections now supply the atmosphere. The visible terrain and destinations are actual geometry. This does not add walking, collision or a full open-world gameplay system. The visitor still looks around from the desk.

## Asset reproduction

- `node scripts/build-academy-sanctuary.mjs` now builds the academy without its separate hill (37,004 triangles before compression). The shared terrain supplies its ground.
- `gltf-transform simplify public/lobby/world/nature-kit.glb /tmp/valley-nature.glb --ratio 0.5 --error 0.02`
- `gltf-transform meshopt /tmp/valley-nature.glb public/lobby/world/valley-nature.glb`

The requested simplification ratio is only a target: the kit's topology limits reduction, and tree triangle counts remain close to the source. Do not describe this asset as half the geometry. Instancing reduces draw submissions, not submitted triangles.

The sky source is `assets/lobby-world/sky-only-panorama.png`; the runtime WebP is 1774 × 887, 138,004 bytes. It was generated with the built-in image tool from a sky-only equirectangular prompt: anime-painted cerulean sky, ivory cumulus clouds, lavender undersides, level horizon and pale blue lower-hemisphere haze; no terrain, buildings or landmarks. Conversion to WebP used Sharp at quality 92. Its UV coverage is tuned in the sky sphere to retain a broad open sky at the actual desk camera.

## Evidence and validation

[Approved foreground before this pass](implementation/before-continuous-valley.png), [desktop](implementation/desktop.png), [laptop](implementation/laptop.png), [wide](implementation/wide.png), [rear](implementation/rear.png).

Production build, TypeScript, targeted ESLint and whitespace checks pass. All seven browser tests pass with the native NVIDIA renderer, including camera/entry, desk collectibles, loading and skip, optional asset failure, mobile/reduced-motion bypass and a full turn verifying that none of the old flat landscape backdrops is loaded. Production captures report no console or page errors. Regional forest culling reduced the local desk sample from 7.41 million submitted triangles to 3.12 million, with a tradeoff from 231 to 313 draw calls. The warm sample measured about 46 FPS at the desk and 52 FPS at the rear on the RTX 3050 laptop; this is not a universal frame-rate guarantee. The native warm-frame diagnostic is in [frame-profile.json](implementation/frame-profile.json); its caveats still apply.

The valley now has physical depth and connected destinations. Its art still needs refinement: mountain surfaces are relatively simple, settlement modules repeat, and canopy cards remain visible. Art acceptance and performance on other hardware remain open. A rendered screenshot is not proof of a walkable gameplay world.

Technical basis: [Three.js instancing](https://threejs.org/docs/pages/InstancedMesh.html), [Three.js atmospheric fog](https://threejs.org/manual/en/fog.html), and [Epic's landscape heightfield workflow](https://dev.epicgames.com/documentation/unreal-engine/creating-landscapes-in-unreal-engine). The specific composition and implementation here are project decisions.

The subsequent [atmosphere and village polish](atmosphere-village-polish.md) supersedes the sky, village and performance details above. The older sky generation notes remain as asset history.
