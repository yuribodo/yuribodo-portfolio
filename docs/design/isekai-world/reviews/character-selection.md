# Five franchise references — 2026-09-14

The owner selected Going Merry, a sleeping Snorlax, Lancelot instead of C.C.,
Ainz Ooal Gown, and Fishstick performing **Orange Justice** instead of Floss.
All six source archives were supplied in Downloads. The downloadable Lancelot
Albion replaces the original preview-only Lancelot candidate.

## Final staging

- **Going Merry:** moored in the main river beside the existing landing, with a
  submerged keel and small independent pitch, roll and heave. Both bridges remain clear.
- **Snorlax:** lies across the actual `roadCenter(-145)` route, blocking the road as
  requested. Its sleeping pose and original texture are retained; a small baked
  morph adds chest breathing. Nearby market props and plants yield to its footprint.
- **Lancelot Albion:** guards the stone bridge approach, with its feet positioned
  against the bridge ramp rather than hovering on the village hillside. Original
  green wings and PBR textures are retained. The source OBJ has no usable rig;
  this version is intentionally a stationary guard.
- **Ainz:** stands in front of an ornate throne on a raised stone overlook. The
  original court includes stairs, paving, balustrades, fluted piers, a crowned arch,
  obsidian throne, purple upholstery and gold inlays. The original model's rune
  image marks the floor. It replaces the initial isolated circular plinth.
- **Fishstick:** dances at the existing river pier toward the desk. The supplied
  Orange Justice motion runs as a 6.5-second loop; this version does not add a wave
  or idle sequence. Repaired disconnected neck and headgear helpers prevent the
  head/hat from stretching away from the body.

The desk, camera controls, Toothless, left hopping slime, terrain height function,
river and sky are retained. Only scenery intersecting the occupied character/court
footprints is removed from the existing plant and settlement placements.

## Assets and reproduction

Exact source links, uploader names, listing licenses and original ZIP SHA-256s:
[`character-sources.json`](../../../../assets/lobby-world/character-sources.json).
Public credits are available through the existing **3D credits** link at `/CREDITS.md`.
Fortnite uploads are recorded as acquisition sources, with Epic Games and the
original Fishstick artists credited separately; uploader labels do not establish
ownership of underlying franchise assets.

Extract the supplied archives outside the repository, including the nested OBJ
ZIPs for Going Merry and Lancelot. With Blender 4.5.3 LTS:

```sh
blender -b --disable-autoexec -t 2 --python scripts/build-world-characters.py -- /path/to/extracted-sources /tmp/converted fishstick
# Repeat for going-merry, snorlax, lancelot, ainz.
npx gltf-transform optimize /tmp/converted/fishstick.glb public/lobby/world/characters/fishstick.glb --compress meshopt --simplify false --flatten false --join false --palette false --texture-compress webp --texture-size 1024
# Other characters use the same options; Going Merry retains a 2K painted atlas.
blender -b --disable-autoexec -t 2 --python scripts/build-royal-court.py -- /tmp/converted/royal-court.glb
npx gltf-transform optimize /tmp/converted/royal-court.glb public/lobby/world/characters/royal-court.glb --compress meshopt --simplify false --texture-compress webp --texture-size 1024
```

The converter restores legacy materials, removes reference-image planes and source
scene extras, and keeps static meshes consolidated. Only Snorlax's dense mesh is
simplified; the original character silhouettes/textures are retained. Motion is
adapted in Blender so there is no runtime retargeting cost.

## Validation and review

Final production build and targeted ESLint passed. All 33 unit tests passed.
Two native-GPU browser scenarios passed: fixed forward camera/portfolio entry,
and successful desk entry when authored world assets fail to load. The recorded
main scene and animation preview produced no page/console errors.

- Unit coverage verifies grounded normalization, cached asset ownership, fresh
  skeletal animation after disposal/setup, and explicit missing-animation failure.
- Native Chromium previews inspect each converted model and sample the shipped
  Fishstick bone motion. Main-view captures check the actual terrain composition.
- Separate suspense/error boundaries prevent a character failure from blocking
  desk readiness. Updates use the existing active-world state and pause when inactive.
- Recorded demonstration: 12 seconds of the actual desk scene followed by 7 seconds
  of the shipped Fishstick animation in an isolated review view. The close-up is a
  review tool, not a new visitor camera mode.

[Video](../implementation/characters/world-characters-demo.mp4) ·
[Desk screenshot](../implementation/characters/desk.png) ·
[Asset sizes and draw counts](../implementation/characters/asset-budgets.json) ·
[Animation probe](../implementation/characters/asset-check.json) ·
[Recording check](../implementation/characters/recording-check.json)
