# Skybound environment assets

Created for this repository on 2026-09-07. Runtime files live in `public/lobby/world/`.

## Current authored environment pipeline

The user rejected the initial primitive blockout and, specifically, its oversized cartoon paving. The current terrace uses original cut-stone masonry with generated limestone pigment, climbing vines and authored nature assets; the previous PBR paving was rejected in the September 12 review. [Research, licenses and object-level quality targets](research/asset-sources.md) distinguish the art references from assets actually imported. The citadel and chess landmarks now have replacement geometry; visual acceptance remains open. A more detailed academy sanctuary replaces the original academy blockout; art acceptance remains open.

- Ruins / trees / plants: FreeStylized kits, custom royalty-free project-use license (not CC0).
- Eroded cliff: Poly Haven / Rob Tuytel, CC0; simplified geometry, retained UVs/normal/AO, adapted color shader.
- Floor: Poly Haven / Amal Kumar, Monastery Stone Floor, CC0. 1.8 m source scale; smaller joints and restrained normal intensity replace the inflated block floor.
- `scripts/prepare-world-assets.py` imports original FBX/Blend/glTF inputs in Blender, retains baked material maps, normalizes pivots and exports selected meshes. Intermediate exports are ignored by Git.
- `scripts/optimize-world-assets.mjs` preserves named nodes while compressing geometry with meshopt and textures with WebP. Runtime bakes node decode transforms into private Float32 geometries before instancing; alpha-cut foliage must write depth.

Original author packs stay outside the repository. Obtain them from the author links in the research document and extract to this intake layout:

```text
SOURCE/
  ruins/Ruins1_(AssetPack4)/Blender/Ruins1_AP4.blend
  ruins/Ruins1_(AssetPack4)/FBX_Textures/Textures/...
  nature/StarterNaturePack_(FoliageKit1)/FBX_Textures/...
  coastal_cliff_02/coastal_cliff_02.gltf  (with its referenced files)
  floor-Diffuse.jpg  floor-nor_gl.jpg  floor-Rough.jpg  floor-AO.jpg
```

