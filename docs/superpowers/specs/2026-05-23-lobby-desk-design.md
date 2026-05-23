# Lobby "The Desk" — Design Spec

## Context

`yuribodo-portfolio` opens with a hero animation but jumps the visitor straight into the site. This spec replaces that cold start with a **3D PBR cinematic lobby** — Yuri's personal desk, viewed in 3/4 isometric perspective — that the visitor must explore and interact with before entering the actual portfolio.

The lobby acts as a **filter and first impression**: only visitors curious enough to discover the main action will progress. The portfolio interior (existing Hero, About, Contact) remains untouched — the lobby is a layer **before** it, not a replacement.

This spec covers the lobby experience only. The existing site (`/home/mario/yuribodo-portfolio/app/page.tsx`, sections, hero, etc.) is **not modified** beyond gating it behind the lobby on desktop.

## Design Philosophy

- **Hybrid persona** — past and present collide. A Razer setup next to a Nintendo DS. AirPods? Sketches? Anime figures. Continuity, not nostalgia stock.
- **Personal references over generic aesthetic** — every object is something Yuri actually owns or owned. The desk reads like a real desk, not a moodboard.
- **One main action, many sensory beats** — the visitor finds joy in micro-interactions, but only one gesture takes them inside: hold the monitor's power button.
- **Cinematic restraint** — high-quality PBR, but not overdesigned. The composition feels lived-in, not photographed.
- **Audio-as-presence** — never silence. Ambient bed at -28dB minimum. Spatial audio sourced from object positions.
- **Mobile is honest** — the lobby is a desktop-only feature; mobile skips directly to the existing site, by design.

## References & Stolen Ideas

| Reference | What to steal | URL |
|---|---|---|
| **Bruno Simon Portfolio** | PBR model optimization, palette UV technique, lived-in scene composition with dust motes | bruno-simon.com |
| **Sidewave** (Awwwards SOTD 2026-05-22) | Lobby-as-explorable-world concept, one main action discovery pattern | awwwards.com/sites/sidewave |
| **Press Enter to Start** (Awwwards HM) | "Wait for input before site" pattern, retro gating | awwwards.com/sites/press-enter-to-start |
| **Death Stranding** (game) | Hold-to-confirm with cancellable progress ring, drone build-up | — |
| **Monument Valley** | 3/4 isometric composition framing, hand-crafted feel in low-poly | — |
| **Return of the Obra Dinn** | Dithering aesthetic reserved for **phase 2** (portfolio interior), not the lobby | — |

## Tech Stack Additions

| Category | Package | Purpose |
|---|---|---|
| 3D Renderer | `three` | WebGL renderer |
| React Integration | `@react-three/fiber` | Declarative 3D in React |
| Helpers | `@react-three/drei` | `Environment`, `useGLTF`, `ContactShadows`, `PositionalAudio` |
| Post-processing | `@react-three/postprocessing` + `postprocessing` | Bloom, DOF, tone mapping |
| Animation | `gsap` (already installed) | Transition timelines, easing |
| Audio (optional) | `howler` (~7kb) or native Web Audio API | Spatial + ambient audio |
| Dev only | `leva` | Material/light tweaking during dev |

No changes to Next.js 16, TypeScript 5 strict, Tailwind 4, pnpm.

## File Structure

```
components/
└── lobby/
    ├── desk-scene.tsx              # client component root with <Canvas>
    ├── desk-environment.tsx        # HDRi, fog, key/fill/rim lights
    ├── camera-rig.tsx              # 3/4 camera + drift parallax + dolly transition
    ├── objects/
    │   ├── monitor.tsx             # includes power button + boot screen state
    │   ├── keyboard.tsx            # Razer
    │   ├── mouse.tsx               # Razer
    │   ├── mousepad.tsx
    │   ├── macbook.tsx
    │   ├── nintendo-ds.tsx
    │   ├── xbox-controller.tsx
    │   ├── pokemon-deck.tsx
    │   ├── yugioh-deck.tsx
    │   └── anime-figures.tsx
    ├── hold-progress.tsx           # progress ring UI around cursor
    ├── hint-tooltip.tsx            # "hold to power on" tooltip
    ├── lobby-skip-button.tsx       # skip CTA in corner (repeat visitors)
    ├── lobby-loading.tsx           # loading state while 3D bundle warms up
    ├── use-lobby-state.ts          # state machine
    └── audio/
        ├── lobby-ambient.ts        # ambient bed loop
        ├── lobby-cues.ts           # hover/click samples
        └── lobby-transition.ts     # power-on stinger + boot glyphs SFX

hooks/
└── use-lobby-visited.ts            # localStorage helper

lib/
└── lobby/
    ├── assets.ts                   # GLB paths + preload manifest
    └── transition.ts               # GSAP timeline for dive + handoff

public/
└── lobby/
    ├── models/                     # GLB files (compressed, KTX2 textures)
    └── audio/                      # ogg/opus samples
```

