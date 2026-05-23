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

> **History note (2026-05-23):** This section was originally written assuming a 3/4 isometric camera at `(0, 4, 5)` FOV 35°. During issue #18 implementation, the framing pivoted to a **seated first-person POV** because the isometric direction read as "render showcase" rather than personal space. The original 3/4 values are preserved at the bottom of this section as a historical reference. Treat the seated POV values below as authoritative for issues #8 onwards.

### Camera (current, seated POV)

| Property | Value |
|---|---|
| Position | `(0, 0.4, 1.9)` — sitting at the desk, eyes ~40cm above surface, ~1.9m back from desk origin |
| Look-at | `(0, 0, 0)` — desk center (slight downward angle, ~12°) |
| FOV | 50° (natural, not wide) |
| Parallax drift | ±0.15 units on mouse, lerp 0.1 — tighter than original because closer camera amplifies movement |

The reduced height + closer distance means objects appear **much larger** in frame than the original isometric framing implied. Foreground objects (keyboard, mouse) may be partially cropped at the bottom edge — this is intentional and reads as "you're sitting here."

### Layout (seated POV, top-down map)

Desk dimensions: ~1.6m × 0.8m, top surface at `y = 0`. Coordinates in meters: `x` horizontal (negative = left), `z` depth (negative = away from camera, positive = toward camera).

```
                    BACK (z < 0)
   ┌─────────────────────────────────────────────────┐
   │              [Decks: Pokémon + YGO]             │  z = -0.30
   │      [MacBook]   [MONITOR]   [Figures × 3]      │  z = -0.15
   │       (closed)    (hero)                        │  z = -0.05
   │                                                 │
   │   [Nintendo DS]                  [Mousepad]     │  z = +0.10
   │     (closed)     [BlackWidow]    + [Mouse]      │  z = +0.20
   │                                  [Xbox ctrl]    │  z = +0.30
   └─────────────────────────────────────────────────┘
        x=-0.6    x=-0.2   x=0   x=+0.2     x=+0.6
                          ↑
                    CAMERA (0, 0.4, 1.9)
                  FRONT (z > 0, toward viewer)
```

### Object positions (target coordinates)

| Object | x | z | y (above desk) | Zone | Notes |
|---|---|---|---|---|---|
| **Monitor** | 0 | -0.40 | stand height | back-center | hero, dominant in frame. Shipped in #7. |
| **Razer BlackWidow** | -0.10 | +0.20 | 0 | foreground-center | second heaviest visual weight; visitor's hands area |
| **Razer DeathAdder** | +0.25 | +0.22 | ~0.005 | foreground-right | rests on mousepad |
| **Mousepad** | +0.20 | +0.20 | ~0.002 | foreground-right | base for mouse; ~0.3m × 0.25m |
| **MacBook (closed)** | -0.50 | -0.10 | 0 | mid-left | lateral, slightly back, doesn't compete with monitor |
| **Anime figures × 3** | +0.45 | -0.30 | 0 | back-right | clustered or fanned; human scale reference next to monitor |
| **Nintendo DS (closed)** | -0.40 | +0.15 | 0 | mid-left-front | casual, near MacBook (the "portables" grouping) |
| **Xbox controller** | +0.45 | +0.30 | 0 | foreground-right | beside mouse, casual placement |
| **Pokémon + Yu-Gi-Oh decks** | -0.10 | -0.20 | 0 | mid-back-center | small; placed in the visual gap between keyboard and monitor to fill empty space |

Tolerance: ±0.05m on each coordinate is fine — these are target values, not exact constraints. Visual coherence matters more than literal positions.

### Layout principles

- **Visual hierarchy**: monitor (hero) > keyboard + mouse (mid-weight, foreground) > everything else (accents)
- **Side balance**: MacBook + DS on the left; figures + Xbox + decks on the right. Asymmetric but balanced.
- **Decks placement**: small objects (≤5cm tall) need to sit in the **visual gap** between keyboard and monitor — otherwise they get lost. Don't push them to the front-edge.
- **Foreground gets surface detail**: peripherals near camera (keyboard, mouse) show their textures, RGB, and keycaps prominently. Worth higher poly budget.
- **No photoshoot symmetry**: the desk feels lived-in. Slight rotation on the MacBook (~5° off-axis), DS slightly angled toward camera, figures not perfectly lined up.

### Lighting

