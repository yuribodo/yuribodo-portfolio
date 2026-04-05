# The Watcher — Contact Section Design

## Context

The current last section (Craft — a 3D scroll-driven playground at `components/sections/craft.tsx`) feels underwhelming. It needs to be replaced with a memorable, playful contact/CTA section that creates "how did they do that" moments. The goal is an Awwwards-level experience inspired by Ochi Design (eye tracking), Obys Agency (liquid typography), and Dennis Snellenberg (magnetic interactions).

**Key references:** Ochi Design, Dennis Snellenberg, Obys Agency, Locomotive.ca, Basement Studio.

---

## Design

### Overview

A full-viewport contact section called "The Watcher" where two giant eyes follow the visitor's cursor, creating an uncanny "the site is watching you" sensation. Below the eyes, "LET'S TALK" text distorts with a liquid WebGL shader on hover. Contact links (email, GitHub, LinkedIn) pull toward the cursor magnetically and reveal a colored duplicate on hover.

The entire section is hidden behind the main content and revealed via a sticky reveal effect as the user scrolls past the About section.

### Architecture

Single client component: `components/sections/contact.tsx` (~200-250 lines) with extracted utilities:

- `components/sections/contact.tsx` — Main section component, layout, sticky reveal ScrollTrigger, eye tracking, blink, magnetic links, split-text hover
- `components/sections/contact-liquid-text.tsx` — WebGL canvas for the liquid text distortion (isolated for performance)
- `lib/animations.ts` — Add magnetic and split-text animation presets (reuse existing file)

### Section Structure

```
<section> (position: fixed; bottom: 0; inset-x: 0; height: 100vh; z-index: 0)
  ├── Eyes Zone (40% viewport height)
  │   ├── Left Eye (div + border-radius, pupil tracks cursor)
  │   └── Right Eye (same)
  ├── CTA Text (20%)
  │   └── "LET'S TALK" — WebGL canvas overlay for liquid distortion
  ├── Contact Links (20%)
  │   ├── Email (pill button — magnetic + split-text)
  │   ├── GitHub (pill button — magnetic + split-text)
  │   └── LinkedIn (pill button — magnetic + split-text)
  └── Footer Info (fixed bottom)
      ├── © 2026 Yuri Bodo
      ├── Tagline
      └── Location
```

The main content wrapper in `app/page.tsx` gets `position: relative; z-index: 1; background: var(--background)` so it sits above the fixed contact section. The last section (About) gets `margin-bottom: 100vh` to create scroll space for the reveal.

### Interactions

#### 1. Eye Tracking (CSS + GSAP quickTo)

- **Rendering:** Pure CSS — divs with `border-radius: 50%`. No canvas needed.
- **Tracking:** `mousemove` listener calculates angle via `atan2(mouseY - eyeCenterY, mouseX - eyeCenterX)`. Pupil translates along that angle, clamped to inner radius.
- **Smoothing:** GSAP `quickTo()` with `duration: 0.3` for jitter-free tracking.
- **Blink:** Random interval (8-15s). GSAP timeline: `scaleY: 1 → 0.05 → 1` over 200ms. Both eyes blink together.
- **Click reaction:** Pupil scales `1 → 1.4 → 1` with `elastic.out(1, 0.3)` ease. Iris color intensifies for 300ms.
- **Idle (3s no movement):** Eyes look down toward CTA text, inviting the visitor.
- **Cursor leaves viewport:** Eyes return to center, partially close (`scaleY: 0.7`).
- **Border:** Subtle glow in accent color (`#fa4b12`) with low opacity.

#### 2. Liquid Typography — "LET'S TALK" (WebGL)

- **Default:** Static text, no effect. Clean and bold.
- **Implementation:** Text rendered to offscreen canvas 2D → used as texture on a WebGL plane. Fragment shader applies displacement based on cursor distance.
- **Shader logic:** `sin(distance * frequency + time) * amplitude * (1.0 - smoothstep(0.0, radius, dist))` — creates ripple effect centered on cursor.
- **Activation zone:** ~100px around text. Outside = static image (no GPU cost).
- **Exit:** Damping — distortion fades smoothly as cursor leaves (amplitude decays over ~500ms).
- **Fallback:** CSS `filter: url(#turbulence)` with SVG `feTurbulence` for browsers without WebGL.

