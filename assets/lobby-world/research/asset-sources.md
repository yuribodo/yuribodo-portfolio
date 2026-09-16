# Environment art research and asset intake — 2026-09-07

The user rejected the procedural blockout as insufficiently polished. The quality target remains detailed anime environment art, not a low-poly scene or a rendered painting behind the desk. Earlier cosmetic changes are intermediate work, not an accepted finished scene.

## Production references (first-person artist accounts)

- [Antonin Pardon — Hidden Pathway breakdown](https://80.lv/articles/breakdown-how-to-create-a-peaceful-fantasy-nature-environment): individual arch stones are shaped and sculpted against the reference, then decimated/UV-unwrapped. Baked maps, material variation, coverage and ground blending connect assets. Foliage uses painted opacity cards and adjusted normals. **Application:** replace primitive architecture with authored assets; ground props in terrain; evaluate the near scene before expanding.
- [Airborn Studios — production breakdown](https://80.lv/articles/airborn-3d-production-of-a-stylized-ue5-animation): establish representative assets/workflows, painterly PBR surfaces, test materials in the final engine. **Application:** one finished area is the visual benchmark; more geometry alone is not polish.
- [Victor Castaño González — Dorado breakdown](https://slime_contactme.artstation.com/projects/6LWqaN): modular kits, trims, baking, foliage and scene assembly. **Application:** reusable well-authored pieces with purposeful variations, not a grid of identical blocks.
- [Guerrilla Games / GDC — procedural placement in Horizon](https://gdcvault.com/play/1024120/GPU-Based-Run-Time-Procedural): artist-directed placement rules assemble environment layers. **Application:** vegetation density follows soil, slope and shelter; procedural placement does not replace asset quality.

## Downloaded for evaluation

| Asset | Source / license | Intended use |
| --- | --- | --- |
| FreeStylized Ruins Modular Kit 01 | [Product](https://freestylized.com/asset_pack/ruins_01/), [free author download](https://www.patreon.com/FreeStylized/posts/free-ruins-01-119705391), [terms](https://freestylized.com/disclaimer/) | Nine selected authored gothic arch, broken-wall and stone meshes; unused pack meshes excluded. Product explicitly permits commercial and non-commercial use. Custom royalty-free terms, **not CC0**; do not redistribute the original pack. Deliver adapted scene assets with attribution. |
| FreeStylized Starter Nature Pack | [Product](https://freestylized.com/asset_pack/foliage_kit_01/), [author download](https://www.patreon.com/FreeStylized/posts/free-starter-kit-119706348), same terms above | Cohesive tree, bush and ground-cover evaluation. |
| Coastal Cliff 02 — Rob Tuytel | [Model](https://polyhaven.com/a/coastal_cliff_02), [CC0 license](https://polyhaven.com/license) | Scanned rock silhouette as a terrain ingredient; requires simplification and art adaptation, not raw photorealistic import. |
| Rock Moss Set 01 — Kless Gyzen | [Model](https://polyhaven.com/a/rock_moss_set_01), [CC0 license](https://polyhaven.com/license) | Evaluate natural erosion and moss breakup for foreground rocks. |

Original archives are working inputs outside the runtime folder. No purchase or account was required. FreeStylized public product pages expressly grant project use; their general terms restrict standalone redistribution, so original FBX/Blend packs are not included in the repository.

The current floor also uses [Monastery Stone Floor](https://polyhaven.com/a/monastery_stone_floor), **Amal Kumar / Poly Haven, CC0**. The user explicitly requested less cartoon-like paving: avoid oversized rounded slabs, broad dark joints and exaggerated relief. Use real-scale masonry with restrained color and roughness.

## Candidates not imported

- [Stylized Ancient Archway — Vladyslav Yakovenko](https://sketchfab.com/3d-models/stylized-ancient-archway-c0ce836f20054484850866c7385b750c): CC Attribution verified, but author download requires the Sketchfab flow. Do not extract viewer data.
- [3TD Fantasy Ruins — Ron Kapaun](https://opengameart.org/content/3td-fantasy-ruins-pack): CC0 available, but older art direction is less suitable than the selected stylized kit.

## Object-level priorities

1. Near terrace: authored stone edges, broken walls/arch, proper normal and AO maps, believable stairs/path, soil/grass transition, varied plant scale, shade from canopy. Desk/monitor remain the entry focus.
2. Near landscape: continuous 3D terrain and cliff faces beyond the paving; no abrupt rectangle suspended against a painting. Camera turns must reveal geometry and occlusion.
3. Vegetation: authored canopy/branch silhouettes, shared light direction, appropriate leaf normals, grouped groundcover, restrained wind. No ball trees as final assets.
4. Midground: cliffs, inhabited academy approach and river/waterfall layers with real depth; distance hides small detail, not crude silhouette.
5. Hero landmarks: Aincrad and chess remain provisional until individually authored/replaced to the same standard. Do not label their current procedural meshes final.
6. Far horizon: a sky/distant matte may remain an optimization, but must not substitute for the inhabitable world around the visitor.

Evaluate beauty in the actual browser at the desk, both side angles and looking back. Passing a build is not visual acceptance. Do not call the scene AAA merely because the workflow uses industry tools or higher-resolution assets.


## Landmark replacement — 2026-09-08 PR review

- [Chess Set — Riley Queen](https://polyhaven.com/a/chess_set), [CC0](https://polyhaven.com/license): imported the white knight and pawn only, preserving sculpted geometry, UVs and marble maps. Runtime tint/scale make them monumental. Source glTF and dependencies are available from [the official asset API](https://api.polyhaven.com/files/chess_set).
- `scripts/build-sky-citadel.mjs` replaces the repeated cone with original six-district architecture: open arcades, gallery recesses, cornices, undercroft ribs, tapered bridges and a crown palace. Seven material groups retain PBR shading rather than being overwritten by the old toon material.
- `scripts/build-landmark-island.py` assembles the credited coastal cliff geometry, tree assets, sculpture plinths and a chess court. It exports the monuments and a reusable geological island. Runtime waterfalls add movement. The old satellite island meshes are no longer used.

These replacements are reviewable implementation work, not a claim that the user's final art-quality target is met. The academy remains the older blockout. Terrain blending, monument framing and main-view performance still need art/performance iteration.
