# Custom Cursor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an organic blob SVG cursor that deforms with mouse velocity and morphs contextually on interactive elements.

**Architecture:** Single client component (`custom-cursor.tsx`) renders a fixed SVG overlay. 8 control points form a blob shape via cubic bezier path. GSAP `quickTo` handles position, `gsap.ticker` drives deformation math. `data-cursor` attributes on DOM elements trigger contextual state changes via event delegation.

**Tech Stack:** React 19, GSAP 3.14 (quickTo, ticker), SVG path, CSS mix-blend-mode

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `components/ui/custom-cursor.tsx` | Blob cursor component — SVG, deformation, state machine |
| Modify | `app/globals.css` | Add `cursor: none` rule for fine pointer devices |
| Modify | `app/page.tsx` | Mount `<CustomCursor />` |
| Modify | `components/pong/pong-game.tsx` | Add `data-cursor="none"` to canvas |

---

### Task 1: Static blob SVG — render and position

Create the component with a static circular blob that follows the mouse.

**Files:**
- Create: `components/ui/custom-cursor.tsx`

- [ ] **Step 1: Create the component with static SVG blob**

```tsx
"use client";

import { useRef, useState, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const BASE_RADIUS = 16;
const NUM_POINTS = 8;

function generateCirclePath(radius: number): string {
  const points: [number, number][] = [];
  for (let i = 0; i < NUM_POINTS; i++) {
    const angle = (i / NUM_POINTS) * Math.PI * 2;
    points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  return pointsToSmoothPath(points);
}

function pointsToSmoothPath(points: [number, number][]): string {
  const n = points.length;
  const d: string[] = [];
  d.push(`M ${points[0][0]} ${points[0][1]}`);

  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    d.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`);
  }

  d.push("Z");
  return d.join(" ");
}

