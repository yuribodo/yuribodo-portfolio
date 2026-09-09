# Skybound environment assets

Created for this repository on 2026-09-07. Runtime files live in `public/lobby/world/`.

## Current authored environment pipeline

The user rejected the initial primitive blockout and, specifically, its oversized cartoon paving. The near environment now uses authored ruins/nature assets and restrained PBR paving. [Research, licenses and object-level quality targets](research/asset-sources.md) distinguish the art references from assets actually imported. The citadel and chess landmarks now have replacement geometry; visual acceptance remains open. The academy remains provisional.

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
