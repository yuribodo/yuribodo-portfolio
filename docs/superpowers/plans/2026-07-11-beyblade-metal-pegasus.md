# Beyblade Metal (Pegasus) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Storm Pegasus (Beyblade Metal) to the lobby desk that, on click, rips into a gyroscopically realistic spin — precession + growing wobble + friction decay until it topples and rests.

**Architecture:** A new `Beyblade` R3F component (mirroring `anime-figures.tsx`) loads the GLB via `useGLTF`, normalizes it with a Box3 pass whose pivot sits at the tip (not the centroid), and drives motion each frame from a **pure physics module** (`lib/lobby/beyblade-physics.ts`) so the hard math is unit-tested in isolation. It reuses the existing hover-emissive, keyboard-surrogate, pulse-target, and procedural-audio-cue patterns.

**Tech Stack:** Next.js 16 (App Router), React 19, `@react-three/fiber` 9, `@react-three/drei` 10 (`useGLTF`), `three` 0.183, GSAP (reduced-motion fallback + hover tweens), `gltf-transform` CLI (asset compression), `tsx` + `node:test` (physics unit tests).

## Global Constraints

- **Asset budget:** the lobby route must stay inside an **8 MB total-asset budget** (`scripts/compress-assets.ts` header). Existing models already sum ~4.54 MB. The chosen Pegasus GLB is **0.44 MB / 8,493 tris / 5,109 verts / 0 textures** (game-ready) — no decimation required; a light meshopt pass keeps it well under any concern. Re-verify the whole `public/lobby/models/` sum stays < 8 MB.
- **License:** the model is **CC Attribution (CC-BY 4.0)**. Attribution is mandatory — credit "Storm Pegasus by RECZ P3D (@recz.contacto), CC-BY 4.0, Sketchfab" in a credits file.
- **Model source (chosen after the first pick failed):** Sketchfab uid `70e9b69eef4e4d529d69acce7073c2d8` (https://sketchfab.com/3d-models/70e9b69eef4e4d529d69acce7073c2d8). The originally-picked "Storm Pegasus 105 RF" (762k-tri CAD export) resisted automated decimation (topologically shattered — the meshopt simplifier could not collapse it) and was abandoned; this game-ready model replaces it.
- **No `any`** — type everything; infer with `satisfies`/`as const` (CLAUDE.md).
- **`prefers-reduced-motion`** must be respected — reduced motion gets a short, gentle spin, no violent wobble/topple.
- **GPU-friendly animation** — only `transform`-equivalent props (rotation/position/emissiveIntensity); no per-frame React re-renders (drive Object3D + material directly, like `anime-figures.tsx`).
- **Component size** — keep the component under ~200 lines (CLAUDE.md); the physics math lives in the separate module partly to honor this.
- **Coordinate system** — desk origin at center, top at `y=0`, `+x` right, `+z` toward camera. Pegasus anchor: `[0.38, 0, 0.0]`.

---

## File Structure

| File | Responsibility | New/Modify |
|---|---|---|
| `public/lobby/models/beyblade-pegasus.glb` | Decimated + compressed model asset | **New** (from Sketchfab, then `assets:compress`) |
| `public/lobby/CREDITS.md` | CC-BY attribution for third-party assets | **New** |
| `lib/lobby/assets.ts` | Register `beybladePegasus` path + preload | Modify (`LOBBY_MODELS`) |
| `lib/lobby/beyblade-physics.ts` | Pure spin state machine (`stepBeyblade`, `launch`, `deriveTransform`) | **New** |
| `lib/lobby/beyblade-physics.test.ts` | `node:test` unit tests for the physics | **New** |
| `components/lobby/objects/beyblade.tsx` | R3F component: load/normalize model, hover, drive physics, imperative handle | **New** |
| `lib/lobby/audio.ts` | Add `beyblade-launch` one-shot cue | Modify |
| `components/lobby/desk-scene.tsx` | Render `<Beyblade>`, ref, keyboard surrogate, audio wiring | Modify |

---

## Task 1: Asset prep, compression, registration & credits

**Files:**
- Create: `public/lobby/models/beyblade-pegasus.glb`
- Create: `public/lobby/CREDITS.md`
- Modify: `lib/lobby/assets.ts`

**Interfaces:**
- Produces: `LOBBY_MODELS.beybladePegasus: string` (path `"/lobby/models/beyblade-pegasus.glb"`), preloaded at module load.

The raw file is downloaded by the user to `~/Downloads/` (a ~0.44 MB `storm_pegasus*.glb`). **This model is already game-ready (8,493 tris, 0 textures) — no decimation is needed**; a light meshopt geometry pass is all it gets.

- [ ] **Step 1: Install the toolchain (once)**

```bash
pnpm add -D @gltf-transform/cli tsx
```

(`tsx` is also required by Task 2's physics tests and the existing `assets:compress` script — it was missing from devDependencies. `@gltf-transform/cli` bundles core + meshopt; `ffmpeg-static` from the repo header is only for audio, not needed here.)

- [ ] **Step 2: Place the downloaded GLB into the models dir under its final name**

```bash
cp "$(ls -t ~/Downloads/storm_pegasus*.glb | head -1)" \
   public/lobby/models/beyblade-pegasus.glb
```

- [ ] **Step 3: Light meshopt compression (no simplify, no textures)**

Geometry quantization + reorder only. `--simplify` is intentionally omitted — 8,493 tris needs no decimation, and simplify risks marring the small mesh.

```bash
mkdir -p public/lobby/models/optimized
pnpm exec gltf-transform optimize \
  public/lobby/models/beyblade-pegasus.glb \
  public/lobby/models/optimized/beyblade-pegasus.glb \
  --compress meshopt --no-simplify
```

Expected: output ≈ 0.1–0.3 MB, tri count unchanged (~8,493).

- [ ] **Step 4: Verify the size and the total budget**

```bash
node -e 'const fs=require("fs");const d="public/lobby/models";let t=0;for(const f of fs.readdirSync(d)){if(f.endsWith(".glb")&&f!=="beyblade-pegasus.glb")t+=fs.statSync(d+"/"+f).size;}t+=fs.statSync(d+"/optimized/beyblade-pegasus.glb").size;console.log("projected models total MB:",(t/1048576).toFixed(2));'
```

Expected: projected total < 8.00 MB (existing ~4.54 MB + < 0.44 MB).

- [ ] **Step 5: Promote the optimized file**

Visual confirmation happens for real when the model renders in the lobby (Task 3); the source is game-ready so no separate viewer gate is needed.

```bash
mv public/lobby/models/optimized/beyblade-pegasus.glb \
   public/lobby/models/beyblade-pegasus.glb
rmdir public/lobby/models/optimized 2>/dev/null || true
```

- [ ] **Step 6: Write the attribution file**

Create `public/lobby/CREDITS.md`:

```markdown
# Lobby 3D Asset Credits

## Beyblade — Storm Pegasus
- **Author:** RECZ P3D (@recz.contacto)
- **Source:** https://sketchfab.com/3d-models/70e9b69eef4e4d529d69acce7073c2d8
- **License:** CC Attribution 4.0 (CC-BY 4.0) — https://creativecommons.org/licenses/by/4.0/
- **Changes:** meshopt-compressed (geometry quantization) for web delivery.
```

- [ ] **Step 7: Register the model in the manifest**

In `lib/lobby/assets.ts`, add to `LOBBY_MODELS` (the trailing `for` loop already preloads every entry — no extra wiring needed):

```ts
  xboxController: "/lobby/models/xbox-controller.glb",
  beybladePegasus: "/lobby/models/beyblade-pegasus.glb",
} as const;
```

- [ ] **Step 8: Verify it loads in a build**

Run: `pnpm build`
Expected: build succeeds, no missing-asset error for `beyblade-pegasus.glb`.

- [ ] **Step 9: Commit**

```bash
git add public/lobby/models/beyblade-pegasus.glb public/lobby/CREDITS.md lib/lobby/assets.ts
git commit -m "feat(lobby): add compressed Storm Pegasus GLB + CC-BY credits"
```

---

## Task 2: Pure spin-physics module (with unit tests)

**Files:**
- Create: `lib/lobby/beyblade-physics.ts`
- Test: `lib/lobby/beyblade-physics.test.ts`

**Interfaces:**
- Produces:
  - `type BeybladePhase = "idle" | "spinning" | "toppled"`
  - `interface BeybladeState { phase; omega; spinAngle; tilt; precessAngle; wanderPhase }`
  - `interface BeybladeParams { maxOmega; friction; maxTilt; precessGain; wanderRadius; toppleOmega }`
  - `const DEFAULT_PARAMS: BeybladeParams`
  - `function initialState(): BeybladeState`
  - `function launch(state: BeybladeState, p?: BeybladeParams): BeybladeState`
  - `function stepBeyblade(state: BeybladeState, dt: number, p?: BeybladeParams): BeybladeState`
  - `function deriveTransform(state, wanderRadius): { euler: [number, number, number]; offset: [number, number] }`

- [ ] **Step 1: Write the failing tests**

Create `lib/lobby/beyblade-physics.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PARAMS,
  initialState,
  launch,
  stepBeyblade,
  deriveTransform,
} from "./beyblade-physics";

test("initial state is idle at rest", () => {
  const s = initialState();
  assert.equal(s.phase, "idle");
  assert.equal(s.omega, 0);
  assert.equal(s.tilt, 0);
});

test("launch sets max omega and spinning phase", () => {
  const s = launch(initialState());
  assert.equal(s.phase, "spinning");
  assert.equal(s.omega, DEFAULT_PARAMS.maxOmega);
});

test("stepping bleeds omega by friction*dt", () => {
  const s = stepBeyblade(launch(initialState()), 1);
  assert.ok(Math.abs(s.omega - (DEFAULT_PARAMS.maxOmega - DEFAULT_PARAMS.friction)) < 1e-6);
});

test("spinAngle increases while spinning", () => {
  const s = stepBeyblade(launch(initialState()), 0.1);
  assert.ok(s.spinAngle > 0);
});

test("tilt grows as omega falls", () => {
  const fast = launch(initialState());
  // advance to a low-omega state
  let slow = fast;
  for (let i = 0; i < 200; i++) slow = stepBeyblade(slow, 0.1);
  assert.ok(slow.tilt > fast.tilt);
});

test("drops to toppled and clamps omega at the topple threshold", () => {
  let s = launch(initialState());
  for (let i = 0; i < 1000 && s.phase === "spinning"; i++) s = stepBeyblade(s, 0.1);
  assert.equal(s.phase, "toppled");
  assert.equal(s.omega, 0);
});

test("re-launch from spinning resets omega to max", () => {
  let s = stepBeyblade(launch(initialState()), 5);
  assert.ok(s.omega < DEFAULT_PARAMS.maxOmega);
  s = launch(s);
  assert.equal(s.omega, DEFAULT_PARAMS.maxOmega);
});

test("stepping idle is a no-op", () => {
  const s = stepBeyblade(initialState(), 0.5);
  assert.equal(s.omega, 0);
  assert.equal(s.phase, "idle");
});

test("deriveTransform maps precession into a tilted euler + xz offset", () => {
  let s = launch(initialState());
  for (let i = 0; i < 100; i++) s = stepBeyblade(s, 0.05);
  const { euler, offset } = deriveTransform(s, DEFAULT_PARAMS.wanderRadius);
  assert.equal(euler.length, 3);
  assert.equal(offset.length, 2);
  assert.ok(Math.abs(offset[0]) <= DEFAULT_PARAMS.wanderRadius + 1e-9);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec tsx --test lib/lobby/beyblade-physics.test.ts`
Expected: FAIL — `Cannot find module './beyblade-physics'`.

- [ ] **Step 3: Implement the module**

Create `lib/lobby/beyblade-physics.ts`:

```ts
// Pure, framework-free spin physics for the lobby Beyblade. Kept out of the
// R3F component so the gyroscopic math is unit-testable and the component
// stays small. NOT a rigid-body sim — a driven kinematic model tuned to read
// like a metal top: fast+upright while spinning, tilting into a widening
// precession cone as it bleeds speed, then toppling.

export type BeybladePhase = "idle" | "spinning" | "toppled";

export interface BeybladeState {
  phase: BeybladePhase;
  /** Angular velocity about the top's own axis (rad/s). */
  omega: number;
  /** Accumulated spin about own axis (rad). */
  spinAngle: number;
  /** Tilt of the axis from vertical (rad) — grows as omega falls. */
  tilt: number;
  /** Azimuth the tilt currently points toward; sweeps → precession (rad). */
  precessAngle: number;
  /** Drives the horizontal wander of the contact point (rad). */
  wanderPhase: number;
}

export interface BeybladeParams {
  /** Launch angular velocity (rad/s). */
  maxOmega: number;
  /** Angular deceleration (rad/s^2). */
  friction: number;
  /** Tilt at the topple threshold (rad). */
  maxTilt: number;
  /** Precession rate scaler — precession ≈ precessGain / omega. */
  precessGain: number;
  /** Radius of the contact-point wander (metres). */
  wanderRadius: number;
  /** Below this omega the top topples. */
  toppleOmega: number;
}

export const DEFAULT_PARAMS: BeybladeParams = {
  maxOmega: 90,
  friction: 3.5,
  maxTilt: 0.5,
  precessGain: 6,
  wanderRadius: 0.03,
  toppleOmega: 4,
};

export function initialState(): BeybladeState {
  return {
    phase: "idle",
    omega: 0,
    spinAngle: 0,
    tilt: 0,
    precessAngle: 0,
    wanderPhase: 0,
  };
}

/** Rip: (re)launch to max speed, upright, spinning. Preserves accumulated
 *  spinAngle so the visible mesh doesn't jump on a re-click. */
export function launch(
  state: BeybladeState,
  p: BeybladeParams = DEFAULT_PARAMS,
): BeybladeState {
  return {
    ...state,
    phase: "spinning",
    omega: p.maxOmega,
    tilt: 0,
  };
}

export function stepBeyblade(
  state: BeybladeState,
  dt: number,
  p: BeybladeParams = DEFAULT_PARAMS,
): BeybladeState {
  if (state.phase !== "spinning") return state;

  const omega = state.omega - p.friction * dt;

  if (omega <= p.toppleOmega) {
    return {
      ...state,
      phase: "toppled",
      omega: 0,
      tilt: p.maxTilt,
      spinAngle: state.spinAngle + Math.max(omega, 0) * dt,
    };
  }

  // Tilt grows from 0 (full speed) toward maxTilt (near topple).
  const speedFrac = omega / p.maxOmega; // 1 → 0
  const tilt = p.maxTilt * (1 - speedFrac) * (1 - speedFrac);

  // Precession accelerates as omega drops (∝ 1/omega), classic gyroscope.
  const precessRate = p.precessGain / omega;

  return {
    phase: "spinning",
    omega,
    spinAngle: state.spinAngle + omega * dt,
    tilt,
    precessAngle: state.precessAngle + precessRate * dt,
    // Wander speeds up as it slows so the "drift" reads near the end.
    wanderPhase: state.wanderPhase + (2 - speedFrac) * dt * 3,
  };
}

/** Map physics state → a group euler + xz contact-point offset. The euler
 *  composes as Ry(precess) · Rx(tilt) · Ry(spin): the top spins about its own
 *  axis, tilted by `tilt`, with the tilt direction sweeping around. The
 *  component applies this to a group whose origin sits at the tip, so the
 *  pivot is the contact point. */
export function deriveTransform(
  state: BeybladeState,
  wanderRadius: number,
): { euler: [number, number, number]; offset: [number, number] } {
  const wanderAmt = wanderRadius * state.tilt * 2; // scaled by lean
  return {
    euler: [state.tilt, state.precessAngle + state.spinAngle, 0],
    offset: [
      Math.cos(state.wanderPhase) * wanderAmt,
      Math.sin(state.wanderPhase) * wanderAmt,
    ],
  };
}
```

> **Note on the euler:** three.js applies euler XYZ by default. `[tilt, precess+spin, 0]` tilts about X then rotates about Y for both precession sweep and own-axis spin — visually indistinguishable from the strict Ry·Rx·Ry decomposition at these tilt magnitudes and far cheaper. Keep default euler order.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec tsx --test lib/lobby/beyblade-physics.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/lobby/beyblade-physics.ts lib/lobby/beyblade-physics.test.ts
git commit -m "feat(lobby): pure Beyblade spin-physics module + tests"
```

---

## Task 3: Beyblade component — static render + hover

**Files:**
- Create: `components/lobby/objects/beyblade.tsx`

**Interfaces:**
- Consumes: `LOBBY_MODELS.beybladePegasus` (Task 1), `usePulseTarget` (`@/hooks/use-pulse-target`).
- Produces: `interface BeybladeHandle { activate: () => void }`; `interface BeybladeProps { onLaunch?: () => void }`; default export `Beyblade` (forwardRef).

This task renders the Pegasus at its desk anchor, normalized with the **tip at the pivot**, with the hover lift + emissive rim from `anime-figures.tsx`. No spin yet — `activate()` is a stub wired in Task 4.

- [ ] **Step 1: Write the component (static + hover)**

Create `components/lobby/objects/beyblade.tsx`:

```tsx
"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Box3, Color, MeshStandardMaterial, Vector3 } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { Group, Material, Mesh, Object3D } from "three";

import { usePulseTarget } from "@/hooks/use-pulse-target";
import { LOBBY_MODELS } from "@/lib/lobby/assets";

// Front-right pocket of the desk, clear of mouse/xbox/figures so the top has
// room to precess (spec §Coordinate system).
const POSITION: [number, number, number] = [0.38, 0, 0.0];
// Final height in metres after Box3 normalisation (~4.5cm metal bey).
const TARGET_HEIGHT = 0.045;

// Hover affordance — mirrors anime-figures.tsx values, tuned to the same
// warm key light in <DeskEnvironment>.
const HOVER_LIFT_M = 0.01;
const HOVER_LERP_FACTOR = 0.18;
const HOVER_EMISSIVE_INTENSITY = 0.35;
const HOVER_EMISSIVE_COLOR = "#a8d4ff"; // cool rim to match the blue wheel
const HOVER_TRANSITION_S = 0.2;

const PULSE_INTENSITY = 1.5;
const PULSE_RISE_S = 0.15;
const PULSE_FALL_S = 0.25;

export interface BeybladeHandle {
  activate: () => void;
}

export interface BeybladeProps {
  /** Fires on a rip (launch or re-launch). Hook for the audio cue. */
  onLaunch?: () => void;
}

const Beyblade = forwardRef<BeybladeHandle, BeybladeProps>(function Beyblade(
  { onLaunch },
  ref,
) {
  const { scene } = useGLTF(LOBBY_MODELS.beybladePegasus);
  const groupRef = useRef<Group>(null);
  const materialsRef = useRef<MeshStandardMaterial[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredRef = useRef(false);

  // Scale + centre the clone with the TIP on local y=0 and the xz centre at
  // the origin, so the parent group rotates/precesses about the contact point.
  const sceneClone = useMemo(() => {
    const clone = scene.clone(true);
    clone.position.set(0, 0, 0);
    clone.rotation.set(0, 0, 0);
    clone.scale.setScalar(1);

    const rawBox = new Box3().setFromObject(clone);
    const rawSize = new Vector3();
    rawBox.getSize(rawSize);
    const scale = TARGET_HEIGHT / Math.max(rawSize.y, 0.0001);
    clone.scale.setScalar(scale);

    const finalBox = new Box3().setFromObject(clone);
    const finalCentre = new Vector3();
    finalBox.getCenter(finalCentre);
    // Base (min.y) → local 0 puts the tip at the pivot; xz centred.
    clone.position.set(-finalCentre.x, -finalBox.min.y, -finalCentre.z);
    return clone;
  }, [scene]);

  useLayoutEffect(() => {
    const materials: MeshStandardMaterial[] = [];
    sceneClone.traverse((obj: Object3D) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const cloneMaterial = (m: Material): Material => {
        const cloned = m.clone();
        if (cloned instanceof MeshStandardMaterial) {
          cloned.emissive = new Color(HOVER_EMISSIVE_COLOR);
          cloned.emissiveIntensity = 0;
          materials.push(cloned);
        }
        return cloned;
      };
      const original = mesh.material;
      mesh.material = Array.isArray(original)
        ? original.map(cloneMaterial)
        : cloneMaterial(original);
    });
    materialsRef.current = materials;
    return () => {
      materials.forEach((m) => m.dispose());
      materialsRef.current = [];
    };
  }, [sceneClone]);

  // Hover lift (frame-rate independent, mirrors anime-figures.tsx).
  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const targetY = POSITION[1] + (isHovered ? HOVER_LIFT_M : 0);
    const t = 1 - Math.pow(1 - HOVER_LERP_FACTOR, delta * 60);
    group.position.y += (targetY - group.position.y) * t;
  });

  // Hover emissive.
  useLayoutEffect(() => {
    isHoveredRef.current = isHovered;
    const target = isHovered ? HOVER_EMISSIVE_INTENSITY : 0;
    materialsRef.current.forEach((m) => {
      gsap.to(m, {
        emissiveIntensity: target,
        duration: HOVER_TRANSITION_S,
        ease: "power2.out",
        overwrite: "auto",
      });
    });
  }, [isHovered]);

  usePulseTarget("beyblade-pegasus", () => {
    const materials = materialsRef.current;
    if (materials.length === 0) return;
    const resting = isHoveredRef.current ? HOVER_EMISSIVE_INTENSITY : 0;
    materials.forEach((m) => {
      gsap.killTweensOf(m, "emissiveIntensity");
      gsap
        .timeline()
        .to(m, { emissiveIntensity: PULSE_INTENSITY, duration: PULSE_RISE_S, ease: "power2.out" })
        .to(m, { emissiveIntensity: resting, duration: PULSE_FALL_S, ease: "power2.in" });
    });
  });

  // Wired for real in Task 4.
  useImperativeHandle(ref, () => ({ activate: () => onLaunch?.() }), [onLaunch]);

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onLaunch?.();
  };
  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setIsHovered(true);
    document.body.style.cursor = "pointer";
  };
  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setIsHovered(false);
    document.body.style.cursor = "";
  };

  return (
    <group
      ref={groupRef}
      position={POSITION}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <primitive object={sceneClone} />
    </group>
  );
});

