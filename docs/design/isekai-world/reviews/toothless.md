# Toothless integration — 2026-09-14

The user selected **Toothless (Rigged) - HTTYD**, by **Stuck On Saturn**, and supplied the original Sketchfab ZIP. It replaces the generic rider dragon in the existing flight path. The desk, landscape and single left hopping slime are preserved.

## Source and attribution

- [Author and original model](https://sketchfab.com/3d-models/toothless-rigged-httyd-91d8197bf907439daa1bd78ad6a775cc), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Original archive SHA-256: `39801de33f6e9ab0c5aa06b2bdb435373dd6caca96e27c0d690be894a3387ab0`.
- The archive contains `source/Toothless.fbx`, body diffuse/normal maps, eye colour and gum normal maps. No animation was supplied.
- Public attribution, license, original links and modifications are in `/CREDITS.md`, accessible through the desk's **3D credits** link. The fan character is identified as unofficial; no creator/franchise endorsement is implied.

## Adaptation

The mesh, weights, UVs and facial skeleton are retained. A shared flight root joins the separate body/wing roots without moving their rest positions. The 10.8-second seamless cycle articulates 62 joints: the ten-joint chain in each wing, membrane fingers, neck/head stabilization, tucked legs, ears and seven tail joints. The revised motion uses hand-shaped periodic cubic poses, a quicker loaded downstroke, a swept/folded and twisted recovery, delayed wingtips and membrane fingers, slight left/right timing differences, and a blended two-second glide. Chest heave and pitch are countered by the neck/head, while the limbs and tail follow with delay. These motions are baked into the asset, rather than changing individual bones in the runtime render loop.

The FBX's broken absolute texture paths are repaired. PBR materials retain the original maps with matte skin and glossier eyes. A single orientation transform makes the model face runtime +Z. The existing path handles heading, bank and pitch; a cloned mixer owns animation and disposal through React StrictMode replay.

The runtime asset is **1,154,208 bytes** (about 1.15 MB), compared with the previous dragon's approximately 2.58 MB. Textures are capped at 2K and compressed to WebP; Meshopt compresses geometry and animation without simplifying the authored mesh. This is a transfer-size reduction, not a claim of universally higher frame rates.

## Reproduction

Extract the original ZIP outside the repository. Blender 4.5.3 LTS was used:

```sh
blender -b --factory-startup --python scripts/build-toothless.py -- /path/to/extracted-source /tmp/toothless-flight.glb
npx gltf-transform optimize /tmp/toothless-flight.glb public/lobby/world/toothless-flight.glb --compress meshopt --simplify false --flatten false --join false --palette false --texture-compress webp --texture-size 2048
node scripts/check-toothless-asset.mjs
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chrome WORLD_REVIEW_URL=http://localhost:3000 node scripts/check-dragon-flight.mjs
```

## Validation

- Shipped GLB: loop endpoints match, time starts at zero, the named wing/tail/root joints actually animate, original skin and body/eye/normal textures remain, texture and transfer budgets pass.
- Native Chromium: 40 changing poses across the complete flap/glide cycle after StrictMode setup/cleanup/setup; no runtime errors. Close views checked at extended, lowered and raised wing positions.
- Targeted ESLint, 30 unit tests and production build passed.

[Recorded close flight review](../implementation/toothless/flight.webm) · [Main desk view](../implementation/toothless/desk.png) · [Native animation probe](../implementation/toothless/flight-check.json)
