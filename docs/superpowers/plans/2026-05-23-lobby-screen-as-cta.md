# Lobby — Screen as CTA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bezel power-button + hold-to-activate gate with a click-anywhere-on-the-screen CTA. Monitor lit from frame 1 showing a terminal prompt; click runs the existing boot/dive sequence.

**Architecture:** Two-mode `drawBootScreen` (`ready` shows the idle prompt, `executing` shows the existing typing reveal). Monitor screen mesh becomes the click target; `useLobbyState` collapses hold actions into one `ENTER_CLICKED`. Power-button + hold-progress + hint-tooltip + monitor-anchors are deleted.

**Tech Stack:** Next.js 16 + React 19 + TypeScript 5 + `@react-three/fiber` + `@react-three/drei` + GSAP. No test runner — verification via `pnpm lint`, `pnpm build`, and manual browser check.

**Spec:** [`docs/superpowers/specs/2026-05-23-lobby-screen-as-cta-design.md`](../specs/2026-05-23-lobby-screen-as-cta-design.md)

---

## File Plan

| File | Action | Why |
|------|--------|-----|
| `lib/lobby/boot-screen.ts` | Edit | Add `mode: "ready" \| "executing"`, new line texts |
| `components/lobby/use-lobby-state.ts` | Edit | Drop `holding` + 3 hold actions, add `ENTER_CLICKED` |
| `components/lobby/objects/monitor.tsx` | Edit | Remove LED button, screen mesh as click target, idle lit |
| `components/lobby/desk-scene.tsx` | Edit | Remove hold plumbing, single `handleEnter` |
| `components/lobby/hint-tooltip.tsx` | Delete | Tooltip removed entirely |
| `components/lobby/hold-progress.tsx` | Delete | No hold = no progress ring |
| `hooks/use-hint-tooltip.ts` | Delete | Tooltip removed |
| `hooks/use-hold-activate.ts` | Delete | No hold |
| `lib/lobby/monitor-anchors.ts` | Delete | Only consumer was the tooltip |

Order: data layer first (`boot-screen` → `use-lobby-state`), then consumers (`monitor` → `desk-scene`), then deletions once nothing imports them, then manual verification.

---

### Task 1: Boot-screen modes

**Files:**
- Modify: `lib/lobby/boot-screen.ts`

- [ ] **Step 1: Replace `lib/lobby/boot-screen.ts` with the two-mode renderer**