- Key light: warm (~3000K), upper-right, simulating desk lamp (already in `<DeskEnvironment>` from #18)
- Fill: cool (~6500K), low intensity, simulating window ambient (already in #18)
- Rim: behind monitor, separates silhouette
- HDRi: `<Environment background={false}>` from drei (#18) — IBL reflections only
- Shadows: `<ContactShadows>` from drei (#18) — not dynamic shadow maps (performance)

### Atmospheric layer

Dust motes via `Sprite` instances with noise displacement. ~50 particles, very low alpha. Separates "asset marketplace render" from "feels real." Deferred to polish phase (#16).

### Historical reference: original 3/4 isometric framing (rejected)

For posterity / context only. **Do not use these values.**

> Original camera: position ~(0, 4, 5), elevation ~50°, FOV 35° (long lens, cinematic). Parallax drift ±0.3 units on mouse, lerp factor 0.1.
>
> Original layout was conceptual (top-down): center-rear monitor, peripherals in front, MacBook left, figures right, DS front-left, Xbox front-right, decks front-center.
>
> Rejected because the elevated angle made the scene read as a render showcase rather than a personal space the visitor is *in*.

## Set Design — Desk, Background, Floor

The 3/4 isometric framing exposes substantial area **behind** and **below** the desk. Set design isolates the desk in atmospheric darkness rather than modeling a full room — focus stays on the personal objects, asset cost stays low, and the transition into the existing site (whose `bg-background` is near-black) feels continuous.

### Desk surface

| Property | Value |
|---|---|
| Material | Dark fumed oak (PBR) |
| Base color | `#2a1f1a` (warm dark brown, slight reddish undertone) |
| Roughness | 0.7 (fosca, with subtle micro-scratches in normal map) |
| Metalness | 0.0 |
| Dimensions visible | ~1.6m × 0.8m (length × depth), thickness ~0.04m |
| Edges | Chamfered ~3mm (no perfect 90° corners) |
| Wear detail | Subtle albedo variation (light coffee ring near MacBook, faint scratches under mousepad) added via texture overlay |

The warm wood deliberately contrasts with the cool peripherals (Razer black + RGB) and the cool background fog, giving the desk plane its own thermal presence.

### Background

| Property | Value |
|---|---|
| Approach | Volumetric darkness via fog — no modeled walls |
| Fog type | `THREE.FogExp2` |
| Fog color | `#0a0a0f` (matches site `--background` for transition continuity) |
| Fog density | `0.08` (objects beyond ~3 units fade fully into darkness) |
| HDRi role | **Reflection-only**, not visible. Use `<Environment background={false}>` to apply IBL without showing the HDRi backdrop |
| Sky | None — fog absorbs everything past the desk |

### Floor

| Property | Value |
|---|---|
| Visible floor mesh | None |
| Shadow handling | `<ContactShadows>` on an invisible plane at desk-base level (y = 0) |
| Desk legs | **Optional** — if modeled, fade to fog within ~0.3m of the floor. Recommended to crop the lower legs out of frame entirely via camera elevation |
| Below-desk space | Pure fog black — reinforces "floating desk in darkness" feel |

### Implied environment (off-camera light sources)

To suggest "a room exists" without modeling one, two **invisible** point lights sit outside the frame:

1. **Warm lamp** — position `(2.5, 2, 1)`, color `#ffb87a` (~2700K), intensity 2.5. Off-camera right, simulates desk lamp throwing warm light onto monitor + figures
2. **Window glow** — position `(-3, 3, -2)`, color `#7090b0` (~6500K), intensity 0.8. Off-camera left-rear, simulates cool ambient leak from a window

These are in addition to the key/fill/rim of §6 — they extend the lighting story so the eye reads "this desk is in a space" even though the space itself is fog.

### Why this approach

- **Asset cost**: one desk mesh + zero room geometry. All atmosphere comes from fog + lights, which are free
- **Focus**: the personal objects become the entire visual subject; the desk is a stage, not a competing detail
- **Transition continuity**: when the dive completes and the site (`bg-background: #0a0a0f`) appears, the fog color matches — no jarring background swap
- **Tone**: aligns with Bruno Simon's lived-in isolation; rejects "showroom render" reading

## Object Inventory

| Object | Source strategy | Click action | Hover state |
|---|---|---|---|
| Monitor | Generic gaming monitor (Sketchfab) | Main action only (hold power button) | Power LED gentle pulse |
| Razer BlackWidow keyboard | Sketchfab/CGTrader (BlackWidow specifically) | RGB wave left→right across keycaps (800ms) | Faint per-key glow |
| Razer mouse | Sketchfab DeathAdder free | RGB spectrum cycle (1.5s) | LED scroll wheel intensifies |
| Mousepad | Custom plane + generic texture (no brand) | None (atmospheric) | Soft RGB spill from mouse |
| MacBook | NoXiou5 "MacBook Pro Closed" (Sketchfab) — **fused geometry, lid not separable** | Apple-logo emissive flash (200ms ramp up, 400ms ease out) + subtle 0.015u bounce | Lift 0.015u + Apple logo emissive intensifies (×3) |
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
4. **MacBook lid + code content**: ~~lid opens revealing TS code~~ — **pivoted**. The NoXiou5 model ships as a single fused mesh (lid not separable), and after evaluation we kept the lid closed rather than splitting in Blender or downloading a riskier fallback. Click interaction is now a brief Apple-logo emissive flash + small bounce — same "this is the dev's laptop" beat without faking an animation the geometry can't carry. The humorous-TS-code idea is shelved (could resurface as a floating hologram in a future polish pass, but out of scope for #9).
