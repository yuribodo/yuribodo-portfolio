# September 12: material and spatial correction

The user rejected the environment's incompatible asset styles and the photographic rocky floor. This pass returns the foreground to the approved pale-stone terrace and reduces the visual contrast between near architecture and distant landmarks. Stone is a working interpretation of the approved concept; the optional floor-material question was not answered during implementation. Visual acceptance remains open.

The existing desk, collectibles, camera baseline and portfolio transition remain intact.

- Replaced the photographic paving and rounded kit arch with original cut-stone slabs, narrow joints, masonry courses, coping, stairs and a voussoir arch. Floor and architecture share the generated limestone pigment and a matte finish.
- Added planted wall bases, original climbing vines and a nearby tree that casts shadows across the terrace. Garden cards and masonry are merged rather than one draw call per element.
- Removed small rectangular satellite islands. Citadel recesses use colored, lower-contrast pigments; chess loses its roughness texture and metallic sheen and turns to a recognizable side profile. The far landscape remains painted.
- Replaced the old academy blockout with an original campus: arcaded wings, pitched slate roofs, buttresses, cornices and a clock tower. It sits on a broad hillside with a separately instanced forest; those distant trees do not cast near sun shadows.

## Rendered evidence

[Before](implementation/before-material-correction.png), [desktop](implementation/desktop.png), [laptop](implementation/laptop.png), [wide](implementation/wide.png), [rear](implementation/rear.png). These are real browser captures, not generated concept images. The final captures use the production server.

## Verification

- Production build and TypeScript pass.
- Targeted ESLint and whitespace checks pass.
- All six existing browser tests pass with the native NVIDIA renderer: look/return/entry, collectibles, loading/skip, optional asset failure, reduced motion and mobile bypass.
- The failure test now also blocks the new academy, limestone pigment and garden sprite; that updated case passes.
- Desktop/laptop/wide/rear captures report no browser console or page errors.
- Two final warm samples varied from about 23–37 FPS at the desk and 51–57 FPS at the rear on this RTX 3050 laptop; other desktop applications were active. The final sample submits about 1.42 million triangles in 222 draws at the desk, including shadow passes. Runtime performance is still an open issue, not a passed 60 FPS target.
- The warm native-GPU diagnostic is recorded in [frame-profile.json](implementation/frame-profile.json). This remains above the original geometry budget and is not a claim of universal 60 FPS.

## Remaining visual limits

The foreground now has a coherent material and spatial structure, but this is not AAA art completion. The citadel still has repetitive architectural bands; tree canopies still reveal cards; the middle-distance ground needs authored detail and stronger integration with the painted valley. The academy is a scene-specific interpretation, not a verified replica of Ranoa. The painted distant valley has not been rebuilt as a traversable 3D world.

Keep the desk interactions and the quieter foreground material treatment as the baseline for review. Further changes should be judged against the actual captures and the user's next floor/style correction.