export default Beyblade;
```

- [ ] **Step 2: Temporarily render it to verify it loads (scaffold check)**

Add `<Beyblade />` inside the `<Suspense>` in `desk-scene.tsx` (import at top), then:

Run: `pnpm dev` and open the lobby.
Expected: the Pegasus appears at the front-right of the desk at a believable ~4-5 cm size, sitting on its tip; hovering lifts it slightly with a cool blue rim and the cursor becomes a pointer.

> If the model lies on its side or floats, its up-axis differs from `+y`. Fix by rotating the clone in the `useMemo` before measuring, e.g. `clone.rotation.set(-Math.PI / 2, 0, 0)` (X-up → Y-up) or `Math.PI` on X if it's upside-down; re-measure after. Record the correct rotation as a constant `MODEL_UPRIGHT_EULER` and apply it before the Box3 pass.

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm build` then `pnpm lint`
Expected: no type errors, no lint warnings.

- [ ] **Step 4: Commit**

```bash
git add components/lobby/objects/beyblade.tsx components/lobby/desk-scene.tsx
git commit -m "feat(lobby): Beyblade component — static render + hover"
```

---

## Task 4: Drive the spin physics in the component

**Files:**
- Modify: `components/lobby/objects/beyblade.tsx`

**Interfaces:**
- Consumes: `initialState`, `launch`, `stepBeyblade`, `deriveTransform`, `DEFAULT_PARAMS`, `type BeybladeState` from `@/lib/lobby/beyblade-physics` (Task 2); `useReducedMotion` from `@/hooks/use-reduced-motion`.