The four floor inputs are the 2K JPG maps from [the official asset API](https://api.polyhaven.com/files/monastery_stone_floor).

```sh
blender --background --factory-startup --python scripts/prepare-world-assets.py -- --source-dir /path/to/SOURCE
node scripts/optimize-world-assets.mjs /path/to/SOURCE
```

The existing `pnpm assets:world` command rebuilds **provisional** citadel/chess/academy/islands and the unused legacy terrace from local Three.js geometry. It does not rebuild the authored kit. Its original Kenney Nature Kit CC0 inputs/license remain in `source/` for reproducibility. No unverified franchise model was downloaded or extracted from a model viewer.

## Painted images

Generated with the built-in image generation tool from written art direction; the approved concept `docs/design/isekai-world/concepts/05-skybound-at-the-desk.png` was used as the style/composition reference for the panorama and forward landscape. PNG originals are retained here. Runtime copies are WebP: panorama 1774×887, front landscape 1672×941, limestone 512×512, cloud 1024×341 with alpha. Sharp was used only for resizing/format conversion.

The wide panorama supplies the full surrounding sky; the more detailed rectilinear painting supplies the front vista. The requested seamless projection is an art target, not proof of mathematically seamless generated pixels. Feathering blends the front painting into the sphere. Nearby landmarks are actual GLB geometry.

Additional rear landscape and unused foliage study prompts are preserved in [polish-image-prompts.md](polish-image-prompts.md). The rear matte is also a runtime WebP.

## Exact generation prompts

### skybound-panorama-source.png

Use case: stylized-concept. Production environment texture for a real-time 3D anime world. Generate a seamless 360-degree EQUIRECTANGULAR PANORAMA, exact 2:1 aspect ratio, as high resolution as possible ideally 4096x2048. The attached approved concept is STYLE AND COLOR REFERENCE ONLY. This image is just the distant sky and landscape layer that will wrap around the camera; all nearby terrace, characters, main fortress and chess pieces will be rendered as separate real 3D objects. IMPORTANT: DO NOT include any desk, monitor, computer, stone arch, foreground terrace, people, slime, floating castle, giant chess pieces, inset frame, labels, typography, UI, borders or watermark.

Projection: full spherical longitude 360 degrees left-to-right, latitude +90 at top to -90 at bottom. Perfectly level distant horizon at 50% of image height. Entire upper half is vast vibrant cerulean blue sky with beautifully hand-painted Japanese anime cumulus clouds, clouds more concentrated in bands 30–48% image height leaving open blue space around uppermost zenith. Matching sky at left and right edges, absolutely seamless wrap. Bottom half: a breathtaking distant green alpine valley with layered broad cliffs, cascading little waterfalls, blue winding rivers, a small intricate red-roof fantasy town, wooded ridgelines and farmland. All landscape is FAR away, viewed from an elevated terrace. Distant blue/green hills sit on horizon, foreground-lowest section is simplified lush forest and valley greens, no objects near camera. Town and river lie toward center longitudes, quieter wooded mountains around opposite directions. The image must have coherent continuous geography spanning all longitudes, no repeated duplicated buildings. Top and bottom poles smoothly continuous in color so no starburst seams when mapped on a sphere.

Art direction: hand-painted Japanese anime scenic background, fine colored edges, simplified brush-painted foliage shapes, broad organized shadow masses, warm ivory cumulus highlights, fresh grass green and turquoise river, lavender-blue atmospheric perspective, golden midday light. Exquisite composed detail around the middle band, not photographic. No photorealistic stone texture, film grain, realistic grass blades, depth of field or lens flare. Keep lighting direction consistent with sun high on the right side of the front-facing valley. Terrain should show far-away depth and gentle vivid colors. This panorama is the beautiful connective scenery behind modeled landmarks, not a poster.

### limestone-source.png

Use case: stylized-concept. Make a production SEAMLESS TILEABLE texture of weathered pale limestone for a Japanese anime fantasy terrace. Square image, flat orthographic material color texture only. No perspective, no scene, no objects, no text, no tile grid or visible grout. An entire continuous single stone surface with light warm gray-ivory base, hand painted broad soft ochre and sage mineral patches, a few delicate cracks, subtle painterly directional shading and chalky edges. It should look hand-painted for anime background art, not photographed, not gritty realistic PBR, and not a noisy grunge texture. Low to medium contrast so it can repeat across several distinct 3D stone slabs without visual noise. All four edges must tile seamlessly. No cast shadows or baked directional illumination.

### cloud-source.png

Use case: stylized-concept. Production transparent-background sprite: one very wide Japanese anime cumulus CLOUD BANK, long irregular scalloped silhouette, warm white sunlit upper lobes, pale icy blue/lavender lower shadow shapes, soft tapered dissolving wisps at both ends, broad painted values and delicate hand-drawn edges. Isolated on a genuinely transparent background. Landscape ratio 3:1. Entire cloud bank fits with empty transparent margins, no cropped edges. Hand-painted anime scenic art, not photographic or volumetric game render. No text, no landscape, no sun, no other objects, no frame, no checkerboard baked in. Cloud will float in front of a distant fantasy castle to communicate scale.

### front-landscape-source.png

Use case: stylized-concept. Production scenic background painting for an anime 3D website. Wide 16:9 canvas, high resolution. Reference image is the approved art direction: preserve its beautifully drawn anime sky, valleys and warm green/blue palette. Create ONLY the distant natural landscape behind its 3D objects, no foreground objects.

Compose a panoramic elevated view of an immense fantasy green valley: the UPPER 45 PERCENT of the frame is clear brilliant cerulean blue sky with generous open blue negative space and big beautifully shaped Japanese anime cumulus clouds concentrated toward both sides, leaving open space at upper-left for a separate 3D floating castle that will be added later. Distant blue mountains define a fairly level HORIZON at 45 PERCENT of total image height. Lower 55 percent: verdant plateau cliffs, tiered forests, long blue river winding toward a distant small orderly fantasy town with red rooftops, patchwork meadows, thin waterfalls falling down pale chalk cliffs, soft atmospheric perspective. Terrain has depth at many scales, exquisite hand-painted Japanese anime background craft, crisp silhouettes, selective delicate drawn lines, broad organized shadows, sunlight from upper right. This should be as polished as a scenic establishing frame from an anime episode. The viewer is high above the valley; no terrace visible. At both left and right frame edges, scenery should become quieter hazy forest and mountains, easing into the far background.

ABSOLUTELY NO castle floating in the sky, no floating islands, no chess pieces, no stone arch, no foreground terrace or floor, no monitor, desk, chair, keyboard, technology, characters, slime, bodies, hands, text, labels, inset, frame, logo, sun orb or UI. These will be separate real-time 3D objects. NOT equirectangular projection: this is a normal rectilinear landscape painting for the forward scenic matte. NOT photorealistic: clearly anime painterly style with fine colored contours and crisp designed cloud shapes, no photo-texture, film grain, depth of field or lens flare.




## Replacement landmark pipeline

`node scripts/build-sky-citadel.mjs` rebuilds the original radial architecture into `sky-citadel-v2.glb`. The previous generator is retained for the legacy blockout and academy.

For the geological island and chess monuments, obtain the credited Chess Set glTF (2K) and its referenced files from the Poly Haven API, placing them in `SOURCE/chess_set/chess_set.gltf`. Run the near-environment intake first so `assets/lobby-world/production/{coastal-cliff,nature-kit}.glb` exist, then:

```sh
blender --background --factory-startup --python scripts/build-landmark-island.py -- --source-dir /path/to/SOURCE
pnpm exec gltf-transform optimize assets/lobby-world/production/chess-monuments.glb public/lobby/world/chess-monuments.glb --compress meshopt --texture-compress webp --texture-size 1024 --simplify false --palette false --join true
pnpm exec gltf-transform optimize assets/lobby-world/production/geological-island.glb public/lobby/world/geological-island.glb --compress meshopt --texture-compress webp --texture-size 1024 --simplify false --palette false --join true
```

Original third-party packs remain outside Git; only adapted runtime exports ship. `scripts/capture-world.mjs` creates real browser captures, and `scripts/profile-world.mjs` records a short warm-frame diagnostic. Both accept `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

## September 12 material and spatial correction

`TerraceArchitecture` builds bevelled limestone slabs, recessed masonry joints, coping, stairs and a voussoir arch as merged geometry. `paintedStone` applies the same generated limestone pigment in world space to the floor and walls, retaining standard shadows and fog. `TerraceGarden` combines original vine/leaf geometry and alpha-tested cards from the existing generated foliage sprite. No new third-party assets were added.

`node scripts/build-academy-sanctuary.mjs` rebuilds `public/lobby/world/academy-sanctuary.glb` (57,004 triangles before compression) from original geometry. It replaces `academy-island.glb` at runtime. The earlier kit arch, photographic paving and small rectangular satellite islands are no longer rendered. They remain available as historical source assets.

The distant landscape still uses the original painted panorama/mattes. This correction is not a replacement with a fully traversable 3D valley or a claim of AAA art completion.

## Continuous valley follow-up

The user subsequently approved the near environment. The distant landscape cards and land-bearing panorama are now retired from runtime. See [continuous valley](../../docs/design/isekai-world/continuous-valley.md) for geometry, asset reproduction, sky prompt, validation and limitations. The new sky-only panorama and `valley-nature.glb` are the only additional runtime assets. The academy's standalone hill has been removed; all destinations sit on the shared terrain.

## Authored village and procedural atmosphere (September 12 polish)

`valley-village.glb` is a 290,388-byte adaptation of eight CC0 Quaternius Medieval Village models. The exact author/model links and adaptations are listed in `public/CREDITS.md`. Rebuild with `node scripts/build-valley-village.mjs /path/to/source/glbs`; input names are `house-a`, `house-b`, `house-c`, `inn`, `mill`, `tower`, `market`, `well` (all `.glb`). The script retains roof tiles, structural framing, dormers, door surrounds and other authored geometry, merges by building, bakes the palette into vertex colors, and compresses with Draco.

The old generated sky WebP/PNG are retained as design history. The runtime no longer requests them. `components/lobby/world/atmosphere.tsx` creates a 128×96×80 RGBA cloud density/light field (3.75 MiB on the GPU), bounded raymarch volumes at three distance layers, a procedural sky gradient/sun and sky-derived PMREM lighting. It shares one field/material/box geometry between cloud banks; each fragment has a maximum of 32 steps and early opacity termination.

The final atmosphere uses a half-width/half-height floating-point render target for the distant sky, composited behind native-resolution opaque scenery. Two low landmark clouds remain in the main scene for depth occlusion. The target resizes with the viewport/DPR and is disposed with the scene.

## Natural terrain revision

Active ground maps are `soil-{color,normal}.webp` (Poly Haven Forest Ground 04) and `meadow-{color,normal}.webp` (Leafy Grass), 1024px WebP, CC0; see `public/CREDITS.md` for authors and source pages. Colour maps use sRGB, OpenGL normal maps remain linear. The shared near/far ground shader uses matching world-space UVs, offset-sample blending, macro colour variation, irregular worn paths, slope exposure and damp riverbanks. Fine relief is actual geometry in the shared height field, so model placement follows it.

`natural-vegetation.glb` is built with `node scripts/build-natural-vegetation.mjs <download-directory>`. `nature-sources.json` records the Quaternius CC0 source downloads, including unused reference variants. The runtime uses regional instancing and shares meshes for small trail stones. No new vegetation pack is loaded solely for the ground detail pass.

Exposed slopes additionally use `rock-face-color.webp`, Poly Haven Rock Face 03 (CC0), projected along three axes at a larger geological scale. All ground maps total about 2.3 MiB on disk.

## Meadow composition

`meadow-flowers.glb` adds Quaternius CC0 Flower Group and Bush with Flowers, normalized to 0.42m / 0.8m before runtime size variation. Source URLs are in `meadow-sources.json`; run `node scripts/build-meadow-flowers.mjs <directory>` with `flowers.glb` and `flower-bush.glb` to reproduce it. Local curved grass tufts and rounded daisies need no images or model downloads. Shared `lib/lobby/plant-communities.ts` supplies both tree instance placement and the ground's baked canopy occlusion, keeping their positions aligned.

## Sky composition review

The latest procedural sky uses three shared 128×96×80 RGBA fields: two sculpted cumulus variants and one wind-stretched filament field (11.25 MiB total). Forty-eight ray samples and a 75%-per-axis atmosphere target preserve small cloud edges. The blue gradient, asymmetric banks, thin upper clouds and aerial tint are directed against the approved concept. The visual comparison to Genshin Impact and Breath of the Wild is in `docs/design/isekai-world/reviews/open-world-and-sky.md`; reference images from those games are not runtime assets.

### Iluminação e shaders — 12 de setembro de 2026

A passagem de iluminação adiciona cobertura animada de nuvens compartilhada pelos materiais, transmissão aproximada nas folhas e pétalas, sombras próximas mais abrangentes e normais irregulares na água. Não adiciona assets ou dependências. Veja a [comparação visual](../../docs/design/isekai-world/reviews/lighting-comparison.html) e as [notas técnicas](../../docs/design/isekai-world/reviews/lighting-and-shaders.md).

### Movimento e atividade — 12 de setembro de 2026

`living-mill.glb` (50,152 bytes) preserva o rotor do moinho Quaternius separado do corpo, com a mesma escala e paleta da vila. Fonte CC0: https://poly.pizza/m/89dsFYAoX1; reconstrução: `node scripts/build-living-mill.mjs /path/to/source-mill.glb`. Pássaros, borboletas e fumaça são procedurais. O vento usa um relógio compartilhado e inclui deformação das sombras das árvores. Veja [atividade no mundo](../../docs/design/isekai-world/reviews/ambient-life.md).

### Vista principal — 13 de setembro de 2026

A nova composição adapta a prateleira do modelo de mesa em uma geometria privada no runtime; o asset CC BY original permanece intacto e a alteração consta em `public/CREDITS.md`. Cidadela e ilhas reutilizam os modelos CC0 já disponíveis. `sky-islands.tsx` gera a casca erodida; `vista-streams.tsx` e `world-geography.ts` compartilham o perfil dos afluentes com o terreno. Canteiros, campos e distrito ampliado da vila completam a vista frontal.

A atmosfera agora tem quatro volumes próximos e cumulus intermediários adicionais. Mantém três campos volumétricos, 48 passos máximos e resolução distante de 75%; a textura distante é reutilizada entre atualizações quando a câmera está parada, com invalidação imediata por câmera, projeção, resolução e dimmer. Veja [comparação e vídeo](../../docs/design/isekai-world/reviews/main-vista.html) e [notas de validação](../../docs/design/isekai-world/reviews/main-vista.md).

### Correção da mesa e da escala — 13 de setembro de 2026

A alteração da prateleira foi rejeitada e revertida, junto das posições dos colecionáveis e da pose da câmera. `lib/lobby/world-distance.ts` agora expande apenas as coordenadas do cenário frontal. Terreno, rio, pontes e origens dos modelos seguem esse mapeamento; o tamanho de casas e árvores permanece constante. O terreno usa coordenadas separadas para desenho das estradas e detalhe físico da rocha.

`rock-face-detail.webp` e `rock-face-normal.webp` acrescentam difuso/normal OpenGL 2K, derivados de Rock Face 03 (Poly Haven, CC0). Fontes exatas e comando de reprodução: `rock-detail-sources.json`. Veja a [correção atual](../../docs/design/isekai-world/reviews/depth-correction.html).

### Living-world asset quality pass

The wildlife/vegetation experiments were revised after feedback that choosing simple models for convenience was limiting the art direction. The active deer now come from CDmir/TinyWorlds Blender files, with textured fur and authored ambient clips. The dragon is the attributed na3ee1 model, refined in Blender and given a skeletal flight cycle. `wildlife-sources.json` is authoritative; the earlier Quaternius deer/dragon experiments are no longer used.

The active tree/shrub/fern/moss-rock models come from Poly Haven. `organic-sources.json` records both glTF sources and original Blender files. Nearby trees retain the author's actual LOD geometry. Uniform decimation of the foliage was rejected because it destroyed crown coverage. Distant trees instead use eight-view atlases baked from each complete authored canopy, with individual world positions, depth testing, fog and wind. The terrain, water and buildings remain actual geometry.

Rebuild steps:

1. Download sources and their texture dependencies using the recorded manifest URLs.
2. Export each `.blend` deer with `scripts/export-textured-wildlife.py`, then run `node scripts/compress-textured-wildlife.mjs /output-directory`.
3. Build the dragon flight rig with `scripts/build-wildlife.mjs`, refine with `scripts/refine-dragon.py`, then Draco-compress the exported GLB.
4. Process the fern/shrub/rock glTFs with `scripts/build-organic-assets.mjs`. Trees use the separate Blender canopy pipeline below.
5. Use `scripts/bake-tree-canopies.py` on the original Blender tree files, then `scripts/pack-tree-canopies.mjs` to pack the near mesh and eight far views.

The mesa geometry, desk geometry, collectibles and initial camera pose are preserved. The background art is still a work in progress; replacing these assets does not by itself finish the terrain or architecture at AAA quality.


### Fantasy inhabitants revision

The current world no longer requests `wildlife-deer.glb` or `wildlife-stag.glb`. Their sources remain archived. `fantasy-residents.tsx` supplies original instanced slimes and leaf spirits, using the shared clock and grounded squash/stretch. `fantasy-landmarks.tsx` combines original sculpted mushroom groves and buttress roots with the existing Poly Haven tree model at landmark scale. The Quaternius village is reused for four hamlets with slope-aware foundations.

Historical fantasy-life revision: the former dragon used procedural shoulder/elbow articulation. That implementation has been replaced by the authored flight described below; its historical evidence remains in `docs/design/isekai-world/reviews/fantasy-life.md`.

Waterfall ground sampling is refined only in relevant corridors through `lib/lobby/valley-terrain-grid.ts`. Plant placements are cached across species and ground shading, avoiding repeated scatter construction on the main thread. Capture the desk's current movement with `node scripts/capture-fantasy-life.mjs` (optional `WORLD_REVIEW_URL` / `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`).

The active flying creature is now `dragon-flying.glb`: NORBERTO-3D's CC BY 4.0 model with its authored skeletal/morph flight and rider. The former `wildlife-dragon.glb` remains archived. See `wildlife-sources.json` for the original URL, attributed distribution, conversion and checksum. River landings and boat geometry are original procedural work; riparian planting reuses the existing licensed organic assets.
