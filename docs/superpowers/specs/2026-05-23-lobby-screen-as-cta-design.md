# Lobby — Screen as CTA (remove power button)

**Date:** 2026-05-23
**Branch:** `feat/lobby-desk-issue-8-razer-peripherals` (next sub-branch, this PR)

## Context

The current lobby gates entry behind a **hold-to-activate** power button on
the monitor bezel: idle LED pulses → user hovers/presses → ring fills → boot
sequence plays → dive. It works, but the affordance is small (22mm LED on a
540mm panel) and the hold mechanism asks the user to learn an interaction
before they've decided to commit.

We're flipping it: the monitor is already on, the screen itself is the CTA,
one click enters. The boot/dive sequence stays — it's the wow moment — only
the gate in front of it changes.

## Behaviour

### Idle screen (state = `idle`)

The screen is lit from frame 1 with a terminal showing:

```
> BOOTED.
> READY.

yuri@portfolio:~$ ./enter ▊
```

- Phosphor green on black (`#39ff7a` on `#000`), same palette as the existing
  boot screen.
- The block cursor `▊` blinks at the same 2.5Hz interval already used during
  typing (`CURSOR_BLINK_INTERVAL_MS = 400`).
- Emissive intensity sits at `SCREEN_ON_INTENSITY = 2.5` — same as the
  completed-boot state today.

### Click → boot → dive (state = `idle` → `booting` → `done`)

A single click anywhere on the screen mesh (`Screen_Display_0`) fires the
boot sequence. Visual narrative:

1. **0–200ms** — `EXECUTING...` line appears under the prompt, cursor stops
   blinking. Drawn by adding a fourth line to the boot-screen renderer.
2. **200–260ms** — screen flash, reusing the existing `flashComplete`
   timeline (`SCREEN_FLASH_INTENSITY = 6`, rise 60ms / fall 300ms).
