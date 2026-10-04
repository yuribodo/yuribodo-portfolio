# Valley shoulder planting

The approved river banks, slimes, dragon and desk composition are preserved. Fourteen authored groves occupy the rising shoulders on both sides of the front valley. Lower shelves use broadleaf crowns; conifers become more frequent at higher elevations. Embedded mossy outcrops and shrub understory join the trees to the ground, with open saddles and exposed rock above the forest.

- 766 additional placements: 318 broadleaf trees, 188 conifers, 164 shrubs, 96 mossy rocks.
- Reuses existing licensed Poly Haven assets and distant canopy LODs; no new model or texture downloads.
- Clearings protect the villages, river and tributaries. The near terrace and rear valley retain their planting.
- New roots sample the actual terrain triangles after the front landscape expansion. This avoids hovering plants where the analytic terrain height differs from the coarser rendered mountain faces.
- The desk, collectibles and initial camera are unchanged.

[Before/after comparison](hillsides.html). Current desktop, laptop, wide and rear captures are in ../implementation/; this pass preserves its before/after in ../implementation/hillsides/.

Validation: 25 unit tests passed, including terrain-grid continuity and clearing protection. TypeScript and lint for all changed JavaScript/TypeScript files passed. A broader lobby lint run also exposed three existing react-hooks/immutability diagnostics in unchanged keyboard.tsx and mouse.tsx; those desk components were preserved.

Production build and all seven lobby browser scenarios passed. Desktop (1440×900), laptop (1280×720), wide (1920×1080) and rear (1280×800) captures were reviewed without console/runtime errors.

Final warm-frame profile on the local RTX 3050 Laptop: about 30.6 FPS at the desk and 43.9 FPS facing rear, at 1440×900 and DPR 1. This is a local observation with changing desktop GPU load, not a guaranteed frame rate. The new planting adds roughly 0.96 million submitted triangles including shadow passes, so foliage remains an optimization opportunity. See ../implementation/hillsides/frame-profile.json.