export function CustomCursor() {
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const query = window.matchMedia("(pointer: fine)");
    setIsDesktop(query.matches);
    function handleChange(e: MediaQueryListEvent) {
      setIsDesktop(e.matches);
    }
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  useGSAP(() => {
    if (!isDesktop || !groupRef.current) return;

    const xTo = gsap.quickTo(groupRef.current, "x", {
      duration: reducedMotion ? 0 : 0.3,
      ease: "power3.out",
    });
    const yTo = gsap.quickTo(groupRef.current, "y", {
      duration: reducedMotion ? 0 : 0.3,
      ease: "power3.out",
    });

    function handleMouseMove(e: MouseEvent) {
      xTo(e.clientX);
      yTo(e.clientY);
    }

    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, { dependencies: [isDesktop, reducedMotion] });

  if (!isDesktop) return null;

  return (
    <svg
      ref={svgRef}
      className="custom-cursor"
      aria-hidden="true"
    >
      <g ref={groupRef}>
        <path
          ref={pathRef}
          d={generateCirclePath(BASE_RADIUS)}
          fill="var(--accent)"
        />
      </g>
    </svg>
  );
}
```

- [ ] **Step 2: Run dev server and verify blob follows mouse**

Run: `pnpm dev`

Open browser — the component isn't mounted yet. This step is just confirming no TypeScript errors:

Run: `pnpm build 2>&1 | tail -20`

Expected: Build succeeds with no type errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/custom-cursor.tsx
git commit -m "feat(cursor): add static blob SVG component with quickTo positioning"
```

---

### Task 2: Mount component and add CSS

**Files:**
- Modify: `app/page.tsx:1-26`
- Modify: `app/globals.css:52-56`

- [ ] **Step 1: Add cursor CSS to globals.css**

In `app/globals.css`, after the `body` block (after line 56), add:

```css
/* Custom cursor */
@media (pointer: fine) {
  * {
    cursor: none !important;
  }
}

.custom-cursor {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  mix-blend-mode: exclusion;
  width: 100vw;
  height: 100vh;
}

.custom-cursor path {
  shape-rendering: geometricPrecision;
}
```

- [ ] **Step 2: Mount CustomCursor in page.tsx**

In `app/page.tsx`, add import at top:

```tsx
import { CustomCursor } from "@/components/ui/custom-cursor";
```

Add `<CustomCursor />` right after `<LoadingScreen />`:

```tsx
<LoadingScreen />
<CustomCursor />
<AsciiNoise />
```

- [ ] **Step 3: Verify in browser**

Run: `pnpm dev`

Expected: Orange blob follows mouse with smooth delay. Native cursor hidden. `mix-blend-mode: exclusion` makes the blob invert colors where it overlaps content.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/page.tsx
git commit -m "feat(cursor): mount custom cursor, add CSS for cursor:none and mix-blend-mode"
```

---

### Task 3: Velocity-driven deformation

Add stretch/squeeze based on mouse velocity vector.

**Files:**
- Modify: `components/ui/custom-cursor.tsx`

- [ ] **Step 1: Add velocity tracking and deformation logic**

Replace the `useGSAP` block and add deformation state. The key changes:

1. Add a `prevMouse` ref to track previous position
2. Add a `controlPoints` ref with 8 points, each having base position + current offset
3. On `gsap.ticker`, calculate velocity, compute per-point stretch/squeeze via dot product, apply spring damping
4. Rebuild the SVG path from deformed points

Add these constants after `NUM_POINTS`:

```tsx
const MAX_STRETCH = 12;
const MAX_SQUEEZE = 6;
const STRETCH_FACTOR = 0.4;
const SQUEEZE_FACTOR = 0.2;
const SPRING_DAMPING = 0.15;
const IDLE_THRESHOLD_MS = 200;
const IDLE_AMPLITUDE = 1.5;
```

Add this interface and initializer before the component:

```tsx
interface ControlPoint {
  baseX: number;
  baseY: number;
  offsetX: number;
  offsetY: number;
  idleFreq: number;
}

function createControlPoints(): ControlPoint[] {
  return Array.from({ length: NUM_POINTS }, (_, i) => {
    const angle = (i / NUM_POINTS) * Math.PI * 2;
    return {
      baseX: Math.cos(angle) * BASE_RADIUS,
      baseY: Math.sin(angle) * BASE_RADIUS,
      offsetX: 0,
      offsetY: 0,
      idleFreq: 0.8 + Math.random() * 0.7,
    };
  });
}
```

Replace the `useGSAP` hook with this expanded version:

```tsx
useGSAP(() => {
  if (!isDesktop || !groupRef.current || !pathRef.current) return;

  const points = createControlPoints();
  const prevMouse = { x: 0, y: 0 };
  let lastMoveTime = 0;

  const xTo = gsap.quickTo(groupRef.current, "x", {
    duration: reducedMotion ? 0 : 0.3,
    ease: "power3.out",
  });
  const yTo = gsap.quickTo(groupRef.current, "y", {
    duration: reducedMotion ? 0 : 0.3,
    ease: "power3.out",
  });

  function handleMouseMove(e: MouseEvent) {
    xTo(e.clientX);
    yTo(e.clientY);
    prevMouse.x = e.clientX;
    prevMouse.y = e.clientY;
    lastMoveTime = Date.now();
  }

  function onTick() {
    if (reducedMotion) return;

    const now = Date.now();
    const isIdle = now - lastMoveTime > IDLE_THRESHOLD_MS;
    const time = now * 0.001;

    // Get current GSAP-interpolated position for velocity calc
    const gX = gsap.getProperty(groupRef.current!, "x") as number;
    const gY = gsap.getProperty(groupRef.current!, "y") as number;
    const vx = prevMouse.x - gX;
    const vy = prevMouse.y - gY;
    const speed = Math.sqrt(vx * vx + vy * vy);

    let dx = 0;
    let dy = 0;
    if (speed > 0.5) {
      dx = vx / speed;
      dy = vy / speed;
    }

    for (let i = 0; i < NUM_POINTS; i++) {
      const p = points[i];
      const nx = p.baseX / BASE_RADIUS;
      const ny = p.baseY / BASE_RADIUS;

      let targetOX = 0;
      let targetOY = 0;

      if (speed > 0.5) {
        const dot = nx * dx + ny * dy;
        const stretchAmount = Math.min(dot * speed * STRETCH_FACTOR, MAX_STRETCH);
        const squeezeAmount = Math.max((1 - Math.abs(dot)) * speed * -SQUEEZE_FACTOR, -MAX_SQUEEZE);
        const deform = dot > 0 ? stretchAmount : squeezeAmount;
        targetOX = nx * deform;
        targetOY = ny * deform;
      }

      if (isIdle) {
        targetOX += Math.sin(time * p.idleFreq + i * 0.8) * IDLE_AMPLITUDE;
        targetOY += Math.cos(time * p.idleFreq * 0.9 + i * 1.1) * IDLE_AMPLITUDE;
      }

      p.offsetX += (targetOX - p.offsetX) * SPRING_DAMPING;
      p.offsetY += (targetOY - p.offsetY) * SPRING_DAMPING;
    }

    const deformedPoints: [number, number][] = points.map((p) => [
      p.baseX + p.offsetX,
      p.baseY + p.offsetY,
    ]);

    pathRef.current!.setAttribute("d", pointsToSmoothPath(deformedPoints));
  }

  document.addEventListener("mousemove", handleMouseMove);
  gsap.ticker.add(onTick);

  return () => {
    document.removeEventListener("mousemove", handleMouseMove);
    gsap.ticker.remove(onTick);
  };
}, { dependencies: [isDesktop, reducedMotion] });
```

- [ ] **Step 2: Verify deformation in browser**

Run: `pnpm dev`

Expected: Blob stretches in the direction of fast mouse movement, squeezes perpendicular axis. When mouse stops, blob gently wobbles with organic breathing.

- [ ] **Step 3: Run build check**

Run: `pnpm build 2>&1 | tail -20`

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add components/ui/custom-cursor.tsx
git commit -m "feat(cursor): add velocity-driven deformation and idle wobble"
```

---

### Task 4: Contextual state machine

Add `data-cursor` attribute detection and state morphing.

**Files:**
- Modify: `components/ui/custom-cursor.tsx`

- [ ] **Step 1: Add state types and radius config**

Add these types and constants near the top of the file (after the existing constants):

```tsx
type CursorState = "default" | "link" | "project" | "cta" | "text" | "none";

const STATE_RADIUS: Record<CursorState, number> = {
  default: 16,
  link: 24,
  project: 32,
  cta: 24,
  text: 16,
  none: 0,
};

const STATE_SCALE_X: Record<CursorState, number> = {
  default: 1,
  link: 1.4,
  project: 1,
  cta: 1,
  text: 0.15,
  none: 0.5,
};

const STATE_SCALE_Y: Record<CursorState, number> = {
  default: 1,
  link: 0.85,
  project: 1,
  cta: 1,
  text: 1.2,
  none: 0.5,
};

const STATE_OPACITY: Record<CursorState, number> = {
  default: 1,
  link: 1,
  project: 1,
  cta: 1,
  text: 0.8,
  none: 0,
};

const AUTO_CURSOR_SELECTOR = "a, button, [role='button']";
```

- [ ] **Step 2: Add state detection and morphing inside useGSAP**

Add this block inside the `useGSAP` callback, after the `quickTo` setup and before the `onTick` function:

```tsx
let currentState: CursorState = "default";
let targetRadius = BASE_RADIUS;
let currentRadius = BASE_RADIUS;
let ctaPulseTween: gsap.core.Tween | null = null;

const scaleXTo = gsap.quickTo(groupRef.current, "scaleX", {
  duration: 0.3,
  ease: "power3.out",
});
const scaleYTo = gsap.quickTo(groupRef.current, "scaleY", {
  duration: 0.3,
  ease: "power3.out",
});

function detectCursorState(target: EventTarget | null): CursorState {
  if (!(target instanceof Element)) return "default";
  const explicit = target.closest("[data-cursor]");
  if (explicit) {
    return (explicit.getAttribute("data-cursor") as CursorState) || "default";
  }
  if (target.closest(AUTO_CURSOR_SELECTOR)) return "link";
  return "default";
}

function setState(state: CursorState) {
  if (state === currentState) return;
  currentState = state;
  targetRadius = STATE_RADIUS[state];
  scaleXTo(STATE_SCALE_X[state]);
  scaleYTo(STATE_SCALE_Y[state]);

  gsap.to(pathRef.current, {
    opacity: STATE_OPACITY[state],
    duration: 0.3,
    ease: "power3.out",
  });

  if (ctaPulseTween) {
    ctaPulseTween.kill();
    ctaPulseTween = null;
  }

  if (state === "cta") {
    ctaPulseTween = gsap.to(groupRef.current, {
      scale: 1.15,
      duration: 0.4,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });
  }
}

function handleMouseOver(e: MouseEvent) {
  setState(detectCursorState(e.target));
}

function handleMouseOut(e: MouseEvent) {
  const related = e.relatedTarget;
  setState(detectCursorState(related));
}

document.addEventListener("mouseover", handleMouseOver);
document.addEventListener("mouseout", handleMouseOut);
```

Then update the `onTick` function — replace the line where `baseX`/`baseY` are used in the deformation loop. Add radius interpolation at the top of `onTick`:

```tsx
// Add at the start of onTick:
currentRadius += (targetRadius - currentRadius) * SPRING_DAMPING;
```

And update the control point base position calculation inside the loop to use `currentRadius`:

```tsx
// Replace these lines in the loop:
const nx = p.baseX / BASE_RADIUS;
const ny = p.baseY / BASE_RADIUS;

// Update baseX/baseY dynamically:
const scale = currentRadius / BASE_RADIUS;
```

Then in the deformedPoints mapping, apply the scale:

```tsx
const deformedPoints: [number, number][] = points.map((p) => {
  const scale = currentRadius / BASE_RADIUS;
  return [
    p.baseX * scale + p.offsetX,
    p.baseY * scale + p.offsetY,
  ];
});
```

Add cleanup for the new listeners in the return function:

```tsx
return () => {
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseover", handleMouseOver);
  document.removeEventListener("mouseout", handleMouseOut);
  gsap.ticker.remove(onTick);
  if (ctaPulseTween) ctaPulseTween.kill();
};
```

- [ ] **Step 3: Verify in browser**

Run: `pnpm dev`

Expected: Hovering links/buttons makes blob expand into pill shape. Moving off returns to default. No errors in console.

- [ ] **Step 4: Commit**

```bash
git add components/ui/custom-cursor.tsx
git commit -m "feat(cursor): add contextual state machine with data-cursor detection"
```

---

### Task 5: Integration — add data-cursor attributes and will-change

**Files:**
- Modify: `components/pong/pong-game.tsx:130`
- Modify: `components/ui/custom-cursor.tsx` (will-change management)

- [ ] **Step 1: Add data-cursor="none" to Pong canvas**

In `components/pong/pong-game.tsx`, on the canvas element (line 130), add the attribute:

```tsx
// Before:
className="absolute inset-0 w-full h-full cursor-none"

// After:
className="absolute inset-0 w-full h-full cursor-none"
data-cursor="none"
```

- [ ] **Step 2: Add will-change management to cursor component**

In `components/ui/custom-cursor.tsx`, inside the `useGSAP` hook, add will-change toggling. After the `lastMoveTime` variable declaration, add:

```tsx
let willChangeTimer: ReturnType<typeof setTimeout> | null = null;

function setWillChange(active: boolean) {
  if (!groupRef.current) return;
  groupRef.current.style.willChange = active ? "transform" : "auto";
}
```

In the `handleMouseMove` function, add:

```tsx
function handleMouseMove(e: MouseEvent) {
  xTo(e.clientX);
  yTo(e.clientY);
  prevMouse.x = e.clientX;
  prevMouse.y = e.clientY;
  lastMoveTime = Date.now();

  setWillChange(true);
  if (willChangeTimer) clearTimeout(willChangeTimer);
  willChangeTimer = setTimeout(() => setWillChange(false), 500);
}
```

Add cleanup for the timer in the return function:

```tsx
if (willChangeTimer) clearTimeout(willChangeTimer);
```

- [ ] **Step 3: Verify Pong hides cursor blob**

Run: `pnpm dev`

Trigger Konami code (↑↑↓↓←→←→BA), confirm blob fades out over the Pong canvas.

- [ ] **Step 4: Commit**

```bash
git add components/pong/pong-game.tsx components/ui/custom-cursor.tsx
git commit -m "feat(cursor): add data-cursor attrs, will-change management"
```

---

### Task 6: Final polish and build verification

**Files:**
- All modified files

- [ ] **Step 1: Run lint**

Run: `pnpm lint`

Expected: No warnings or errors.

- [ ] **Step 2: Run production build**

Run: `pnpm build`

Expected: Build succeeds. No type errors, no warnings.

- [ ] **Step 3: Test reduced motion**

In browser DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`.

Expected: Blob becomes static circle, teleports to cursor position without spring delay, no wobble, no deformation. State changes still resize but without animation.

- [ ] **Step 4: Final commit if any adjustments were needed**

```bash
git add -u
git commit -m "fix(cursor): polish and adjustments from testing"
```
