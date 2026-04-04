# Portfolio Design Spec — yuribodo.dev

## Context

Yuri Bodo is a creative frontend developer from Brazil who wants a portfolio that reflects his identity: a dev obsessed with animations, interactions, and gaming culture (Pokémon, Yu-Gi-Oh, chess). The current site is a "coming soon" landing page with a terminal UI and Pong easter egg. This spec defines the full portfolio redesign — a Game World experience where gaming references are *seasoning*, not the main dish.

## Design Philosophy

- **The site IS the portfolio** — the craft of the frontend work speaks through every interaction
- **Gaming as seasoning** — references to games appear in mechanics and micro-details, never dominating the visual design
- **Interactive > Decorative** — every animation invites participation, not passive viewing
- **"Como caralhos fizeram isso?"** — the goal is to make people inspect the source code
- **Restraint + Motion** — restrained palette, generous motion. Color doesn't impress; interaction does

## References & Stolen Ideas

Sites that cause the "how did they do that?" reaction — what we steal from each:

| Reference | What to steal | URL |
|-----------|--------------|-----|
| **Lusion.co** | Scroll-jacking as smooth parallax between depth layers. Pre-calculated vertex animations for performance. Matcap shader technique for translucent 3D. | lusion.co |
| **Darknode** | Two-color discipline: ONE accent (red) + dark bg. Scored 7.69 creativity with minimal palette. Proves interaction > colors. | awwwards.com/sites/darknode |
| **Dennis Snellenberg** | Scroll-triggered animations, clean dark interface, GSAP-heavy. Hover states that feel alive. | dennissnellenberg.com |
| **Bruno Simon** | Turning a portfolio into a playable experience. The concept of navigation through gameplay. | bruno-simon.com |
| **Rauno Freiberg** | Disney animation principles in UI: follow-through, overlapping action. Sound design integrated with interactions. | rauno.me |
| **Joffrey Spitzer** | Minimalist Astro + GSAP build with reveals, FLIP transitions, subtle motion. Typography as primary design element. | Codrops case study |
| **Pretext demos** | Text flowing around shapes, per-character physics, kinetic typography engine. Text as interactive medium. | pretext.cool |
| **Samsy.ninja** | Immersive 3D world, neon glow aesthetic, 120fps WebGPU performance. | samsy.ninja |

### Key Awwwards Patterns Applied

1. **SplitText with micro-stagger** (0.01-0.04s between characters) — text "falls into place" organically
2. **Everything transitions 300ms** — no instant state changes, ever
3. **Scroll position drives animation** — not "on scroll trigger", but continuous sync with scroll velocity
4. **Masked overflow reveals** — characters peek from behind containers for cinematic effect
5. **Color discipline** — dark bg + ONE accent used surgically. Most of the site is black/white, accent explodes where it matters
6. **Layered hover states** — brightness, scale, glow, shadow all transition simultaneously

## Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| Framework | Next.js 16 (App Router) | SSR, routing, project pages |
| Language | TypeScript 5 (strict) | Type safety |
| Styling | Tailwind CSS 4 | Utility-first CSS |
| Animation Engine | GSAP + ScrollTrigger | Orchestration, scroll animations, FLIP transitions |
| Text Engine | @chenglou/pretext | Kinetic typography, Canvas text rendering, per-character physics |
| 3D | Three.js (hero only) | Low-poly icosahedron with bloom |
| Audio | Web Audio API | Soundtrack + SFX |
| Package Manager | pnpm | Dependency management |

## Site Structure

**Hybrid Journey**: Single-page scroll with all sections inline + dedicated pages for individual projects.

```
/ (home)
├── Hero — Boot + Text Physics
├── About — Scroll Reveal Narrative
├── Projects — Deck of Cards (scroll)
└── Skills — Solar System Orbits

/projects/[slug] — Dedicated project pages
```

**Navigation**: Sticky header that forms organically from the hero animation. Contains name (left) + social links (right: GitHub, LinkedIn, email).

---

## Section 1: Hero — Boot + Text Physics

### Concept
The site "boots up" like a game console. During boot, text is rendered via Pretext with kinetic typography. After boot, the protagonist's name spawns as living particles that react to the cursor — letters flee like a school of fish when the cursor approaches and return with spring physics.

### Animation Sequence

