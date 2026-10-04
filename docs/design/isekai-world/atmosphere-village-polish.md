# Atmosphere and village art pass — September 12, 2026

> Historical implementation notes. The current sky composition and visual comparison are documented in [open-world-and-sky.md](reviews/open-world-and-sky.md).

This pass addresses the user's feedback that the connected valley still looked like simple geometric placeholders and that the sky was visibly an image. The approved desk and cut-stone terrace remain the composition baseline.

## Visible changes

- Replaced the sky panorama and all cloud cards with a procedural sky and bounded, raymarched cloud volumes. Large cumulus banks, smaller distant banks and low clouds around the floating landmarks occupy different world positions. Clouds have warm lit edges, cool interiors, stable spatial dithering and slow drift. Looking around reveals their physical placement; this is not a displaced sky photograph.
- Replaced the generated house boxes with eight authored Quaternius village models: three house forms, an inn, a mill, a bell tower, market stalls and a well. Roof tiles, dormers, timber joints, overhangs and arched door surrounds are retained. Placement follows streets, a market clearing and the rear settlement. Stone, plaster, timber and slate are recolored into a shared matte palette.
- Added terrain pigment at multiple scales, exposed rock on slopes, subtle strata and eroded ribs outside the terrace/town/river corridor. Reused the credited Poly Haven cliff scan for distant rock outcrops, tapering and embedding its rectangular edges into hillsides. Added terrain-conforming cultivated parcels near settlements.
- Sky-generated PMREM lighting replaces image-based environment lighting. Procedural materials participate in the existing portfolio-entry dimmer. Optional village asset failure leaves the desk/entry available; mobile and reduced-motion bypass remain.

## Rendering and assets

The clouds share two 128 × 96 × 80 RGBA density/light fields (7.5 MiB total) with different sculpted billow shapes. Light transmittance is precomputed once, avoiding a secondary shadow ray at every fragment step. Cloud raymarches are limited to 32 samples and terminate when opaque. Geometry, field and material are shared between banks. The distant atmosphere renders into a half-width/half-height floating-point target (one quarter of native fragments), then composites behind the full-resolution opaque world. The two nearby landmark cloud volumes retain normal scene depth and full resolution. The target follows viewport/DPR changes. Field generation currently happens on the main thread during scene creation; this is a remaining cold-start optimization opportunity.

The adapted village GLB is 290,388 bytes. Eight originals contain 46,627 triangles in total before runtime repetition. The adaptation bakes the palette and subtle contact shading into vertex colors, merges each building into one material and applies Draco compression. Repeated buildings are instanced and separated into front/rear batches. This keeps download and draw cost lower than cloning each material slot per house.

Rebuild: `node scripts/build-valley-village.mjs /path/to/source/glbs`. Exact source model IDs and license links are in [CREDITS](../../../public/CREDITS.md). The [author's pack page](https://quaternius.com/packs/medievalvillage.html) confirms CC0. Technical reference: [Three.js WebGL volume cloud example](https://threejs.org/examples/webgl_volume_cloud.html); the palette, density shape, precomputed lighting and composition here are project decisions.

## Review evidence

- [Before this pass](implementation/before-atmosphere-polish.png)
- [Desktop](implementation/desktop.png), [laptop](implementation/laptop.png), [wide](implementation/wide.png), [rear](implementation/rear.png)

The visible town is more articulated and the sky has physical depth. This does not establish AAA art parity: the large citadel remains repetitive, the landscape can still use more authored composition, and cloud banks still reuse two density shapes. Walking/collision/gameplay were not introduced. The current interaction remains seated exploration.

## Integration correction

The expanded browser console check exposed an existing audio timing edge case: `requestAnimationFrame` may deliver the current frame's timestamp from just before `performance.now()` at fade creation. Negative progress then produced an invalid negative HTML media volume. The fade now clamps progress at both ends. A regression test supplies that earlier timestamp, verifies valid initial volume, then verifies the fade reaches its target normally.

## Validation

Production build, TypeScript, targeted ESLint and whitespace checks pass. All ten unit tests pass. All seven browser scenarios pass (the audio-error scenario passed on rerun after its correction). These cover camera drag/keyboard/focus/return, entry from the rear, actual monitor mesh interaction, collectibles, readiness/skip, missing optional models, mobile and reduced-motion bypass, and a full turn with no old sky/landscape image requests. Production captures at 1280, 1440 and 1920 widths plus the rear view report no page or console errors.

The final warm-frame sample is recorded in [frame-profile.json](implementation/frame-profile.json). It includes both atmosphere and main-scene submissions. This is a local headless-browser cadence sample, not a GPU timer-query or a frame-rate guarantee on other hardware.

Earlier village-pass sample, superseded by the natural-terrain revision, on the RTX 3050 laptop at 1440×900: desk 25.72 FPS (38.89 ms mean, 321 draw submissions, 3.47 million submitted triangles); rear 42.86 FPS (23.33 ms mean, 214 draws, 3.00 million triangles). Earlier samples in this pass varied materially. Reducing the distant cloud pass guarantees fewer raymarch fragments, but these runs do **not** establish an overall frame-rate improvement. The final desk cadence remains below a comfortable 60 FPS target and is an unresolved performance limitation. Other desktop GPU activity was present; no unrelated applications were stopped to improve the reported number.

## Natural terrain follow-up

The user clarified that the natural ground was the priority. See [natural-ground-polish.md](natural-ground-polish.md) for the current terrain implementation and review. The ground now has actual small-scale relief, domain-warped hillsides, soil/meadow normal maps and triplanar exposed rock. Worn routes blend into the ground, with fragmented grass centres and small embedded trail stones. This follow-up also integrates the Quaternius nature revision, animated river with depth-based banks and sky reflections, and taller cloud volumes with a continuous horizon gradient.