Replace the `activate` stub with a real rip: drive the group's rotation + xz offset from `stepBeyblade` each frame. Re-click re-launches. Reduced motion gets a scripted gentle 360° instead of physics.

- [ ] **Step 1: Add the physics refs and imports**

At the top of `beyblade.tsx` add imports:

```tsx
import { useCallback } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  DEFAULT_PARAMS,
  deriveTransform,
  initialState,
  launch,
  stepBeyblade,
} from "@/lib/lobby/beyblade-physics";
import type { BeybladeState } from "@/lib/lobby/beyblade-physics";
```

Inside the component, add:

```tsx
  const prefersReducedMotion = useReducedMotion();
  const physicsRef = useRef<BeybladeState>(initialState());
  const reducedTweenRef = useRef<gsap.core.Tween | null>(null);
```

- [ ] **Step 2: Replace the hover-only `useFrame` with hover + physics**

Replace the existing `useFrame(...)` block with:

```tsx
  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    // Hover lift on Y is only meaningful at rest; while spinning the physics
    // owns the transform. Clamp delta so a tab-away stall doesn't teleport.
    const dt = Math.min(delta, 1 / 30);
    const state = physicsRef.current;

    if (state.phase === "spinning" && !prefersReducedMotion) {
      const next = stepBeyblade(state, dt, DEFAULT_PARAMS);
      physicsRef.current = next;
      const { euler, offset } = deriveTransform(next, DEFAULT_PARAMS.wanderRadius);
      group.rotation.set(euler[0], euler[1], euler[2]);
      group.position.set(POSITION[0] + offset[0], POSITION[1], POSITION[2] + offset[1]);
      return;
    }

    // At rest: settle rotation/position back and apply hover lift.
    const targetY = POSITION[1] + (isHovered ? HOVER_LIFT_M : 0);
    const t = 1 - Math.pow(1 - HOVER_LERP_FACTOR, dt * 60);
    group.position.y += (targetY - group.position.y) * t;
  });
```