```ts
// CRT-style boot glyphs rendered into a CanvasTexture. Two modes:
//   - "ready":     idle prompt the user sees before clicking
//   - "executing": post-click typing reveal that runs alongside the dive (#10)

export const BOOT_CANVAS_WIDTH = 1024;
export const BOOT_CANVAS_HEIGHT = 512;

export type BootScreenMode = "ready" | "executing";

// Ready prompt: monitor is "already booted", waiting for the user to run the
// command. Last line gets the blinking cursor.
const READY_LINES = [
  "> BOOTED.",
  "> READY.",
  "",
  "yuri@portfolio:~$ ./enter",
] as const;

// Executing: the same command from the ready prompt, now followed by the
// system response. The preamble (first line) is pre-rendered; the rest
// reveals char-by-char as `progress` runs 0 → 1 (driven by dive #10).
const EXECUTING_PREAMBLE = "yuri@portfolio:~$ ./enter";
const EXECUTING_REVEAL_LINES = [
  "> EXECUTING...",
  "> LOADING YURI BODO",
  "> [████████████]",
] as const;
const EXECUTING_REVEAL_TOTAL_CHARS = EXECUTING_REVEAL_LINES.reduce(
  (acc, line) => acc + line.length,
  0,
);

const BACKGROUND = "#000000";
// Phosphor green — high enough chroma to read through the emissive map, low
// enough lightness that the CRT highlight reads as monitor glow, not paint.
const TEXT_COLOR = "#39ff7a";
const TEXT_SHADOW = "rgba(57, 255, 122, 0.45)";

const FONT_SIZE = 44;
const LINE_HEIGHT = 64;
const PADDING_X = 56;
const PADDING_Y = 72;

export interface DrawBootScreenOptions {
  mode: BootScreenMode;
  /** Used only in "executing" mode. Reveal progress in [0, 1]. */
  progress?: number;
  /** Toggle the trailing cursor block. Ready mode = prompt line; executing
   *  mode = currently-typing reveal line. */
  showCursor: boolean;
}

export function drawBootScreen(
  canvas: HTMLCanvasElement,
  { mode, progress = 0, showCursor }: DrawBootScreenOptions,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Geist Mono is loaded globally via next/font in app/layout.tsx. The
  // monospace fallback keeps the layout intact if the font hasn't loaded
  // yet when the canvas first draws.
  ctx.font = `${FONT_SIZE}px "Geist Mono", "JetBrains Mono", ui-monospace, monospace`;
  ctx.textBaseline = "top";
  ctx.fillStyle = TEXT_COLOR;
  ctx.shadowColor = TEXT_SHADOW;
  ctx.shadowBlur = 12;

  if (mode === "ready") {
    const lastIndex = READY_LINES.length - 1;
    READY_LINES.forEach((line, i) => {
      const isPromptLine = i === lastIndex;
      const text = isPromptLine && showCursor ? `${line} █` : line;
      ctx.fillText(text, PADDING_X, PADDING_Y + i * LINE_HEIGHT);
    });
    return;
  }

  // executing: preamble always visible (the command the user just ran),
  // reveal lines type out at PADDING_Y + (i+1)*LINE_HEIGHT.
  ctx.fillText(EXECUTING_PREAMBLE, PADDING_X, PADDING_Y);

  const revealedChars = Math.floor(
    Math.min(Math.max(progress, 0), 1) * EXECUTING_REVEAL_TOTAL_CHARS,
  );
  let remaining = revealedChars;
  for (let i = 0; i < EXECUTING_REVEAL_LINES.length; i++) {
    if (remaining <= 0) break;
    const line = EXECUTING_REVEAL_LINES[i];
    const charsThisLine = Math.min(line.length, remaining);
    let text = line.slice(0, charsThisLine);

    const isTypingThisLine = charsThisLine < line.length;
    if (isTypingThisLine && showCursor) {
      text += "█";
    }

    ctx.fillText(text, PADDING_X, PADDING_Y + (i + 1) * LINE_HEIGHT);
    remaining -= charsThisLine;
  }
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm build`
Expected: builds clean. If a compile error mentions `progress is possibly undefined` in `monitor.tsx`, ignore — we'll fix it in Task 3. If the error is anywhere else, stop and debug.

