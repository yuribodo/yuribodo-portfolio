# Custom Cursor — Organic Blob with Contextual Morphing

## Overview

A custom SVG cursor for the portfolio that replaces the native cursor with an organic blob shape. The blob deforms based on mouse velocity/direction, morphs contextually on different element types, and uses `mix-blend-mode: exclusion` with the accent color (`#fa4b12`) to always contrast with content.

## Approach

SVG path with 8 control points animated via GSAP `quickTo`. Deformation driven by mouse velocity vector and spring physics. Contextual morphing triggered by `data-cursor` attributes on elements.

## Component

**File:** `components/ui/custom-cursor.tsx` (client component)

**Renders:** A fixed, fullscreen SVG overlay with `pointer-events: none`, `z-index: 9999`, `mix-blend-mode: exclusion`, `aria-hidden="true"`.

**Mounting:** In `app/page.tsx` alongside Header, AsciiNoise, AudioToggle, and other global UI.

## SVG Structure

- Single `<svg>` element covering the viewport (`100vw` x `100vh`, `position: fixed`, `inset: 0`)
- One `<g>` group translated to cursor position via `gsap.quickTo()` on `x` and `y`
- One `<path>` inside the group, filled with `#fa4b12`, defining the blob shape
- Path constructed from 8 control points distributed evenly in a circle (every 45 degrees)
- Cubic bezier curves connect the points to form a smooth closed shape

## Blob Shape — Control Points

8 points at angles `[0, 45, 90, 135, 180, 225, 270, 315]` degrees, each at a base radius of 16px from center (32px diameter).

Each point has:
- `baseX`, `baseY`: resting position on the circle
- `offsetX`, `offsetY`: current deformation offset (driven by velocity + idle noise)

The SVG path is rebuilt each frame from the deformed positions using cubic bezier interpolation between adjacent points (catmull-rom to bezier conversion or manual handle calculation).

## Deformation — Velocity Response

On each GSAP tick:
1. Calculate velocity vector from cursor delta: `vx = currentX - prevX`, `vy = currentY - prevY`
2. Calculate speed: `speed = sqrt(vx² + vy²)`
3. Normalize direction: `dx = vx / speed`, `dy = vy / speed`
4. For each control point, calculate dot product with direction vector
5. Points aligned with movement direction get pushed outward (stretch factor: `speed * 0.4`, clamped)
6. Points perpendicular to movement compress inward (squeeze factor: `speed * 0.2`, clamped)
7. Apply spring damping to offsets: `offset += (target - offset) * 0.15` per frame

**Clamp:** Maximum stretch of 12px beyond base radius, maximum squeeze of 6px inward.

## Deformation — Idle Wobble

When mouse is stationary for >200ms:
- Each control point oscillates with a sin wave: `sin(time * frequency + pointIndex * phaseOffset) * amplitude`
- Amplitude: 1-2px (subtle)
- Frequency: unique per point (0.8-1.5 range) to avoid synchronized pulsing
- Creates a "breathing" organic feel

## Contextual States

States are triggered by `data-cursor` attributes on DOM elements. Detection via event delegation: `mouseenter`/`mouseleave` listeners on `document`, checking `event.target.closest('[data-cursor]')`.

**Auto-detection:** Elements matching `a, button, [role="button"]` that don't have an explicit `data-cursor` attribute automatically get treated as `data-cursor="link"`.

| State | `data-cursor` | Size | Shape | Behavior |
|-------|--------------|------|-------|----------|
| Default | (none) | 32px | Organic circle | Idle wobble, velocity deformation |
| Link | `"link"` | 48px | Horizontal pill | Stretches wider, slight opacity boost |
| Project | `"project"` | 64px | Larger circle | Expands, optional "ver" text inside |
| CTA | `"cta"` | 48px | Organic circle | Rhythmic pulse (scale 1.0 → 1.15 → 1.0, 0.8s loop) |
| Text | `"text"` | 32px tall, 4px wide | Vertical bar | Compresses to text-cursor shape |
| None | `"none"` | 0 | — | Fades out (opacity 0, scale 0.5) |

**Transitions:** GSAP tween, 0.3s duration, `power3.out` ease. Target radius, shape path, and any additional properties (opacity, scale) interpolate together.

## Styling

```css
/* Applied to body when cursor component mounts */
body {
  cursor: none;
}

/* The SVG element */
.custom-cursor {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  mix-blend-mode: exclusion;
}

.custom-cursor path {
  fill: #fa4b12;
  shape-rendering: geometricPrecision;
}
```

`will-change: transform` added to the `<g>` element during active movement, removed after idle timeout.

## Performance

- Position via `gsap.quickTo()` — GSAP manages the render tick, no manual rAF loop
- Path recalculation skipped when speed is below threshold (< 0.5px/frame) and idle wobble hasn't changed significantly
- No additional canvas layer — SVG composites with existing DOM via CSS
- Mobile disabled entirely: component returns `null` when `window.matchMedia('(pointer: coarse)').matches`

## Accessibility

- `prefers-reduced-motion`: blob becomes a static circle that teleports to cursor position (no spring, no deformation, no wobble). Contextual states still change size but without animation.
- Native cursor hidden via `cursor: none` on `body` — only applied on desktop (`pointer: fine`)
- `aria-hidden="true"` on SVG — purely decorative
- `pointer-events: none` — never intercepts clicks or focus

## Cleanup

- All GSAP tweens and quickTo instances scoped via `useGSAP` — automatic cleanup on unmount
- Document-level event listeners (`mousemove`, `mouseenter`, `mouseleave`) removed in useGSAP cleanup
- `cursor: none` removed from body on unmount

## Integration Notes

- The Contact section eyes already track mouse — the blob cursor coexists (both visible, no conflict since blob is `pointer-events: none`)
- Pong game canvas should have `data-cursor="none"` (it already sets `cursor-none` class)
- The pretext-headline canvas repulsion effect is independent — blob sits on top via z-index
- ASCII noise overlay is z-indexed below the cursor SVG