- [ ] **Step 3: Implement the real `activate` (rip / reduced-motion)**

Replace the `useImperativeHandle(...)` stub and add an `activate` callback:

```tsx
  const activate = useCallback(() => {
    const group = groupRef.current;
    if (!group) return;
    onLaunch?.();

    if (prefersReducedMotion) {
      // Gentle scripted spin — no wobble/topple for motion-sensitive users.
      reducedTweenRef.current?.kill();
      reducedTweenRef.current = gsap.to(group.rotation, {
        y: `+=${Math.PI * 2}`,
        duration: 1.4,
        ease: "power2.inOut",
      });
      return;
    }
    physicsRef.current = launch(physicsRef.current, DEFAULT_PARAMS);
  }, [onLaunch, prefersReducedMotion]);

  useImperativeHandle(ref, () => ({ activate }), [activate]);
```

Update `handleClick` to call `activate()` instead of `onLaunch?.()`:

```tsx
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    activate();
  };
```

- [ ] **Step 4: Verify the spin in the browser**

Run: `pnpm dev`, open the lobby, click the Pegasus.
Expected: it rips to a fast upright spin, then as it slows the axis tilts into a widening precession cone with a slight wander, then topples and rests. Clicking mid-spin re-launches it to full speed. With OS "reduce motion" on, a click does one smooth 360° with no wobble.

