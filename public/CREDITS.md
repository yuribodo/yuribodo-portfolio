# Credits & Third-Party Asset Attribution

The interactive lobby scene uses third-party 3D models sourced from Sketchfab.
Most are licensed under **Creative Commons Attribution (CC BY 4.0)**, which
requires crediting the original author. Full attributions below. Each model was
compressed/optimized (geometry + textures) for web delivery.

License links:
- CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
- CC BY-NC-SA 4.0 — https://creativecommons.org/licenses/by-nc-sa/4.0/
- Sketchfab Standard License — https://sketchfab.com/licenses

## 3D Models

| Model | Title | Author | License | Source |
|---|---|---|---|---|
| Beyblade | "Storm Pegasus" | RECZ P3D (@recz.contacto) | CC BY 4.0 | https://sketchfab.com/3d-models/70e9b69eef4e4d529d69acce7073c2d8 |
| Monitor | "PC Monitor 27 inch" | Annelida (@Annelida) | CC BY 4.0 | https://sketchfab.com/3d-models/06fb18eec19245d4811c4c3c8c7ea567 |
| MacBook | "MacBook Pro Closed" | NoXiou5 (@NoXiou5) | Sketchfab Free Standard | https://sketchfab.com/3d-models/d04673abef734de880de4f9842126b0d |
| Keyboard | "RAZER BlackWidow Chroma" | Mieshu (@miha.pop12) | CC BY 4.0 | https://sketchfab.com/3d-models/c4c42707816b40f2b5f5fe1bae89dfb5 |
| Mouse | "Mouse - Razer DeathAdder" | gimora (@gimora) | **CC BY-NC-SA 4.0** ⚠️ | https://sketchfab.com/3d-models/783913c7b9df441ab99ec666eee4e052 |
| Nintendo DS | "Nintendo DS" | *author unconfirmed* — see note | CC BY 4.0 | Sketchfab (multiple identical titles exist) |
| Figure — Minato | "FreeFire New 3D Character Minato Namikaze" | 3D জগৎ (@3DJagat) | CC BY 4.0 | https://sketchfab.com/3d-models/d7a786ae01074e6798633a8d62b3c66c |
| Figure — Seismitoad | "Seismitoad" | nguyenlouis32 (@nguyenlouis32) | CC BY 4.0 | https://sketchfab.com/3d-models/12a0d0539b984262842b10e093057cbe |
| Figure — Drago | "Bakugan Battle Brawlers - Dragonoid" | Elpaput (@Elpaput) | CC BY 4.0 | https://sketchfab.com/3d-models/9abb64bb6b7d490787a8e7cb92f7fbe4 |
| Desk | "Wooden Desk" | seanb | CC BY 4.0 | Sketchfab |
| Xbox Controller | "Xbox One S Controller" | BatonyRobson | CC BY 4.0 | Sketchfab |

## Skybound environment