#### 3. Magnetic Links + Split-Text Hover (GSAP)

- **Magnetic radius:** 80px from button center. Within radius, button translates `(mousePos - center) * 0.35` toward cursor.
- **Magnetic easing:** GSAP `quickTo()` with `ease: "power3"`, `duration: 0.5`. Returns with `elastic.out(1, 0.3)` on leave.
- **Split-text hover:** Each button contains original text + clone. Container has `overflow: hidden`. On hover, original slides up (`translateY: -100%`), clone slides in from below (`translateY: 0`). Clone is in accent color.
- **Click:** Subtle scale `0.95 → 1` + border ripple.
- **Combined flow:** Magnetic activates on proximity → split-text activates on direct hover → creates "pull → enter → reveal" dance.

#### 4. Sticky Reveal (ScrollTrigger)

- Contact section: `position: fixed; bottom: 0; z-index: 0`.
- Main content wrapper: `position: relative; z-index: 1; background: var(--background)`.
- About section gets `margin-bottom: 100vh`.
- As user scrolls past About, main content scrolls up revealing the fixed contact section beneath.
- **Eye entrance:** During reveal, eyes animate from "closed" (`scaleY: 0`) to "open" (`scaleY: 1`) — they "wake up" as the section is uncovered.
- ScrollTrigger on the margin-bottom space controls the eye opening animation, scrubbed to scroll progress.

### Accessibility

- **`prefers-reduced-motion`:** No tracking, no distortion, no magnetic. Static eyes centered. Simple color-change hover on links.
- **Keyboard:** All links focusable with `:focus-visible` ring. Logical tab order (email → GitHub → LinkedIn).
- **Touch/mobile:** Eyes follow last touch point. Magnetic disabled (no hover on touch). Split-text works on tap with faster transition.
- **Screen readers:** Section has `aria-label="Contact"`. Links have descriptive text.

### Responsive

- **Desktop (>1024px):** Full layout as described. Eyes ~200px diameter.
- **Tablet (768-1024px):** Eyes ~150px. Links stack vertically if needed.
- **Mobile (<768px):** Eyes ~120px, gap reduced. "LET'S TALK" font-size reduced. Links stack vertically. No magnetic effect. Touch-based eye tracking.

### Colors

Uses existing project palette from CSS variables:
- Background: `#1a1a1a` (near black) — `var(--background)` in dark mode
- Accent: `#fa4b12` (hot orange) — eye iris, link hover, glow
- Text: `#fff` — CTA heading
- Muted: `rgba(255,255,255,0.25)` — footer info

### Files to Modify

| File | Change |
|------|--------|
| `components/sections/craft.tsx` | Remove (replaced by contact) |
| `components/sections/contact.tsx` | **Create** — main contact section component |
| `components/sections/contact-liquid-text.tsx` | **Create** — WebGL liquid text sub-component |
| `app/page.tsx` | Replace `<Craft />` with `<Contact />`, add wrapper styles for sticky reveal |
| `lib/animations.ts` | Add magnetic and split-text animation presets |

### Dependencies

- No new npm packages needed. Uses existing: GSAP, @gsap/react, ScrollTrigger.
- WebGL is vanilla (no Three.js needed for a single plane with shader).

---

## Verification

1. **Visual:** Open dev server (`pnpm dev`), scroll to bottom — contact section reveals smoothly from behind About section.
2. **Eye tracking:** Move cursor around — pupils follow smoothly without jitter.
3. **Blink:** Wait 8-15s — eyes should blink naturally.
4. **Liquid text:** Hover over "LET'S TALK" — text distorts with ripple effect, dissipates on leave.
5. **Magnetic:** Move cursor near contact pills — they pull toward cursor, spring back on leave.
6. **Split-text:** Hover directly on a pill — text slides up revealing colored clone.
7. **Accessibility:** Enable `prefers-reduced-motion` in dev tools — all animations disabled, static layout.
8. **Keyboard:** Tab through links — focus rings visible, logical order.
9. **Mobile:** Test on mobile viewport — touch tracking works, magnetic disabled, layout responsive.
10. **Performance:** Check with CPU 4x throttling — smooth 60fps on all interactions.
11. **Build:** `pnpm build` passes without errors.