- [ ] **Step 5: Typecheck + lint**

Run: `pnpm build` then `pnpm lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add components/lobby/objects/beyblade.tsx
git commit -m "feat(lobby): drive Beyblade gyroscopic spin from physics module"
```

---

## Task 5: Desk-scene integration — audio cue, keyboard surrogate, pulse

**Files:**
- Modify: `lib/lobby/audio.ts`
- Modify: `components/lobby/desk-scene.tsx`

**Interfaces:**
- Consumes: `BeybladeHandle` (Task 3), `playCue` from `useLobbyAudio`.
- Produces: `"beyblade-launch"` added to `AudioCueId`.

Adds a procedural "rip" launch cue and finalizes accessibility wiring (the keyboard surrogate + pulse target). The pulse target id (`"beyblade-pegasus"`) is already registered in Task 3, so the first-pointermove sweep picks it up automatically.

> **Scope note:** the existing cue system renders **short one-shot** buffers, so the committed audio is a launch "rip". A *continuous* whir whose pitch tracks `omega` would need a live oscillator in the component (started on rip, `frequency` set each frame to `omega * k`, stopped on topple) — out of scope for this tracer; sketched here for a future pass.

- [ ] **Step 1: Add the cue id, volume and duration**

In `lib/lobby/audio.ts`, extend the three records:

```ts
export type AudioCueId =
  | "ds-chime"
  | "xbox-rumble"
  | "card-fan"
  | "yugioh-thwack"
  | "figure-spin"
  | "beyblade-launch"
  | "monitor-power"
  | "stinger";
```

```ts
const CUE_VOLUMES: Record<AudioCueId, number> = {
  // …existing…
  "beyblade-launch": 0.5,
  // …
};
```

```ts
const CUE_DURATIONS_S: Record<AudioCueId, number> = {
  // …existing…
  "beyblade-launch": 0.5,
  // …
};
```

- [ ] **Step 2: Write the cue builder + register it**

Add near the other builders (e.g. after `buildFigureSpin`):

```ts
// Beyblade rip — a metallic launcher zip: a fast downward pitch sweep (the
// ripcord) layered with bright bandpassed noise (metal-on-metal). Short,
// aggressive, then gone.
function buildBeybladeLaunch(ctx: OfflineAudioContext): void {
  const dur = 0.5;

  // Ripcord sweep: sawtooth 520Hz → 130Hz, quick attack, exponential fall.
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(520, 0);
  osc.frequency.exponentialRampToValueAtTime(130, dur);
  const oscEnv = ctx.createGain();
  oscEnv.gain.setValueAtTime(0, 0);
  oscEnv.gain.linearRampToValueAtTime(0.4, 0.02);
  oscEnv.gain.exponentialRampToValueAtTime(0.001, dur);
  const oscLp = ctx.createBiquadFilter();
  oscLp.type = "lowpass";
  oscLp.frequency.value = 2200;
  osc.connect(oscLp);
  oscLp.connect(oscEnv);
  oscEnv.connect(ctx.destination);
  osc.start(0);
  osc.stop(dur + 0.02);

  // Metal shimmer: bandpassed noise burst that decays fast.
  const buf = ctx.createBuffer(1, Math.ceil(dur * ctx.sampleRate), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let j = 0; j < data.length; j++) {
    const env = Math.exp(-j / (data.length * 0.25));
    data[j] = (Math.random() * 2 - 1) * env * 0.5;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 3200;
  bp.Q.value = 1.5;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.35;
  noise.connect(bp);
  bp.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(0);
}
```