- Earlier arch, ruined walls and rubble (retained study, no longer rendered): **FreeStylized**, [Ruins Modular Kit 01](https://freestylized.com/asset_pack/ruins_01/).
- Trees, bushes, ground plants and derived valley woodland; bark and earth textures: **FreeStylized**, [Starter Nature Pack / Foliage Kit 01](https://freestylized.com/asset_pack/foliage_kit_01/).
- The FreeStylized assets use the author's [custom royalty-free terms](https://freestylized.com/disclaimer/), permitting commercial and non-commercial project use. They are **not CC0**. Selected meshes/materials were adapted and optimized for this scene; the original downloadable packs are not redistributed here.
- Midground cliffs: **Rob Tuytel**, [Coastal Cliff 02](https://polyhaven.com/a/coastal_cliff_02), [CC0](https://polyhaven.com/license). Decimated, compressed and recolored in the scene shader while retaining source UVs and surface maps.
- Earlier terrace paving material (retained study, no longer rendered): **Amal Kumar**, [Monastery Stone Floor](https://polyhaven.com/a/monastery_stone_floor), [CC0](https://polyhaven.com/license). Diffuse, OpenGL normal, roughness and AO maps resized/compressed; relief and material intensity adjusted for the scene.
- Legacy blockout rock/grass meshes: **Kenney**, [Nature Kit](https://kenney.nl/assets/nature-kit), CC0. Retained in source/generator; the old terrace GLB is no longer used by the runtime.
- Chess sculptures: **Riley Queen**, [Chess Set](https://polyhaven.com/a/chess_set), [CC0](https://polyhaven.com/license). Selected knight and pawn retain sculpted geometry, UVs and marble maps; resized and tinted for the monumental island. The earlier geological shell used the credited Coastal Cliff 02 and FreeStylized trees; the current runtime shell is original procedural geometry with the credited Rock Face 03 texture and Quaternius vegetation.
- Current cut-stone terrace, arch, climbing vines, continuous valley terrain, river, roads, bridges, village buildings, floating citadel, monument court, academy sanctuary and slime: locally authored geometry referencing Sword Art Online, No Game No Life, Mushoku Tensei and That Time I Got Reincarnated as a Slime. These are not official franchise assets.
- Sky-only panorama, earlier front/rear valley studies, limestone paint, cloud and garden foliage sprite: generated artwork for this portfolio. Original PNGs, prompts and asset processing are documented in `assets/lobby-world/README.md`. The foliage sprite is used on intersecting, alpha-tested garden cards; trees and bushes use the credited 3D nature kit.

## Attribution & license notes

- **Mouse (CC BY-NC-SA 4.0):** the only asset NOT under plain CC-BY. Its terms
  are stricter: **NonCommercial** (no commercial use) and **ShareAlike**
  (derivatives must carry the same license). A personal, non-monetized
  portfolio is a defensible non-commercial use, but if this site ever becomes
  commercial (paid work funnel, ads, client acquisition framed as commercial),
  this model should be replaced with a CC-BY / royalty-free equivalent.
- **Nintendo DS:** multiple Sketchfab models share the exact title "Nintendo
  DS" (e.g. by `laur04`, `solal.sblt`), all CC BY 4.0. The original download
  source for the lobby's DS was not recorded, so the specific author is
  unconfirmed. Verify against the original download and fill in the exact
  author + URL, or re-source from a known CC-BY model.
- **Desk / Xbox:** authors are credited in source comments (`components/lobby/desk.tsx`,
  `components/lobby/objects/xbox-controller.tsx`); exact Sketchfab URLs to be
  backfilled.

### Valley village — Quaternius

- Source: [Medieval Village Pack](https://quaternius.com/packs/medievalvillage.html), Quaternius, December 2020.
- License: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), confirmed on the author's pack page.
- Selected models obtained from the author's [Poly Pizza collection](https://poly.pizza/bundle/Medieval-Village-Pack-NsHhjhlrfY): Fantasy House (`he3p42mUTH`, `BH2XHWUNmF`, `dcPho4SUA3`), Fantasy Inn (`x3ZcGn3jr4`), Mill (`89dsFYAoX1`), Bell Tower (`ux44tbeQvj`), Market Stand (`hts7l0NZxW`), Well (`QlqncKYxXb`).
- Runtime: `public/lobby/world/valley-village.glb`. Adaptations: normalized scale/pivots, matte limestone/timber/slate palette, painted vertex shading, merged surfaces and Draco compression. Reproduction: `scripts/build-valley-village.mjs`.
- The procedural atmosphere uses original cloud-density/shading code. Its raymarching approach references the MIT-licensed [Three.js WebGL volume cloud example](https://threejs.org/examples/webgl_volume_cloud.html). No panorama or cloud photograph is used by the current runtime sky.

### Natural terrain and vegetation

- Ground diffuse/OpenGL normal maps: [Forest Ground 04](https://polyhaven.com/a/forest_ground_04), Rob Tuytel (photography/processing), Rico Cilliers (minor adjustment), CC0. Converted to 1K WebP (`soil-color.webp`, `soil-normal.webp`); the scene remaps the palette and blends worn soil, exposed slopes and damp banks.
- Meadow diffuse/OpenGL normal maps: [Leafy Grass](https://polyhaven.com/a/leafy_grass), Charlotte Baglioni, CC0. Converted to 1K WebP (`meadow-color.webp`, `meadow-normal.webp`), blended with the soil using terrain slope, path distance and spatial variation.
- Trees, ferns, grasses, shrubs and stones: [Stylized Nature MegaKit](https://quaternius.com/packs/stylizednaturemegakit.html), Quaternius, CC0. Individual source URLs are recorded in `assets/lobby-world/nature-sources.json`. Selected models are normalized, simplified, compressed and repaletted as `natural-vegetation.glb`; wind is applied in the runtime shader. These replace the earlier nature scatter in the active scene.
- Exposed terrain rock: [Rock Face 03](https://polyhaven.com/a/rock_face_03), Dario Barresi (photography), Rico Cilliers (processing), CC0. 1K WebP colour map, palette adjusted in the shader and projected along three axes to avoid stretching on steep slopes.

- Flower colonies: **Quaternius**, [Stylized Nature MegaKit](https://quaternius.com/packs/stylizednaturemegakit.html), CC0. [Flower Group](https://poly.pizza/m/hfPzQAedOe) and [Bush with Flowers](https://poly.pizza/m/U1ymDy8tbY), normalized, simplified and compressed into `meadow-flowers.glb` (172.59 KB). Exact downloads are recorded in `assets/lobby-world/meadow-sources.json`; rebuild with `scripts/build-meadow-flowers.mjs`. Small meadow daisies and curved grass blades are locally authored geometry.

### Working windmills

`living-mill.glb` reuses the [Mill by Quaternius](https://poly.pizza/m/89dsFYAoX1), **CC0**, already credited in the Medieval Village collection above. The adaptation preserves the original blade geometry as a separate rotor, retains the existing village scale and palette, and compresses the result with Draco. Source GLB: `https://static.poly.pizza/a347d313-8be5-4585-9fc4-2f7e745c0648.glb`. Rebuild with `scripts/build-living-mill.mjs`. The bird and butterfly meshes and chimney shader are authored procedurally in this project; they do not use third-party textures.

### Main desk vista adaptation

The CC BY 4.0 Wooden Desk by seanb is rotated and resized at runtime. The experimental lowered hutch was reverted at the user’s request; the original furniture geometry and collectible positions are restored. The floating citadel districts reuse the credited Quaternius village models, and their gardens reuse the credited vegetation. Eroded island shells, terraced tributaries and cultivation patterns are original procedural work.

### Expanded vista surface detail

Rock Face 03 now also supplies 2K diffuse and OpenGL normal maps, converted to WebP without resizing. Exact CC0 sources and output settings: `assets/lobby-world/rock-detail-sources.json`; reproduction: `scripts/build-rock-detail.mjs`. The terrain blends these maps across three projections and offsets their samples to reduce repetition.

## Living valley — textured wildlife and organic vegetation

- **Deer Female** and **Old Deer Male**, by **CDmir (Čestmír Dammer)** with **TinyWorlds**, [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Sources: [female](https://opengameart.org/content/deer-female), [male](https://opengameart.org/content/old-deer-male). Converted the Blender source materials to glTF PBR, retained authored fur/antler textures and ambient skeletal animations, and smoothed the silhouette. Male body UV boundaries were adjusted to avoid blue atlas padding without modifying the original texture pixels. Local files: `wildlife-deer.glb`, `wildlife-stag.glb`.
- **Dragon Rigged**, by **na3ee1**, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). [Original model](https://poly.pizza/m/WIOTISRjeX). Adaptations: smooth subdivision in Blender, consolidated vertex-color palette, original skeletal flap/glide animation and scene flight paths. Local file: `wildlife-dragon.glb`. This asset is not an official character from an anime or game.
- **Tree Small 02, Pine Tree 01, Fern 02, Shrub 02, Rock Moss Set 01**, from **Poly Haven**, [CC0](https://polyhaven.com/license). [Tree](https://polyhaven.com/a/tree_small_02), [pine](https://polyhaven.com/a/pine_tree_01), [fern](https://polyhaven.com/a/fern_02), [shrub](https://polyhaven.com/a/shrub_02), [mossy rocks](https://polyhaven.com/a/rock_moss_set_01). Authored Blender tree LODs and PBR materials retained near the viewer; eight-view canopy atlases rendered for distant individual trees. Other meshes compressed, with original diffuse, roughness and normal maps. Files: `organic-*.glb`, `canopy-*.webp`.

Detailed source URLs and conversions: `assets/lobby-world/wildlife-sources.json` and `assets/lobby-world/organic-sources.json` in the project repository.


## Fantasy inhabitants and denser valley revision

The earlier CC0 deer remain archived as source assets but are no longer requested or rendered by the world. Slimes, leaf spirits, mushroom caps/gills, buttress roots and waterfall spray are original project geometry and shaders. The blue-slime art direction references the anime *That Time I Got Reincarnated as a Slime*; no promotional still or extracted character mesh is shipped.

The **na3ee1 Dragon Rigged**, CC BY 3.0 and linked above, retains its licensed mesh and skin. Its previous animation clip is bypassed: runtime controls now articulate shoulder/elbow strokes, glide intervals, jaw closure and delayed tail motion, with heading and banking derived from its flight path.

The ancient trees reuse **Poly Haven Tree Small 02**, CC0, with broader crowns, adjusted leaf pigment, large-scale placement and locally authored buttress roots. The four hamlets reuse the credited Quaternius village models, with terrain-aware foundations. No new third-party models were added in this revision.

### Dragon flying

“Dragon flying” by [NORBERTO-3D](https://sketchfab.com/norberto3d), [original model](https://sketchfab.com/3d-models/dragon-flying-78f809b98bbe426e94d4024dc894b206), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Retrieved from the attributed [Gamehook distribution](https://github.com/RobertTownley/gamehook/tree/0393225db7/public/resources/dragon). Converted to Draco/WebP GLB; material lighting, scale, flight path and playback speed adjusted. Original skeletal and morph animation and rider preserved.

### Toothless / Banguela — current flying dragon

**“Toothless (Rigged) - HTTYD”** by **[Stuck On Saturn](https://sketchfab.com/stuckonsaturn)**.

- [Original model on Sketchfab](https://sketchfab.com/3d-models/toothless-rigged-httyd-91d8197bf907439daa1bd78ad6a775cc).
- Model license: **[Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)**.
- Original FBX and textures supplied through the author's Sketchfab download. The artist's mesh, skin weights, UVs and painted textures are retained.
- Portfolio adaptations: newly authored and baked skeletal flight animation (wing flex, body motion, tucked legs and trailing tail), material conversion to glTF PBR, coordinate/scale normalization, texture resizing to at most 2K, WebP and Meshopt compression, and scene lighting/flight path. Runtime file: `lobby/world/toothless-flight.glb`.
- Toothless is a character from *How to Train Your Dragon*. This is an unofficial fan model; the character and franchise belong to their respective rights holders. No affiliation or endorsement is implied.

The earlier NORBERTO-3D dragon remains credited above as an archived asset and is no longer loaded by the current scene.

## Five franchise references — September 2026

These are unofficial fan references in a personal portfolio; the franchise owners
are not affiliated with or endorsing this site. Source archives were supplied by
the site owner. Listing licenses and original archive hashes are recorded in
`assets/lobby-world/character-sources.json`; uploader attribution does not imply
ownership of the underlying franchise or game assets.

| Reference | Source / uploader | License listed with the download | Adaptations |
| --- | --- | --- | --- |
| Going Merry — One Piece | [Anex](https://sketchfab.com/3d-models/one-piece-going-merry-0e1f16189e8b4b4d9d9c3c60893d692b) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Original OBJ and painted atlas retained; restored material, merged geometry, WebP/Meshopt compression, scale/waterline and gentle mooring motion. |
| Snorlax — Pokémon | [VerdeAWX](https://sketchfab.com/3d-models/snorlax-sleep-2091c36f65084da582e22bd63c72aa67) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Removed the source diorama's tree/ground; retained character texture and sleeping pose, reduced geometry, added a subtle chest-breath morph, compressed textures/mesh. |
| Lancelot Albion — Code Geass | [Leonardo Hayasida](https://sketchfab.com/3d-models/gd53-leonardo-hayasida-mod2-dbbe317f6c61481fb33ffc66d9b52c55) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Removed OBJ reference-image planes; restored base color, normal, roughness, metallic and emission maps; consolidated and compressed geometry/textures. The supplied OBJ has no skeleton or animation. |
| Ainz Ooal Gown — Overlord | [affifuddin.y.hidayat](https://sketchfab.com/3d-models/ainz-ooal-gown-e62df306954144fbb613c6fc3b04e682) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Converted legacy Blender shaders to PBR, retained character/staff geometry and robe maps; reused the source magic-circle artwork, removed billboard aura, compressed the asset. |
| Fishstick — Fortnite | [saturn88z](https://sketchfab.com/3d-models/fishstick-afc52bc2e68247bf8500cbe301f81528) | [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) — noncommercial | Restored original color maps; repaired disconnected neck/headgear hierarchy; adapted the selected dance to target bone axes/proportions and compressed the skin/textures. |
| Orange Justice — Fortnite motion | [Coldary](https://sketchfab.com/3d-models/orange-justice-31b3596641af4e238c1491c450cc6df5) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) as listed | Motion adapted from the supplied Blender animation; source NeonCat geometry/textures are not included. Preserved dance timing, target limb lengths and loop endpoints. |

Fortnite character and motion content originates from **Epic Games**. Original
Fishstick character work is credited to **Karina Bastos / Airborn Studios** on
[the studio's project page](https://airbornstudios.artstation.com/projects/L2JNqw).
The Sketchfab uploads are acquisition sources, not claims of original character authorship.

The royal overlook, throne, stairs, columns, gold inlays and balustrades are
original project geometry. Its stone texture reuses **Rock Face 03**, by
**Dario Barresi / Rico Cilliers**, [Poly Haven, CC0](https://polyhaven.com/a/rock_face_03),
already credited above. Rebuild with `scripts/build-royal-court.py`.