## State Machine

```
loading  → bundle + assets warming up, lobby-loading.tsx visible
   ↓
idle     → camera drift active, ambient bed plays, hint tooltip armed (3s timer)
   ↓
exploring → user hovered/clicked a non-monitor object; tooltip dismissed
   ↓
holding  → mouse down on power button; progress ring + drone active
   ↓ (release before complete → return to idle/exploring with 200ms cooldown)
   ↓ (complete at t=1.8s)
booting  → §6 transition timeline running (1.4s dive + 600ms handoff)
   ↓
done     → site visible; lobby unmounts after 500ms, GPU memory freed
```

## Scene Composition

**Camera**: position ~(0, 4, 5), elevation ~50°, FOV 35° (long lens, cinematic). Parallax drift ±0.3 units on mouse move, lerp factor 0.1.

**Layout** (top-down conceptual):
- **Center-rear**: Monitor (the hero — slightly elevated by stand)
- **Front of monitor**: Razer keyboard, Razer mouse, mousepad (mouse rests on mousepad)
- **Left of keyboard**: MacBook (closed)
- **Right of monitor**: Anime figures (2-3 figures, varied heights)
- **Front-left**: Nintendo DS Lite (closed)
- **Front-right**: Xbox controller
- **Front-center, scattered**: Pokémon deck, Yu-Gi-Oh deck (slightly offset, asymmetric)

The composition is intentionally **asymmetric and slightly disarranged** — desk feels lived-in, not photoshoot-perfect.