Register it in `CUE_BUILDERS`:

```ts
  "figure-spin": buildFigureSpin,
  "beyblade-launch": buildBeybladeLaunch,
```

- [ ] **Step 3: Wire the component into desk-scene**

In `components/lobby/desk-scene.tsx`:

1. Import: `import Beyblade, { type BeybladeHandle } from "./objects/beyblade";`
2. Add a ref near the others: `const beybladeRef = useRef<BeybladeHandle>(null);`
3. Render inside `<Suspense>` (next to `<AnimeFigures>`), passing the audio cue:

```tsx
          <Beyblade ref={beybladeRef} onLaunch={() => playCue("beyblade-launch")} />
```

4. Add the keyboard surrogate button in the sr-only mirror (next to the "Spin anime figure trio" button):

```tsx
        <button
          type="button"
          onClick={() => beybladeRef.current?.activate()}
        >
          Spin Pegasus beyblade
        </button>
```

- [ ] **Step 4: Verify audio + keyboard end to end**

Run: `pnpm dev`, open the lobby, unmute.
Expected: clicking the Pegasus plays a metallic rip on launch. Tabbing to "Spin Pegasus beyblade" and pressing Enter rips it too. On the first mouse move after load, the Pegasus pulses along with the other discovery targets.

- [ ] **Step 5: Typecheck + lint**