3. **260ms onwards** — dive transition (#10) runs as-is.

The existing `bootProgress` channel still drives the typing-out of the
boot lines during the dive. The CTA prompt is the idle frame; the boot
text is what plays during the transition.

### Keyboard / screen reader parity

- The off-canvas `<button>` keeps a 1:1 role but loses the hold binding.
  Label changes: `"Power on monitor (hold Space to enter site)"` →
  `"Enter portfolio"`. `onClick` fires the same enter action.
- Cursor pointer style follows the screen mesh hover, not the button.

## What goes away

| File | Removal |
|------|---------|
| `components/lobby/objects/monitor.tsx` | Power-button mesh (`<mesh>` with sphereGeometry + LED material), `ledMaterialRef`, `LED_IDLE/HOVER/PRESSED_INTENSITY`, `IDLE_PULSE_PERIOD_S`, `HOVER_PULSE_PERIOD_S`, `CANCEL_EASE_DURATION_S`, `BUTTON_POSITION`, `BUTTON_RADIUS`, `pressedIntensityRef`, `cancelTweenRef`, `cancelPress` imperative method, `useFrame` LED pulse loop, `isHovered` state tied to the button. |
| `components/lobby/desk-scene.tsx` | `useHoldActivate` call, the sr-only hold-Space button, `<HoldProgress>` mount, `<HintTooltip>` mount, `useHintTooltip` hook call, `bind`/`progress`/`isHolding` plumbing. |
| `components/lobby/hint-tooltip.tsx` | Entire file. |
| `hooks/use-hint-tooltip.ts` | Entire file. |
| `hooks/use-hold-activate.ts` | Entire file. |
| `components/lobby/hold-progress.tsx` | Entire file. |
| `lib/lobby/monitor-anchors.ts` | Entire file (only consumer was the tooltip). |
| `components/lobby/use-lobby-state.ts` | `holding` state, `HOLD_START` / `HOLD_CANCEL` / `HOLD_COMPLETE` actions. |

## What changes

### `lib/lobby/boot-screen.ts`

Add a mode flag so the same canvas serves both states:

```ts
type BootScreenMode = "ready" | "executing";

interface DrawBootScreenOptions {
  mode: BootScreenMode;
  /** When mode === "executing", reveal progress in [0, 1]. Unused in "ready". */
  progress?: number;
  showCursor: boolean;
}
```

- `mode: "ready"` draws three lines verbatim:
  ```
  > BOOTED.
  > READY.

  yuri@portfolio:~$ ./enter ▊
  ```
  Cursor blink toggles the trailing `▊`.
- `mode: "executing"` keeps today's typing-reveal but with new lines:
  ```
  yuri@portfolio:~$ ./enter
  > EXECUTING...
  > LOADING YURI BODO
  > [████████████]
  ```
  The first line is pre-rendered (already typed); `progress` reveals the
  rest. This way the click feels like the command they were already looking
  at runs, not like the screen restarts.

### `components/lobby/objects/monitor.tsx`

- Screen mesh `Screen_Display_0` gets `onClick` / `onPointerEnter` /
  `onPointerLeave` directly. Hit area is the whole panel — no fragile
  bezel-LED collider.
- Cursor pointer applies on screen hover.
- Initial emissive intensity set to `SCREEN_ON_INTENSITY` on mount (no
  longer gated on `bootProgress > 0`).
- Idle cursor blink runs whenever `mode === "ready"` (today it only runs
  during typing). Move the blink interval out from under the
  `bootProgress > 0 && bootProgress < 1` guard.
- `flashComplete()` stays — it's reused for the post-click flash.
- `cancelPress()` deleted from the handle (no hold to cancel).
- Props: drop `bind`, `isHolding`. Add `onEnter: () => void` callback
  forwarded to the screen click handler.

### `components/lobby/use-lobby-state.ts`

```ts
export type LobbyState = "loading" | "idle" | "exploring" | "booting" | "done";

export type LobbyAction =
  | { type: "ASSETS_READY" }
  | { type: "DISCOVER" }
  | { type: "ENTER_CLICKED" }
  | { type: "BOOT_COMPLETE" }
  | { type: "SKIP" };
```

`ENTER_CLICKED` is valid from `idle` or `exploring`; transitions to
`booting`. `holding` state is gone entirely.

### `components/lobby/desk-scene.tsx`

Reduces to roughly:

```tsx
const handleEnter = () => {
  monitorRef.current?.flashComplete();
  dispatch({ type: "ENTER_CLICKED" });
};

return (
  <div role="application" /* ... */>
    <Canvas dpr={[1, 2]} shadows="soft">
      <CameraRig ref={cameraRigRef} state={state} />
      <Suspense fallback={null}>
        <DeskEnvironment />
        <Desk />
        <Monitor ref={monitorRef} onEnter={handleEnter} state={state} />
        <RazerPeripherals />
        <Macbook />
        <AnimeFigures />
      </Suspense>
    </Canvas>
    <button type="button" onClick={handleEnter} className="sr-only">
      Enter portfolio
    </button>
  </div>
);
```

`useFirstPointermoveSweep` stays — it pulses other desk objects, not the
power button (which is gone anyway).

## Accessibility

- Keyboard: Tab focuses the sr-only `<button>`, Enter/Space fires the enter
  action. No hold, no timer.
- Screen reader: button label `"Enter portfolio"` is self-describing.
- Reduced motion: handled upstream by `lobby-gate.tsx` (lobby is skipped
  entirely). Within the scene, the cursor blink is the only idle motion;
  fine.
- Focus ring: sr-only is invisible but focusable — same pattern as today.

## State machine diff

```
before:                                after:
  loading ──ASSETS_READY──> idle         loading ──ASSETS_READY──> idle
  idle ───DISCOVER───> exploring         idle ───DISCOVER───> exploring
  idle ───HOLD_START───> holding         idle ───ENTER_CLICKED───> booting
  exploring ──HOLD_START──> holding      exploring ──ENTER_CLICKED──> booting
  holding ──HOLD_CANCEL──> exploring     booting ──BOOT_COMPLETE──> done
  holding ──HOLD_COMPLETE──> booting     * ──SKIP──> done
  booting ──BOOT_COMPLETE──> done
  * ──SKIP──> done
```

## Out of scope

- Boot text wording beyond what's listed above. Keep `EXECUTING / LOADING /
  bar` for now.
- Mobile / reduced-motion paths — already short-circuit at `lobby-gate.tsx`.
- The first-pointermove sweep behaviour — unchanged.
- Any other desk object (figures, peripherals, macbook).
- The dive transition (#10) — touched only through the existing
  `bootProgress` channel.

## Acceptance

- [ ] Screen lit in `idle` showing the ready prompt + blinking cursor.
- [ ] Clicking anywhere on the screen mesh enters the booting sequence.
- [ ] No power-button LED visible anywhere on the monitor.
- [ ] Boot lines now read "yuri@portfolio:~$ ./enter / EXECUTING... /
      LOADING YURI BODO / [████████████]".
- [ ] Tab → Enter on the sr-only button triggers the same flow.
- [ ] No console errors, no orphaned files, no dead imports.
- [ ] `pnpm lint` and `pnpm build` clean.

## Files affected (summary)

**Deleted:** 5
- `components/lobby/hint-tooltip.tsx`
- `components/lobby/hold-progress.tsx`
- `hooks/use-hint-tooltip.ts`
- `hooks/use-hold-activate.ts`
- `lib/lobby/monitor-anchors.ts`

**Edited:** 4
- `components/lobby/desk-scene.tsx`
- `components/lobby/objects/monitor.tsx`
- `components/lobby/use-lobby-state.ts`
- `lib/lobby/boot-screen.ts`