**Lighting**:
- Key light: warm (~3000K), upper-right, simulating desk lamp
- Fill: cool (~6500K), low intensity, simulating window ambient
- Rim: behind monitor, separates silhouette
- HDRi: neutral studio for material reflections (`drei`'s `Environment preset="studio"` or `"warehouse"`)
- Shadows: `ContactShadows` (not dynamic shadow maps — performance)

**Atmospheric layer**: dust motes via `Sprite` instances with noise displacement. ~50 particles, very low alpha. Separates "asset marketplace render" from "feels real."

## Object Inventory

| Object | Source strategy | Click action | Hover state |
|---|---|---|---|
| Monitor | Generic gaming monitor (Sketchfab) | Main action only (hold power button) | Power LED gentle pulse |
| Razer BlackWidow keyboard | Sketchfab/CGTrader (BlackWidow specifically) | RGB wave left→right across keycaps (800ms) | Faint per-key glow |
| Razer mouse | Sketchfab DeathAdder free | RGB spectrum cycle (1.5s) | LED scroll wheel intensifies |
| Mousepad | Custom plane + generic texture (no brand) | None (atmospheric) | Soft RGB spill from mouse |
| MacBook | Generic MacBook Pro (Sketchfab) | Lid opens (1.2s), screen shows scrolling TS code with humorous easter-egg comments for 2s, closes | Faint Apple logo glow |
| Nintendo DS | Sketchfab zombitt (PBR 4K) | Clamshell opens 1.0s, top screen shows a sprite + boot tone, closes after 2s | Power LED green dot |
| Xbox controller | Sketchfab (xbox-controller tag) | Visual shake 200ms + Xbox button LED green + button pulse | Subtle bumper highlight |
| Pokémon deck | Sketchfab Pokemon Card 3D (holo, free) | Top 3 cards fan out (10°/20°/30°), hover isolates one card face | Top card lifts 0.05u |
| Yu-Gi-Oh deck | Trading Card Pack model + re-texture | Fan out + 1 hero card rises 0.3u and slow Y-axis spin | Top card lifts |
| Anime figures (3) | Sketchfab — Minato (Naruto), Seismitoad (Pokémon), Lelouch (Code Geass) | Each rotates 360° on Y over 2s | Subtle glow ring |

**Specific anime figure choices**: Minato Namikaze + Seismitoad + Lelouch Lamperouge. Models verified available on Sketchfab (links in references).

## Main Action — Hold to Power On

**Total hold duration**: 1.8s (Death Stranding sweet spot). Cancellable.

| Phase | Duration | Visual | Audio |
|---|---|---|---|
| Idle | — | Power button pulses (opacity 0.5↔0.8, 2.5s loop); LED faint red | Ambient bed only |
| Hover | — | Pulse intensifies (1s loop), LED ×2 emissive, cursor shows hold icon | Tick cue (80ms, panned spatial) |
| Press start | 0ms | LED full red (×5 emissive), progress ring around cursor starts filling | Drone starts (40Hz, low-pass closed) |
| Press hold | 0–1.8s | Ring fills; scene ambient dims to 60%; FOV creeps 35°→33° | Drone pitch rises 40→200Hz, filter opens |
| Cancel (release early) | 300ms ease out | Ring drains; LED returns to idle; ambient restores | Drone drops |
| Complete | 100ms freeze frame | White flash (60ms) on power button; tela emissive turns black with horizontal scanline sweep top→bottom (300ms) | Power-on ping + bass drop, drone mutes abruptly |

**Implementation notes**:
- `onPointerDown` + RAF progress; `onPointerUp`/`onPointerLeave` cancel
- `Space` keyboard hold provides the same flow (a11y)
- 200ms cooldown after cancel before next hold can start
- After completion → transition timeline (§6) runs; no return to `idle` from `booting`

## Mini-Interactions (Secondary Objects)

All share: hover lift ~0.05u + rim glow + cursor pointer + hover sound cue (80ms). Click triggers the object-specific action (see Object Inventory table). Mini-interactions are **non-blocking** — multiple objects can be in animation simultaneously (figures rotating while DS is open). No mini-interaction prevents the main action.

**First-mouse-move discovery hint** ("hover sweep"): when the user first moves the mouse after lobby loads, fire a staggered pulse animation across 3-4 random objects (each pulses once with 100ms delay between). Signals "these are interactive" without text.

## Transition — Lobby → Site

**Total duration**: ~2.4s from hold complete to user landing on Hero.

| t (s) | Event |
|---|---|
| 0.00 | Hold completes; flash + ping + scanline played (§4.5) |
| 0.00–0.20 | **Pre-dive**: camera pull-back FOV 33°→36°; ambient drops to 20%; objects become silhouettes |
| 0.20–1.60 | **Dive**: camera dolly forward into monitor screen; FOV stays, distance closes; eased `power3.inOut`; duration 1.4s |
| 0.40–1.40 | **Boot glyphs** on monitor screen: green monospace text, line-by-line, blinking cursor: `> INITIALIZING…`, `> LOADING YURI BODO`, `> [████████████]`. CRT typing audio sample. |
| 1.40 | **Screen fill**: monitor's screen plane now occupies 100% of viewport |
| 1.60 | **Hero reveal**: boot glyphs fade out (200ms); existing `bg-background` color matches screen black; existing Hero canvas + entrance animations begin; soundtrack swell starts |
| 2.20 | Transition complete; user sees Hero letters falling in (existing animation) |
| 2.40 | Lobby component unmounts; Three.js context disposed |

**Critical alignment math**: the monitor screen's final on-screen size must equal the viewport. Camera Z position at t=1.6s is computed dynamically from current viewport aspect ratio and the screen mesh's local dimensions: `cameraZ = screenHeight / (2 * tan(fov / 2))`.

**Audio bridging**: drone stops at t=0; CRT typing fills 0.4–1.4s; bass swell at 1.6s leads into existing soundtrack. **Never silence.**

**Bundle preloading**: the Hero's JS+assets are warmed during `idle` (after the 3D scene is loaded). If still loading at t=1.6s, hold there with `<LobbyLoading variant="bridge">` showing a thin progress bar before continuing.

## Audio System

Layered, never silent:

1. **Ambient bed** — Loop 8s, -28dB, drone + vinyl crackle + CRT hum. Starts on first user interaction (autoplay policy).
2. **Hover/click cues** — One-shot ~80ms hover + ~200ms click per object, pitch-shifted variations from a small sample set, **spatial via `PositionalAudio`** at object position.
3. **Hold drone** — Continuous, rises 40→200Hz over hold duration; volume tied to hold progress; stops on cancel or complete.
4. **Transition stinger** — Power-on ping (~300ms) + CRT typing (during dive) + bass swell (~600ms) into existing soundtrack.
5. **Mute toggle** — Reuses existing `AudioToggle`; mute state shared across lobby/site.

**Asset budget**: < 600kb total (Opus/Ogg).

## Mobile, Accessibility & Reduced Motion

### Mobile
- Detected server-side via `headers().get('user-agent')`.
- Returns existing site directly (no `DeskScene` mount). Bundle is never downloaded on mobile.
- The lobby is **intentionally** desktop-only.

### `prefers-reduced-motion: reduce`
- Skips lobby entirely; goes directly to existing Hero.
- Optional discreet message: `"lobby disabled (reduced motion) — show anyway"` link.

### Keyboard navigation
- `Tab` cycles focusable objects (outline via post-processing selective outline).
- `Enter`/`Space` triggers the focused object's click action.
- `Space` (hold) on monitor triggers main action.
- `Esc` skips lobby.

### Screen readers
- `<Canvas>` is `role="application"` `aria-label="Interactive desk lobby"`.
- Hidden DOM mirror (`sr-only`) lists each object as a `<button>` with descriptive label: `"Power on monitor (hold Space to enter site)"`, `"Open Nintendo DS"`, etc.
- "Skip lobby" link is the first focusable element.

### Performance budgets
| Metric | Target |
|---|---|
| Lobby JS bundle (gzipped) | ≤ 250kb |
| 3D assets total (KTX2 compressed) | ≤ 8MB |
| TTI on 4G | ≤ 3s |
| Frame rate (desktop high-end) | 60fps |
| Frame rate (desktop mid-range minimum) | 30fps |
| GPU fallback | Detect old Intel HD via `WEBGL_debug_renderer_info`; skip lobby if detected |

### Repeat visitor handling
- `localStorage.lobbySeen = true` after first complete pass through transition.
- On subsequent visits: lobby renders for 1.0s then auto-boots; skip button visible immediately top-right corner.

## Phasing & Rollout

| Phase | Scope | Estimate |
|---|---|---|
| **1. Foundation** | R3F setup; state machine; camera rig; hold mechanic with placeholder cube; mobile/reduced-motion skip; repeat-visit logic | ~1 week |
| **2. Hero objects + transition** | Monitor + Razer keyboard + Razer mouse + mousepad + MacBook; lighting + HDRi; full transition timeline | ~1.5 weeks |
| **3. Mini-interactions** | DS + Xbox controller + decks + figures + hover hint sweep + tooltip | ~1.5 weeks |
| **4. Polish** | Audio (spatial + ambient + drone + stinger); perf optimization (LOD, KTX2, instancing); a11y polish; cross-browser | ~1 week |

Each phase produces a working PR mergeable to `main`. Branch: `feat/lobby-desk` with stacked PRs.

## Risks

1. **Razer 3D model quality varies** — may need to redo textures in Substance/Painter (~3-4h per object). Mitigation: validate models in week 1.
2. **WebGL flakiness on Firefox** — test early, especially post-processing.
3. **Postprocessing differs across GPUs** (Mac M1+ vs Windows discrete) — test on both; tune bloom/DOF intensity.
4. **Scope creep** — easter eggs (e.g., DS plays real Pong) are deferred to a phase-5 backlog; the spec is the contract.
5. **Anime figure specificity** — Yuri to confirm which 2-3 characters before phase 3; placeholder generic figures in phase 2.

## Out of Scope

- Modifying any existing section (`Hero`, `About`, `Contact`).
- Dithering shader on the lobby itself — reserved for **future portfolio interior shader pass**.
- DS / Xbox controller playing real games — easter egg backlog.
- Multiplayer / multi-cursor interactions.
- Multiple lobby variants / themes.

## Resolved Decisions (originally open)

1. **Anime figures**: Minato + Seismitoad + Lelouch — all confirmed available as free Sketchfab models
2. **Razer keyboard**: BlackWidow
3. **Mousepad**: generic, no brand — focus on cohesion of dark desk rather than logo
4. **MacBook code content**: humorous easter-egg TypeScript — playful comments like `// TODO: get a life`, `const sleep = false`, etc. Tone: self-aware, personal, not corporate