(Build will fail at this step because monitor.tsx still calls `drawBootScreen({ progress, showCursor })` without `mode`. That's expected and gets fixed in Task 3. **Skip the build verification for this task** — proceed to commit.)

- [ ] **Step 3: Commit**

```bash
rtk git add lib/lobby/boot-screen.ts
rtk git commit -m "$(cat <<'EOF'
feat(lobby): boot-screen ready/executing modes + new line texts

Adds a `mode` discriminator to drawBootScreen so the same canvas hosts both
the idle CTA prompt and the post-click typing reveal. The ready prompt sits
on a "booted" framing ('yuri@portfolio:~$ ./enter ▊') and the executing
reveal echoes the same command as it runs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Lobby state machine

**Files:**
- Modify: `components/lobby/use-lobby-state.ts`

- [ ] **Step 1: Replace `components/lobby/use-lobby-state.ts` entirely**

```ts
"use client";

import { useReducer } from "react";

export type LobbyState =
  | "loading"
  | "idle"
  | "exploring"
  | "booting"
  | "done";

export type LobbyAction =
  | { type: "ASSETS_READY" }
  | { type: "DISCOVER" }
  | { type: "ENTER_CLICKED" }
  | { type: "BOOT_COMPLETE" }
  | { type: "SKIP" };

function reducer(state: LobbyState, action: LobbyAction): LobbyState {
  switch (action.type) {
    case "ASSETS_READY":
      return state === "loading" ? "idle" : state;
    case "DISCOVER":
      return state === "idle" ? "exploring" : state;
    case "ENTER_CLICKED":
      return state === "idle" || state === "exploring" ? "booting" : state;
    case "BOOT_COMPLETE":
      return state === "booting" ? "done" : state;
    case "SKIP":
      return "done";
    default:
      return state;
  }
}

export function useLobbyState(initial: LobbyState = "loading") {
  return useReducer(reducer, initial);
}
```

- [ ] **Step 2: Skip type-check** — `desk-scene.tsx` still references `HOLD_START`/`HOLD_CANCEL`/`HOLD_COMPLETE`. Build will fail until Task 4. Proceed.

- [ ] **Step 3: Commit**

```bash
rtk git add components/lobby/use-lobby-state.ts
rtk git commit -m "$(cat <<'EOF'
feat(lobby): collapse hold actions into ENTER_CLICKED

Removes the holding intermediate state and HOLD_START/HOLD_CANCEL/
HOLD_COMPLETE actions. ENTER_CLICKED is the single transition into
booting, valid from idle or exploring.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Monitor — screen mesh as click target, idle lit

**Files:**
- Modify: `components/lobby/objects/monitor.tsx`

- [ ] **Step 1: Replace `components/lobby/objects/monitor.tsx` entirely**

```tsx
"use client";

import { useGLTF } from "@react-three/drei";
import gsap from "gsap";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Box3,
  CanvasTexture,
  Color,
  LinearFilter,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector3,
} from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type {
  Mesh,
  MeshStandardMaterial as MeshStandardMaterialType,
  Object3D,
} from "three";

import { LOBBY_MODELS } from "@/lib/lobby/assets";
import {
  BOOT_CANVAS_HEIGHT,
  BOOT_CANVAS_WIDTH,
  drawBootScreen,
  type BootScreenMode,
} from "@/lib/lobby/boot-screen";
import type { LobbyState } from "../use-lobby-state";

// Annelida MateView exports at ~0.72m wide including the stand foot. At the
// seated POV (#5), 0.62m read too imposing relative to the hutch opening, so
// we ease back to 0.54m — still believable as a 24-27" panel, but framed by
// the hutch rather than crowding it.
const MONITOR_TARGET_WIDTH = 0.54;
// The seanb desk model has a raised monitor riser at the back of the writing
// surface. Both values probed empirically from the desk mesh; keep in sync
// if the desk's normalisation in desk.tsx ever changes.
const MONITOR_RISER_TOP_Y = -0.533;
const MONITOR_RISER_CENTER_Z = -0.28;
// Annelida's Screen_Display_0 mesh — a 4-vert quad with the Display material
// (emissiveTexture only). We swap the material at mount so the emissive map
// + intensity can be driven from React state.
const SCREEN_MESH_NAME = "Screen_Display_0";

// Screen flash on enter — same timeline as the old hold-complete flash.
const SCREEN_FLASH_INTENSITY = 6;
const SCREEN_FLASH_RISE_S = 0.06;
const SCREEN_FLASH_FALL_S = 0.3;

// Screen emissive intensity in lit (ready/executing) states. Higher values
// blow out under our dramatic key + rim lighting; 2.5 reads as a real CRT.
const SCREEN_ON_INTENSITY = 2.5;
// Cursor blink frequency — 2.5Hz feels like a real CRT.
const CURSOR_BLINK_INTERVAL_MS = 400;

export interface MonitorProps {
  /** Fired when the user clicks the screen mesh. Parent dispatches the
   *  ENTER_CLICKED action and may trigger flashComplete. */
  onEnter: () => void;
  /** Drives screen content (ready vs executing) and gates hover/click. */
  state: LobbyState;
  /** Executing-mode reveal progress in [0, 1]. The dive transition (#10)
   *  animates this; 0 keeps the executing lines blank. */
  bootProgress?: number;
}

export interface MonitorHandle {
  /** Called by the parent on ENTER_CLICKED to play the click flash. */
  flashComplete: () => void;
}

function pickMode(state: LobbyState): BootScreenMode {
  return state === "idle" || state === "exploring" ? "ready" : "executing";
}

const Monitor = forwardRef<MonitorHandle, MonitorProps>(function Monitor(
  { onEnter, state, bootProgress = 0 },
  ref,
) {
  const { scene } = useGLTF(LOBBY_MODELS.monitor);
  const screenMaterialRef = useRef<MeshStandardMaterialType | null>(null);
  const screenMeshRef = useRef<Mesh | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const bootCanvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = BOOT_CANVAS_WIDTH;
    c.height = BOOT_CANVAS_HEIGHT;
    return c;
  }, []);
  const bootTexture = useMemo(() => {
    if (!bootCanvas) return null;
    const tex = new CanvasTexture(bootCanvas);
    tex.colorSpace = SRGBColorSpace;
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  }, [bootCanvas]);
  const cursorVisibleRef = useRef(true);

  useImperativeHandle(
    ref,
    () => ({
      flashComplete: () => {
        const screen = screenMaterialRef.current;
        if (!screen) return;
        gsap.killTweensOf(screen);
        gsap
          .timeline()
          .to(screen, {
            emissiveIntensity: SCREEN_FLASH_INTENSITY,
            duration: SCREEN_FLASH_RISE_S,
            ease: "none",
          })
          .to(screen, {
            emissiveIntensity: SCREEN_ON_INTENSITY,
            duration: SCREEN_FLASH_FALL_S,
            ease: "power2.out",
          });
      },
    }),
    [],
  );

  useLayoutEffect(() => {
    scene.scale.setScalar(1);
    scene.position.set(0, 0, 0);
    scene.rotation.set(0, 0, 0);

    // Measure in local space, no parent transform interference.
    const rawBox = new Box3().setFromObject(scene);
    const rawSize = new Vector3();
    rawBox.getSize(rawSize);

    const scale = MONITOR_TARGET_WIDTH / rawSize.x;
    scene.scale.setScalar(scale);

    // Re-measure post-scale and place the model so its base sits on the
    // riser top, centred on x, nudged back on z.
    const finalBox = new Box3().setFromObject(scene);
    const finalCentre = new Vector3();
    finalBox.getCenter(finalCentre);
    scene.position.set(
      -finalCentre.x,
      MONITOR_RISER_TOP_Y - finalBox.min.y,
      MONITOR_RISER_CENTER_Z - finalCentre.z,
    );

    scene.traverse((obj: Object3D) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (mesh.name === SCREEN_MESH_NAME) {
        // Swap the shipped Display material for a controllable emissive that
        // we can drive (ready prompt, executing reveal, flash on click).
        const screenMaterial = new MeshStandardMaterial({
          color: new Color("#000000"),
          emissive: new Color("#ffffff"),
          emissiveIntensity: 0,
          roughness: 0.25,
          metalness: 0,
          emissiveMap: bootTexture,
        });
        mesh.material = screenMaterial;
        screenMaterialRef.current = screenMaterial;
        screenMeshRef.current = mesh;
      }
    });

    return () => {
      screenMaterialRef.current?.dispose();
      screenMaterialRef.current = null;
      screenMeshRef.current = null;
    };
  }, [scene, bootTexture]);

  // Dispose the boot texture when the component unmounts.
  useEffect(() => {
    return () => {
      bootTexture?.dispose();
    };
  }, [bootTexture]);

  // Draw the appropriate screen contents based on lobby state.
  //   - loading:           screen off (intensity 0, no draw)
  //   - idle / exploring:  ready prompt
  //   - booting:           executing reveal (driven by bootProgress)
  //   - done:              n/a, lobby unmounts
  useEffect(() => {
    if (!bootCanvas || !bootTexture) return;
    const screen = screenMaterialRef.current;
    if (!screen) return;

    if (state === "loading") {
      screen.emissiveIntensity = 0;
      return;
    }

    drawBootScreen(bootCanvas, {
      mode: pickMode(state),
      progress: bootProgress,
      showCursor: cursorVisibleRef.current,
    });
    bootTexture.needsUpdate = true;

    // Don't fight the flashComplete GSAP tween — it transiently writes
    // emissiveIntensity for ~360ms and we'd otherwise clobber it.
    if (!gsap.isTweening(screen)) {
      screen.emissiveIntensity = SCREEN_ON_INTENSITY;
    }
  }, [bootCanvas, bootTexture, state, bootProgress]);

  // Cursor blink. Runs whenever the cursor would be visually meaningful:
  //   - ready mode: the prompt cursor at the end of "./enter"
  //   - executing mode mid-reveal: the typing-line trailing block
  useEffect(() => {
    if (!bootCanvas || !bootTexture) return;
    const isReady = state === "idle" || state === "exploring";
    const isTyping =
      state === "booting" && bootProgress > 0 && bootProgress < 1;
    if (!isReady && !isTyping) return;

    const interval = window.setInterval(() => {
      cursorVisibleRef.current = !cursorVisibleRef.current;
      drawBootScreen(bootCanvas, {
        mode: pickMode(state),
        progress: bootProgress,
        showCursor: cursorVisibleRef.current,
      });
      bootTexture.needsUpdate = true;
    }, CURSOR_BLINK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [bootCanvas, bootTexture, state, bootProgress]);

  // Cursor pointer while hovering the screen mesh.
  useEffect(() => {
    if (!isHovered) return;
    const previous = document.body.style.cursor;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = previous;
    };
  }, [isHovered]);

  const isInteractive = state === "idle" || state === "exploring";

  // R3F bubbles pointer events from any child mesh up to the <primitive>
  // wrapper. We filter to the screen mesh so the bezel/stand stay inert,
  // and to the actionable states so clicks during boot/loading are no-ops.
  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    if (!isInteractive) return;
    if (e.object !== screenMeshRef.current) return;
    e.stopPropagation();
    setIsHovered(true);
  };
  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    if (e.object !== screenMeshRef.current) return;
    e.stopPropagation();
    setIsHovered(false);
  };
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!isInteractive) return;
    if (e.object !== screenMeshRef.current) return;
    e.stopPropagation();
    onEnter();
  };

  return (
    <primitive
      object={scene}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    />
  );
});

export default Monitor;
```

- [ ] **Step 2: Skip type-check** — `desk-scene.tsx` still passes `bind={bind}` to `<Monitor>`. Build will fail until Task 4. Proceed.

- [ ] **Step 3: Commit**

```bash
rtk git add components/lobby/objects/monitor.tsx
rtk git commit -m "$(cat <<'EOF'
feat(lobby): screen mesh as click target + idle lit + new monitor API

Removes the bezel power-button mesh, LED material, useFrame pulse loop,
hold-progress handle (cancelPress). Screen mesh now hosts onClick directly,
filtered to the actionable states (idle/exploring) so clicks during boot or
loading are ignored. Screen contents draw from lobby state: ready prompt
while idle, executing reveal during boot.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Desk-scene wiring

**Files:**
- Modify: `components/lobby/desk-scene.tsx`

- [ ] **Step 1: Replace `components/lobby/desk-scene.tsx` entirely**

```tsx
"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import type { Dispatch } from "react";

import { useFirstPointermoveSweep } from "@/hooks/use-first-pointermove-sweep";
import CameraRig, { type CameraRigHandle } from "./camera-rig";
import Desk from "./desk";
import DeskEnvironment from "./desk-environment";
import Monitor, { type MonitorHandle } from "./objects/monitor";
import RazerPeripherals from "./objects/razer-peripherals";
import Macbook from "./objects/macbook";
// TODO #11: import NintendoDS from "./objects/nintendo-ds";
// TODO #12: import XboxController from "./objects/xbox-controller";
// TODO #13: import Decks from "./objects/decks";
import AnimeFigures from "./objects/anime-figures";
import type { LobbyAction, LobbyState } from "./use-lobby-state";

interface DeskSceneProps {
  state: LobbyState;
  dispatch: Dispatch<LobbyAction>;
}

export default function DeskScene({ state, dispatch }: DeskSceneProps) {
  const cameraRigRef = useRef<CameraRigHandle>(null);
  const monitorRef = useRef<MonitorHandle>(null);

  useEffect(() => {
    if (state !== "loading") return;
    const timer = window.setTimeout(() => {
      dispatch({ type: "ASSETS_READY" });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [state, dispatch]);

  // Discovery affordance (issue #14): fires once per session on the user's
  // first mouse move, pulsing 3–4 registered objects to signal interactivity.
  useFirstPointermoveSweep({ enabled: state === "idle" });

  const handleEnter = () => {
    if (state !== "idle" && state !== "exploring") return;
    monitorRef.current?.flashComplete();
    dispatch({ type: "ENTER_CLICKED" });
  };

  return (
    <div
      role="application"
      aria-label="Interactive desk lobby"
      data-lobby-active="true"
      className="fixed inset-0 z-50 bg-background"
    >
      <Canvas dpr={[1, 2]} shadows="soft">
        <CameraRig ref={cameraRigRef} state={state} />
        <Suspense fallback={null}>
          <DeskEnvironment />
          <Desk />
          <Monitor ref={monitorRef} onEnter={handleEnter} state={state} />
          <RazerPeripherals />
          <Macbook />
          {/* TODO #11: <NintendoDS /> */}
          {/* TODO #12: <XboxController /> */}
          {/* TODO #13: <Decks /> */}
          <AnimeFigures />
        </Suspense>
      </Canvas>
      {/* Off-canvas keyboard surrogate. Tab → Enter/Space triggers the same
          enter action as clicking the screen mesh. */}
      <button
        type="button"
        onClick={handleEnter}
        className="sr-only"
      >
        Enter portfolio
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Type-check + lint**

Run: `pnpm build`
Expected: build succeeds. (The orphaned files in `hooks/use-hint-tooltip.ts`, `hooks/use-hold-activate.ts`, `components/lobby/hint-tooltip.tsx`, `components/lobby/hold-progress.tsx`, `lib/lobby/monitor-anchors.ts` still exist but have no importers — Next.js compiles them on demand, so they shouldn't trip the build. If any of them error standalone, note it and proceed to Task 5 where they get deleted.)

Run: `pnpm lint`
Expected: lint passes. Unused-import warnings on the orphaned files are fine — they'll be deleted in Task 5.

- [ ] **Step 3: Commit**

```bash
rtk git add components/lobby/desk-scene.tsx
rtk git commit -m "$(cat <<'EOF'
feat(lobby): desk-scene drops hold plumbing, single handleEnter

Removes useHoldActivate, HoldProgress mount, HintTooltip mount and the
hold-Space sr-only button. Replaced with a single handleEnter that flashes
the monitor and dispatches ENTER_CLICKED. Keyboard parity preserved by the
Enter portfolio sr-only button.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Delete orphaned files

**Files:**
- Delete: `components/lobby/hint-tooltip.tsx`
- Delete: `components/lobby/hold-progress.tsx`
- Delete: `hooks/use-hint-tooltip.ts`
- Delete: `hooks/use-hold-activate.ts`
- Delete: `lib/lobby/monitor-anchors.ts`

- [ ] **Step 1: Confirm nothing imports them**

Run:
```bash
grep -rn "hint-tooltip\|hold-progress\|use-hint-tooltip\|use-hold-activate\|monitor-anchors" --include='*.ts' --include='*.tsx' app components hooks lib
```

Expected: no matches outside the files being deleted themselves. If anything else references them, stop and resolve before deleting.

- [ ] **Step 2: Delete the files**

```bash
rm components/lobby/hint-tooltip.tsx components/lobby/hold-progress.tsx hooks/use-hint-tooltip.ts hooks/use-hold-activate.ts lib/lobby/monitor-anchors.ts
```

- [ ] **Step 3: Type-check + lint clean**

Run: `pnpm build && pnpm lint`
Expected: both succeed with no errors and no warnings related to the deleted files.

- [ ] **Step 4: Commit**

```bash
rtk git add -u components/lobby/hint-tooltip.tsx components/lobby/hold-progress.tsx hooks/use-hint-tooltip.ts hooks/use-hold-activate.ts lib/lobby/monitor-anchors.ts
rtk git commit -m "$(cat <<'EOF'
chore(lobby): delete power-button + hold + tooltip artefacts

hint-tooltip, hold-progress, use-hint-tooltip, use-hold-activate, and
monitor-anchors have no consumers after the screen-as-CTA refactor.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Manual verification

**Files:** none (visual check only)

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`
Expected: server starts on http://localhost:3000 without errors. Note any console warnings.

- [ ] **Step 2: Hard-refresh the lobby**

Clear localStorage for the dev origin first (the `useLobbyVisited` hook short-circuits after first visit, sending you straight past the lobby):

In DevTools console: `localStorage.removeItem('lobby-visited')` (or whatever key `use-lobby-visited.ts` uses — check the source if unsure), then reload.

Expected on load:
- Brief blank/loading state (~600ms)
- Monitor screen lights up showing:
  ```
  > BOOTED.
  > READY.

  yuri@portfolio:~$ ./enter █
  ```
- Cursor `█` blinks at the end of the prompt
- No power-button LED visible on the bezel
- No tooltip appears after 3s idle

- [ ] **Step 3: Hover the screen**

Move the cursor over the monitor screen.
Expected: cursor changes to pointer. Hovering the bezel, stand, desk, or other objects does not change the cursor.

- [ ] **Step 4: Click the screen**

Click anywhere on the screen panel.
Expected sequence:
- Screen flash (brief white spike, ~360ms total)
- Executing reveal begins: lines type out below the prompt
  ```
  yuri@portfolio:~$ ./enter
  > EXECUTING...
  > LOADING YURI BODO
  > [████████████]
  ```
- Dive transition runs as before
- Lobby unmounts, site appears

- [ ] **Step 5: Refresh and test keyboard path**

Reload (clear `lobby-visited` again). Once the prompt is visible:
- Press Tab. The sr-only "Enter portfolio" button receives focus (invisible but present in DevTools accessibility tree).
- Press Enter (or Space). Same flash → executing → dive sequence fires.

- [ ] **Step 6: Console + network sanity**

Open DevTools.
Expected:
- No errors during idle, click, or boot
- No 404s for `hint-tooltip`/`hold-progress`/`monitor-anchors` (HMR sometimes caches deleted module paths)
- No "Cannot read properties of null" or material-disposal errors on unmount

If anything fails: do NOT mark this task complete. File the symptom and debug. Common gotchas:
- `e.object !== screenMeshRef.current` filter too aggressive → click silently does nothing. Check `screenMeshRef` is set in the GLTF traverse.
- Screen blank → check `bootTexture` is bound to `emissiveMap` and `bootTexture.needsUpdate = true` runs after each draw.
- Click works once then dies → check `gsap.killTweensOf` in `flashComplete` doesn't kill more than the flash timeline.

- [ ] **Step 7: No commit needed**

Verification is a gate, not a code change.

---

## Final State

Branch has 5 new commits on top of `310f688`:
1. `feat(lobby): boot-screen ready/executing modes + new line texts`
2. `feat(lobby): collapse hold actions into ENTER_CLICKED`
3. `feat(lobby): screen mesh as click target + idle lit + new monitor API`
4. `feat(lobby): desk-scene drops hold plumbing, single handleEnter`
5. `chore(lobby): delete power-button + hold + tooltip artefacts`

PR-ready. Title suggestion: `feat(lobby): screen as CTA — remove power-button hold gate`.

## Spec Coverage Check

- ✅ Idle screen text + blinking cursor → Task 1 (renderer) + Task 3 (state-driven draw + blink effect)
- ✅ Click triggers EXECUTING + flash + dive → Task 3 (`flashComplete` reused, executing mode) + Task 4 (`handleEnter` wires the flash + dispatch)
- ✅ Power button + LED removed → Task 3 (rewritten monitor.tsx has no button mesh)
- ✅ Keyboard parity → Task 4 (sr-only `Enter portfolio` button)
- ✅ State machine collapse → Task 2
- ✅ File deletions → Task 5
- ✅ Acceptance criteria from spec → Task 6

No gaps.
