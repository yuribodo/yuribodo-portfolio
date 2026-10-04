# Natural ground polish — September 12, 2026

The terrain previously read as smooth green mounds, with uniform ground colour and broad painted paths. This revision gives the natural surface relief and material structure at both seated viewing distances and close range.

- **Landform:** deterministic, domain-warped noise breaks the regular hill shoulders into hollows and drainage-like folds. Fine geometry relief begins outside the paved terrace. The common height field positions plants, stones and buildings; the near mesh uses 288 × 288 segments.
- **Surface:** CC0 soil and leafy-grass colour/normal maps supply stones, leaves and grain. Two offset samples reduce repeated texture rows. Larger colour variation remains visible when fine detail becomes smaller than a pixel.
- **Slopes and banks:** a third CC0 rock texture is projected along three axes and blended according to slope. Soil near water darkens with elevation relative to the river. These are surface transitions on the terrain mesh.
- **Paths:** variable width, irregular margins and interrupted grass centres replace the separate plain road strips. Small stones reuse the existing nature meshes and sit partly embedded at trail edges.
- **Related environment work:** the preceding nature revision is retained: Quaternius trees/undergrowth, wind, physical river material with sky reflections, and cloud volumes. A smooth sky gradient removes the hard horizontal horizon band.

## Sources

Poly Haven [Forest Ground 04](https://polyhaven.com/a/forest_ground_04), [Leafy Grass](https://polyhaven.com/a/leafy_grass), and [Rock Face 03](https://polyhaven.com/a/rock_face_03), all CC0. Each active image is 1024px WebP. Exact authors and modifications are in [CREDITS](../../../public/CREDITS.md). Vegetation source IDs are in [nature-sources.json](../../../assets/lobby-world/nature-sources.json).

## Visual evidence

[Before terrain polish](implementation/before-natural-ground.png) · [Current rear view](implementation/rear.png) · [Current desk view](implementation/desktop.png)

The rear view makes the ground change easiest to inspect. The desk floor uses its existing stone material. This is still a stylized web scene: distant hills and large landmarks need further authored composition to reach the user's AAA reference quality. Seated exploration remains the available interaction.

## Validation

Production build (including TypeScript), targeted ESLint and `git diff --check` pass. Ten unit tests and all seven browser scenarios pass. The optional-asset failure scenario now includes the new vegetation and all ground maps. Production captures exercise desktop/laptop/wide and rear views with page and console error collection.

Removed obsolete terrain vertex-colour generation: the material now computes pigment from textures and world position, so those per-vertex slope samples and colour buffers were unused.

The earlier ground-only profile recorded 180 warm frames per view at 1440×900 on an RTX 3050 laptop: approximately 41.38 FPS at the desk and 46.76 FPS at the rear, with no page errors. Submitted geometry averages 4.18M/2.98M triangles including shadow passes and 346/212 draw submissions. This is browser frame cadence, not a controlled GPU benchmark; it does not establish a comparable improvement over previous samples. Consistent 60 FPS remains an optimization target.

## Meadow composition and life follow-up

The next user review rejected the still-uniform, lifeless landscape. This follow-up changes the ecological composition rather than only the terrain texture:

- Woodland positions now follow authored bands along the valley sides. Broad-crown tree variants replace the sparse crowns in lower woodland. Ground canopy occlusion is baked from those actual placements into a 512px field; it is approximate soft contact shading, not a new dynamic shadow pass.
- Close grass uses curved three-blade tufts, with independent phase wind. Short daisies have rounded petals and leaves. Placement samples the actual annular area and respects the paving edge, fixing the empty band nearest the camera.
- Authored Quaternius Flower Group and Bush with Flowers models provide grouped blooms at the trail margins. The extra CC0 GLB is 172.59 KB; provenance and reproduction are recorded in `assets/lobby-world/meadow-sources.json` and `scripts/build-meadow-flowers.mjs`.
- Oversized ferns and grass clumps were reduced. Green/gold meadow variation and a stronger sun-to-fill ratio differentiate sunny clearings from shaded woodland.
- The river now continues behind the desk. Previously the rear height field implied a channel but the water mesh stopped at the front. Ridge contributions no longer fill the channel; two regression tests protect submerged river centres and continuous near/far height blending. Cross-direction wave normals replace strongly parallel ripple bands.

[Before this follow-up](implementation/before-meadow-life.png) · [Current rear view](implementation/rear.png)

The scene remains a stylized browser environment. Its large landmarks, cloud silhouettes and distant landforms still fall short of the original AAA art reference; this pass specifically improves the meadow, ecological placement and river continuity.

Follow-up validation: production build/TypeScript, targeted ESLint, twelve unit tests and seven browser scenarios pass. The optional-world failure test includes the flower GLB. The [motion capture](implementation/meadow-motion.mp4) records eight seconds of the actual rear view in the browser; it is not a rendered concept animation.

Latest follow-up [frame profile](implementation/frame-profile.json): 43.20 FPS desk / 37.50 FPS rear, 407/231 draw submissions and 4.58M/3.89M submitted triangles. The rear view now submits more foliage/flowers and remains below 60 FPS. Results are local headless browser cadence, with other desktop applications potentially running; no overall performance improvement is claimed. Final production screenshots and the motion capture report no page/console errors.
