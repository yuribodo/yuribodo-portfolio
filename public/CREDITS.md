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

- Near arch, ruined walls and rubble: **FreeStylized**, [Ruins Modular Kit 01](https://freestylized.com/asset_pack/ruins_01/).
- Trees, bushes and ground plants; bark and earth textures: **FreeStylized**, [Starter Nature Pack / Foliage Kit 01](https://freestylized.com/asset_pack/foliage_kit_01/).
- The FreeStylized assets use the author's [custom royalty-free terms](https://freestylized.com/disclaimer/), permitting commercial and non-commercial project use. They are **not CC0**. Selected meshes/materials were adapted and optimized for this scene; the original downloadable packs are not redistributed here.
- Midground cliffs: **Rob Tuytel**, [Coastal Cliff 02](https://polyhaven.com/a/coastal_cliff_02), [CC0](https://polyhaven.com/license). Decimated, compressed and recolored in the scene shader while retaining source UVs and surface maps.
- Terrace paving material: **Amal Kumar**, [Monastery Stone Floor](https://polyhaven.com/a/monastery_stone_floor), [CC0](https://polyhaven.com/license). Diffuse, OpenGL normal, roughness and AO maps resized/compressed; relief and material intensity adjusted for the scene.
- Legacy blockout rock/grass meshes: **Kenney**, [Nature Kit](https://kenney.nl/assets/nature-kit), CC0. Retained in source/generator; the old terrace GLB is no longer used by the runtime.
- Chess sculptures: **Riley Queen**, [Chess Set](https://polyhaven.com/a/chess_set), [CC0](https://polyhaven.com/license). Selected knight and pawn retain sculpted geometry, UVs and marble maps; resized and tinted for the monumental island. The geological island reuses the credited Coastal Cliff 02 and FreeStylized trees.
- Floating citadel, monument court, academy and slime: locally authored geometry referencing Sword Art Online, No Game No Life, Mushoku Tensei and That Time I Got Reincarnated as a Slime. These are not official franchise assets.
- Sky, front/rear valley, limestone paint, cloud and earlier foliage sprite: generated artwork for this portfolio. Original PNGs, prompts and asset processing are documented in `assets/lobby-world/README.md`. The earlier foliage sprite is retained as a study, not used for the new 3D vegetation.

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