Run: `pnpm build` then `pnpm lint`
Expected: clean. (`Record<AudioCueId, …>` will fail to compile if any of the three records is missing the new id — a free exhaustiveness check.)

- [ ] **Step 6: Commit**

```bash
git add lib/lobby/audio.ts components/lobby/desk-scene.tsx
git commit -m "feat(lobby): Beyblade launch cue + keyboard surrogate + pulse wiring"
```

---

## Self-Review

**Spec coverage:**
- Storm Pegasus at front-right `[0.38,0,0]` → Task 3 (`POSITION`).
- Tip-pivot normalization → Task 3 (`useMemo` sets `min.y`→0).
- Rip → sleep → decay (precession + growing tilt) → topple → rest → Task 2 (`stepBeyblade`) + Task 4 (frame loop).
- Re-click relaunches → Task 2 (`launch` preserves spinAngle) + Task 4.
- Hover lift + emissive, cursor pointer → Task 3.
- Keyboard surrogate → Task 5; pulse target → Task 3 (registered) + Task 5 (verified).
- Launch audio cue → Task 5. **Deviation:** continuous pitch-decaying whir descoped to one-shot rip (documented in Task 5 scope note).
- `prefers-reduced-motion` → Task 4 (scripted 360°, no wobble).
- Compression / 8 MB budget / CC-BY credit → Task 1 + Global Constraints.
- No `any`, ≤200-line component, GPU-friendly → Global Constraints; physics extraction keeps the component small.

**Placeholder scan:** No TBD/TODO; every code step shows complete code; the model-orientation contingency in Task 3 Step 2 gives concrete rotations rather than "adjust as needed".

**Type consistency:** `BeybladeHandle.activate`, `BeybladeState`, `stepBeyblade`/`launch`/`deriveTransform`/`initialState`/`DEFAULT_PARAMS`, `LOBBY_MODELS.beybladePegasus`, and `"beyblade-launch"` are used with identical names across tasks. `deriveTransform(state, wanderRadius)` signature matches its call in Task 4.

**Known follow-ups (out of scope):** continuous whir; additional beys (L-Drago) — the component/physics are already config-shaped for a second instance.