| Phase | Time | What happens |
|-------|------|-------------|
| Boot | 0s → 2s | Dark screen (#1a1a1a). Pretext renders boot lines in `--subtle` burgundy, one by one with cinematic timing: "GAME_WORLD OS v2.0", "Initializing render engine... OK", "Loading protagonist... OK". Soundtrack fades in. |
| Spawn | 2s → 3.5s | Boot text dissolves. Particles explode from center and settle into "YURI BODO" in `--foreground-bright` beige. Each letter is an independent particle with spring physics via Pretext + Canvas. Burnt orange (`--accent`) glow emanates from center during explosion. SFX: subtle power-up sound. |
| Playground | 3.5s → ∞ | Interactive state. Cursor becomes a force field — letters flee when cursor approaches, gravity pulls them back. Letters never fully stop — constant micro-movement ("breathing"). Subtitle in `--muted` burgundy appears below. Three.js icosahedron floats with warm lighting (burgundy/orange rim light). |
| Scroll Transition | On scroll | Letters compress and migrate to the top, becoming the sticky header/nav. Canvas shrinks to subtle background. ScrollTrigger orchestrates the entire transition — no hard cuts. |

### Technical Layers

- **Pretext**: Measures text layout, calculates per-character positions, enables physics-based text on Canvas
- **Canvas 2D**: Renders the interactive text particles at 60fps
- **GSAP Timeline**: Orchestrates the boot → spawn → playground sequence
- **GSAP ScrollTrigger**: Handles the hero → nav transition on scroll
- **Three.js**: Single icosahedron with wireframe + bloom post-processing, reacts to mouse
- **Web Audio API**: Boot SFX, spawn sound, ambient soundtrack fade-in

### Mobile Behavior
- Touch replaces cursor — tap pushes letters, gravity pulls back
- Boot sequence plays the same
- 3D element may be simplified or removed for performance

---

## Section 2: About — Scroll Reveal Narrative

### Concept
Editorial approach. A bold statement at the top, followed by paragraphs that reveal one by one as the user scrolls. Gaming appears naturally in the *words* (as part of Yuri's story), not forced into the visual design. The design is clean and premium — personality comes from the writing and GSAP/Pretext animations.

### Layout

```
002 — ABOUT

"Cada interface que eu construo
é uma jogada calculada."

│ Paragraph 1: Who I am, what I do
│ Paragraph 2: My background — gaming taught me strategy and attention to detail
│ Paragraph 3: My stack and what drives me
```

### Animation
- Section label fades in
- Main statement: Pretext renders with kinetic text effect — characters assemble
- Paragraphs: each block reveals with ScrollTrigger (fade + translateY + border-left grows)
- Staggered opacity — next paragraph is barely visible, teasing scroll continuation

### Technical Notes
- Pretext for the main statement typography animation (Canvas)
- GSAP ScrollTrigger for paragraph reveal timing
- Pure CSS for border-left accent and typography
- No gaming UI elements — the content carries the personality

---

## Section 3: Projects — Deck of Cards

### Concept
Projects start stacked like a deck of cards. Horizontal scroll (or drag) fans the deck open — each card reveals itself. The active card is highlighted with larger scale, glow, and expanded info. Pulling a card from the deck opens its dedicated project page. The metaphor is "your deck of projects" without being literally Yu-Gi-Oh.

### Card Design
- Clean, modern cards with a *touch* of card game: holographic gradient on hover that follows the mouse (CSS perspective + JS)
- **Normal**: `--border` (barely visible)
- **Featured**: `--accent` border + subtle glow
- Each card contains: screenshot/preview, project name, short description, tech tags
- Hover: brightness shift + tilt + holographic gradient. All transitions 300ms.

### Interactions
- Scroll horizontal or drag to navigate the deck
- Active card: larger scale, info expanded, glow effect
- Hover: holographic gradient follows mouse position (tilt effect via CSS transform perspective)
- Click: GSAP FLIP animation — card expands to fill screen → navigates to `/projects/[slug]`

### Dedicated Project Pages (`/projects/[slug]`)
- Full project detail: description, screenshots/video, tech stack, links (live demo, GitHub)
- Page transition: FLIP from card position to full page
- Back navigation: reverse FLIP animation
- Content structure is flexible — defined per project

### Technical Notes
- GSAP Draggable or scroll-driven animation for deck fanning
- GSAP FLIP for card → page transition
- CSS `transform: perspective()` + JS mouse tracking for holographic tilt
- Pretext for project titles on hover (optional kinetic effect)

---

## Section 4: Skills — Solar System Orbits

### Concept
You are the center. Skills orbit around you — core skills on inner orbits, tools and libs on outer orbits. Nodes move slowly in orbit. Click/hover freezes orbit and expands skill details.

### Layout
- Center: core node (labeled "CORE" or your initials "YB")
- Inner orbit (2-3 nodes): React, TypeScript, Next.js — primary skills
- Middle orbit (3-4 nodes): GSAP, Tailwind, Framer Motion — daily tools
- Outer orbit (2-3 nodes): Three.js, Pretext, etc. — specialized/growing skills

### Visual Design
- Dark background, subtle orbit lines (circles) using `--border`
- Nodes: circles with tech name, `--muted` borders. Active/hovered node gets `--accent` border
- Core node: larger, `--accent` glow
- Orbit lines: very subtle (`--border`), just enough to suggest the path
- Node size corresponds to proficiency level
- No multi-color nodes — restraint. All nodes same border color until interacted with

### Interactions
- Nodes orbit slowly (CSS animation or GSAP)
- Hover on node: orbit pauses, node scales up, glow intensifies, tooltip with description + experience level
- Hover illuminates connected nodes (e.g., hovering React highlights Next.js too)
- ScrollTrigger: orbits start when section enters viewport, nodes appear one by one

### Technical Notes
- SVG or CSS for orbit paths and nodes
- GSAP for orbit animation (allows easy pause/resume)
- GSAP ScrollTrigger for entrance animation
- Keep it 2D — visual depth through scale and opacity, not Three.js

---

## Navigation & Header

### Behavior
- **Before scroll**: No visible header. Hero is full screen.
- **On scroll (hero → about transition)**: Hero letters compress and migrate to top-left, forming "YURI BODO" as header logo. Social links fade in on the right.
- **Sticky**: Header stays fixed after formation. Semi-transparent dark background with blur.
- **Content**: Name/logo (left) + Social icons (right: GitHub, LinkedIn, Email)

### Technical Notes
- GSAP ScrollTrigger scrub animation for hero → header morph
- The text particles literally move from canvas center to header position
- After transition completes, swap Canvas particles for static HTML text (performance)

---

## Easter Eggs

### Pong (existing)
- Keep the existing Pong game
- Relocate trigger: hidden somewhere in the site (konami code, hidden click area, or terminal command)
- Maintain the game loading screen and full gameplay experience

### New Easter Eggs (implement incrementally)
- **Konami Code** (↑↑↓↓←→←→BA): triggers a special effect or unlocks hidden content
- **Hidden click areas**: subtle interactive spots that reward exploration
- **Terminal command**: typing specific keys anywhere triggers a mini terminal overlay
- Scope and specific implementations to be defined during development

---

## Audio

### Soundtrack
- Lo-fi or chiptune ambient track
- Starts on hero (after user interaction for autoplay policy)
- Volume: low (0.2-0.3), fades in gradually during boot sequence
- Mute button always visible in header or corner
- Respect user preference — remember mute state in localStorage

### Sound Effects
- Boot sequence: subtle typing/processing sounds
- Name spawn: power-up / materialization sound
- Section transitions: soft whoosh or chime
- Card interactions: subtle card flip / slide sounds
- Easter egg triggers: achievement unlock sound

### Technical Notes
- Web Audio API for SFX (low latency)
- HTML5 Audio for soundtrack (streaming)
- Preload critical SFX, lazy-load soundtrack
- All audio opt-in — no autoplay without user gesture

---

## Performance Considerations

- **Canvas**: Only active in viewport. Reduce particle count on mobile.
- **Three.js**: Single scene, single object, dispose on scroll-away. Consider removing on low-end devices.
- **GSAP**: Use `will-change` sparingly, remove after animation. Prefer transforms and opacity.
- **Pretext**: Pre-calculate layouts, cache measurements.
- **Audio**: Lazy-load, compress, use Web Audio API for SFX.
- **Images**: `next/image` for all project screenshots. WebP/AVIF format.
- **Fonts**: `next/font` with Archivo (display/body) + JetBrains Mono (code). Preload only Black (900) and Regular (400) weights.
- **Reduced motion**: Respect `prefers-reduced-motion` — skip boot sequence, show static layout, disable particle physics.

---

## Typography

**Approach**: Typography is the primary design element. Large, oversized headlines. Weight hierarchy creates visual structure.

| Role | Font | Weight | Usage |
|------|------|--------|-------|
| Display / Headlines | Archivo | 800-900 (Extra Bold / Black) | Hero name, section titles, big statements. Tight letter-spacing (-1.5px). |
| Body / UI | Archivo | 400-500 (Regular / Medium) | Paragraphs, descriptions, navigation. Normal letter-spacing. |
| Labels / Accents | Archivo | 600 (Semi Bold) | Section numbers, tags, small labels. Wide letter-spacing (+2-4px), uppercase. |
| Code / Terminal | JetBrains Mono | 400-500 | Boot sequence, tech tags, terminal elements, monospace accents. |

**Type scale**: 12 / 14 / 16 / 20 / 24 / 32 / 48 / 64 / 96px  
**Line-height**: 1.1 for display, 1.5-1.7 for body  
**Loading**: `next/font` with `font-display: swap`. Preload Archivo Black + JetBrains Mono Regular.

### Animation Patterns for Text (Awwwards-grade)

- **Headlines**: GSAP SplitText → split into chars → stagger reveal from below with `overflow: hidden` mask. Delay: 0.02s between chars. Ease: `power3.out`.
- **Body text**: Fade + translateY(20px) per paragraph on ScrollTrigger. Duration: 0.8s. Ease: `power2.out`.
- **Labels/numbers**: Opacity 0→1 with slight scale(0.95→1). Fast: 0.4s.
- **Hero name (Pretext)**: Per-character physics on Canvas — the exception to SplitText. This is the unique piece.

## Color Palette — "Kubrick Cinema"

**Philosophy**: Inspired by Stanley Kubrick's color grading — warm, psychologically intense, cinematographic. NOT the typical cold dark dev portfolio. The palette uses warm neutrals (beige text, burgundy tones) instead of clinical white-on-black. Burnt orange is the surgical accent that explodes where it matters.

**Source**: Film color grading theory. Warm burgundy creates psychological depth; burnt orange provides energy without neon; beige text is softer than pure white, creating a "film-like" reading experience.

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#1a1a1a` | Primary background — warm dark gray, not pure black |
| `--surface` | `#222222` | Cards, elevated surfaces |
| `--surface-hover` | `#2a2a2a` | Surface on hover |
| `--foreground` | `#cfbfb6` | Primary text — warm beige, NOT pure white |
| `--foreground-bright` | `#ede4df` | Emphasis text — brighter beige for headlines |
| `--muted` | `#9f5454` | Secondary text, descriptions — muted burgundy |
| `--subtle` | `#45272f` | Tertiary text, borders, section labels — deep burgundy |
| `--border` | `#2e2024` | Borders, dividers — barely visible, warm tint |
| `--accent` | `#fa4b12` | THE accent. Burnt orange. CTAs, hero glow, active states, featured borders. Surgical. |
| `--accent-dim` | `rgba(250, 75, 18, 0.15)` | Accent at low opacity for glows, backgrounds |
| `--destructive` | `#ef4444` | Errors only |

**Rules**:
- Warm palette throughout. No clinical white. No cold grays. Everything has a subtle warm tint.
- Burnt orange accent appears in max ~5% of the visual surface area.
- Burgundy tones (#45272f, #9f5454) create depth as mid-tones — they're NOT accents, they're the fabric of the site.
- Hover states use brightness shifts within the warm range.
- The overall impression should feel like a film still, not a code editor.
- When `--accent` (burnt orange) appears, it MEANS something: interactive, active, important.

---

## Verification Plan

### Development Testing
1. `pnpm dev` — verify each section renders correctly
2. Test scroll animations end-to-end (hero → about → projects → skills)
3. Test hero text physics — cursor interaction, spring return, mobile touch
4. Test deck scroll/drag — card fanning, active state, FLIP transition
5. Test skill orbits — animation, hover pause, tooltip
6. Test header morph — particles compress to nav smoothly
7. Test audio — mute toggle, fade-in, SFX triggers

### Cross-device
- Desktop: Chrome, Firefox, Safari
- Mobile: iOS Safari, Android Chrome
- Test with CPU throttling (4x slowdown)
- Test `prefers-reduced-motion: reduce`

### Performance
- Lighthouse score target: 90+ on Performance
- No layout shifts (CLS = 0)
- First Contentful Paint < 1.5s
- Canvas FPS: consistent 60fps on mid-range devices

### Build
- `pnpm build` — no TypeScript errors
- `pnpm lint` — no ESLint warnings
- No `any` types
