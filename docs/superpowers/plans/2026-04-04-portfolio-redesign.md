# Portfolio Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild yuribodo.dev as an Awwwards-grade portfolio with game-world narrative, Kubrick cinema palette, kinetic typography (Pretext), interactive text physics, and scroll-driven animations.

**Architecture:** Single-page scroll (Hero → About → Projects → Skills) with dedicated `/projects/[slug]` pages. Hero uses Canvas 2D (Pretext text physics) + Three.js (ambient 3D). All sections orchestrated with GSAP ScrollTrigger. Audio system with Web Audio API. Pong easter egg preserved.

**Tech Stack:** Next.js 16, TypeScript 5, Tailwind CSS 4, GSAP + ScrollTrigger + SplitText + FLIP + Draggable, @chenglou/pretext, Three.js, Web Audio API, Archivo + JetBrains Mono fonts.

**Spec:** `docs/superpowers/specs/2026-04-04-portfolio-design.md`

---

## File Structure

```
app/
├── layout.tsx                    # MODIFY — new fonts (Archivo + JetBrains Mono), metadata
├── globals.css                   # MODIFY — Kubrick palette tokens, typography scale, base styles
├── page.tsx                      # MODIFY — compose all sections into single-page scroll
└── projects/
    └── [slug]/
        └── page.tsx              # CREATE — dedicated project page

components/
├── sections/
│   ├── hero.tsx                  # CREATE — boot sequence + text physics canvas + 3D element
│   ├── about.tsx                 # CREATE — scroll reveal narrative section
│   ├── projects.tsx              # CREATE — deck of cards horizontal scroll
│   └── skills.tsx                # CREATE — solar system orbit visualization
├── ui/
│   ├── header.tsx                # CREATE — sticky header (morphs from hero)
│   ├── project-card.tsx          # CREATE — individual card with holographic tilt
│   ├── skill-node.tsx            # CREATE — individual orbit node with tooltip
│   ├── audio-toggle.tsx          # CREATE — mute/unmute button
│   ├── terminal.tsx              # KEEP — existing terminal component
│   └── game-loading.tsx          # KEEP — existing game loading screen
├── canvas/
│   ├── text-particles.tsx        # CREATE — Pretext-powered text physics canvas
│   ├── particle-engine.ts        # CREATE — spring physics engine for letters
│   └── hero-scene.tsx            # CREATE — Three.js icosahedron scene
├── pong/
│   ├── pong-game.tsx             # KEEP — existing
│   └── pong-engine.ts            # KEEP — existing
└── easter-eggs/
    └── konami-code.tsx           # CREATE — konami code listener + pong trigger

lib/
├── utils.ts                      # KEEP — cn() utility
├── fonts.ts                      # CREATE — Archivo + JetBrains Mono font config
├── audio-manager.ts              # CREATE — Web Audio API wrapper for SFX + soundtrack
├── projects-data.ts              # CREATE — project definitions (title, slug, description, tech, featured)
├── skills-data.ts                # CREATE — skill definitions (name, orbit, connections, proficiency)
└── pong-types.ts                 # KEEP — existing

hooks/
├── use-pong-input.ts             # KEEP — existing
├── use-reduced-motion.ts         # CREATE — prefers-reduced-motion hook
├── use-mouse-position.ts         # CREATE — normalized mouse position for tilt/physics
└── use-audio.ts                  # CREATE — audio playback hook with mute state
```

---

## Task 1: Foundation — Fonts, Palette, Global Styles

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Create: `lib/fonts.ts`

- [ ] **Step 1: Create font configuration**

Create `lib/fonts.ts`:

```typescript
import { Archivo, JetBrains_Mono } from "next/font/google";

export const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500"],
});
```

- [ ] **Step 2: Update layout.tsx with new fonts and metadata**

Replace `app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { archivo, jetbrainsMono } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yuri Bodo | Creative Frontend Developer",
  description:
    "Creative frontend developer crafting immersive web experiences with obsessive attention to animation and interaction.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${archivo.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Replace globals.css with Kubrick palette and typography**

Replace `app/globals.css`:

```css
@import "tailwindcss";

:root {
  /* Kubrick Cinema Palette */
  --background: #1a1a1a;
  --surface: #222222;
  --surface-hover: #2a2a2a;
  --foreground: #cfbfb6;
  --foreground-bright: #ede4df;
  --muted: #9f5454;
  --subtle: #45272f;
  --border: #2e2024;
  --accent: #fa4b12;
  --accent-dim: rgba(250, 75, 18, 0.15);
  --destructive: #ef4444;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-foreground-bright: var(--foreground-bright);
  --color-surface: var(--surface);
  --color-surface-hover: var(--surface-hover);
  --color-muted: var(--muted);
  --color-subtle: var(--subtle);
  --color-border: var(--border);
  --color-accent: var(--accent);
  --color-accent-dim: var(--accent-dim);
  --color-destructive: var(--destructive);

  --font-sans: var(--font-archivo);
  --font-mono: var(--font-jetbrains);

  --animate-blink: blink 1s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-archivo), system-ui, sans-serif;
}

::selection {
  background: rgba(250, 75, 18, 0.3);
  color: inherit;
}

canvas {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
```

- [ ] **Step 4: Verify fonts load and palette renders**

Run: `pnpm dev`
Open http://localhost:3000. Verify:
- Background is warm dark gray (#1a1a1a), not pure black
- Text renders in Archivo font (warm beige)
- No console errors about font loading

- [ ] **Step 5: Commit**

```bash
git add lib/fonts.ts app/layout.tsx app/globals.css
git commit -m "feat: replace fonts with Archivo + JetBrains Mono, apply Kubrick cinema palette"
```

---

## Task 2: Utility Hooks

**Files:**
- Create: `hooks/use-reduced-motion.ts`
- Create: `hooks/use-mouse-position.ts`

- [ ] **Step 1: Create reduced motion hook**

Create `hooks/use-reduced-motion.ts`:

```typescript
"use client";

import { useEffect, useState } from "react";

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    function handleChange(event: MediaQueryListEvent) {
      setPrefersReducedMotion(event.matches);
    }

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}
```

- [ ] **Step 2: Create mouse position hook**

Create `hooks/use-mouse-position.ts`:

```typescript
"use client";

import { useEffect, useRef } from "react";

interface MousePosition {
  x: number;
  y: number;
  normalizedX: number;
  normalizedY: number;
}

export function useMousePosition(
  containerRef: React.RefObject<HTMLElement | null>
): React.RefObject<MousePosition> {
  const positionRef = useRef<MousePosition>({
    x: 0,
    y: 0,
    normalizedX: 0.5,
    normalizedY: 0.5,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleMouseMove(event: MouseEvent) {
      const rect = container!.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      positionRef.current = {
        x,
        y,
        normalizedX: x / rect.width,
        normalizedY: y / rect.height,
      };
    }

    function handleTouchMove(event: TouchEvent) {
      const touch = event.touches[0];
      if (!touch) return;
      const rect = container!.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      positionRef.current = {
        x,
        y,
        normalizedX: x / rect.width,
        normalizedY: y / rect.height,
      };
    }

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("touchmove", handleTouchMove);
    };
  }, [containerRef]);

  return positionRef;
}
```

- [ ] **Step 3: Commit**

```bash
git add hooks/use-reduced-motion.ts hooks/use-mouse-position.ts
git commit -m "feat: add useReducedMotion and useMousePosition hooks"
```

---

## Task 3: Install New Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Pretext and Three.js**

Run:
```bash
pnpm add @chenglou/pretext three
pnpm add -D @types/three
```

- [ ] **Step 2: Verify install**

Run: `pnpm build`
Expected: builds successfully with no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: add @chenglou/pretext and three.js dependencies"
```

---

## Task 4: Audio System

**Files:**
- Create: `lib/audio-manager.ts`
- Create: `hooks/use-audio.ts`
- Create: `components/ui/audio-toggle.tsx`

- [ ] **Step 1: Create audio manager**

Create `lib/audio-manager.ts`:

```typescript
type SoundName = "boot" | "spawn" | "whoosh" | "card" | "achievement";

interface AudioManagerState {
  isMuted: boolean;
  audioContext: AudioContext | null;
  soundtrack: HTMLAudioElement | null;
  buffers: Map<SoundName, AudioBuffer>;
}

const state: AudioManagerState = {
  isMuted: typeof window !== "undefined"
    ? localStorage.getItem("audio-muted") === "true"
    : false,
  audioContext: null,
  soundtrack: null,
  buffers: new Map(),
};

function getContext(): AudioContext {
  if (!state.audioContext) {
    state.audioContext = new AudioContext();
  }
  return state.audioContext;
}

export async function loadSFX(name: SoundName, url: string): Promise<void> {
  const ctx = getContext();
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  state.buffers.set(name, audioBuffer);
}

export function playSFX(name: SoundName): void {
  if (state.isMuted) return;
  const buffer = state.buffers.get(name);
  if (!buffer) return;

  const ctx = getContext();
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gain = ctx.createGain();
  gain.gain.value = 0.3;

  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

export function startSoundtrack(url: string): void {
  if (state.soundtrack) return;

  const audio = new Audio(url);
  audio.loop = true;
  audio.volume = 0;
  state.soundtrack = audio;

  if (!state.isMuted) {
    audio.play().catch(() => {
      // Autoplay blocked — will retry on user gesture
    });
    fadeSoundtrackTo(0.2, 3000);
  }
}

function fadeSoundtrackTo(target: number, durationMs: number): void {
  if (!state.soundtrack) return;
  const audio = state.soundtrack;
  const start = audio.volume;
  const startTime = performance.now();

  function step(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / durationMs, 1);
    audio.volume = start + (target - start) * progress;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

export function toggleMute(): boolean {
  state.isMuted = !state.isMuted;
  localStorage.setItem("audio-muted", String(state.isMuted));

  if (state.soundtrack) {
    if (state.isMuted) {
      fadeSoundtrackTo(0, 500);
    } else {
      state.soundtrack.play().catch(() => {});
      fadeSoundtrackTo(0.2, 500);
    }
  }

  return state.isMuted;
}

export function getIsMuted(): boolean {
  return state.isMuted;
}

export function resumeOnGesture(): void {
  const ctx = state.audioContext;
  if (ctx && ctx.state === "suspended") {
    ctx.resume();
  }
  if (state.soundtrack && state.soundtrack.paused && !state.isMuted) {
    state.soundtrack.play().catch(() => {});
    fadeSoundtrackTo(0.2, 1000);
  }
}
```

- [ ] **Step 2: Create audio hook**

Create `hooks/use-audio.ts`:

```typescript
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getIsMuted,
  resumeOnGesture,
  toggleMute,
} from "@/lib/audio-manager";

export function useAudio() {
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    setIsMuted(getIsMuted());
  }, []);

  useEffect(() => {
    function handleInteraction() {
      resumeOnGesture();
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    }

    window.addEventListener("click", handleInteraction, { once: true });
    window.addEventListener("keydown", handleInteraction, { once: true });

    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, []);

  const toggle = useCallback(() => {
    const newMuted = toggleMute();
    setIsMuted(newMuted);
  }, []);

  return { isMuted, toggle };
}
```

- [ ] **Step 3: Create audio toggle component**

Create `components/ui/audio-toggle.tsx`:

```typescript
"use client";

import { useAudio } from "@/hooks/use-audio";

export function AudioToggle() {
  const { isMuted, toggle } = useAudio();

  return (
    <button
      onClick={toggle}
      className="fixed bottom-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted transition-all duration-300 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      aria-label={isMuted ? "Unmute audio" : "Mute audio"}
    >
      <span className="font-mono text-xs">
        {isMuted ? "OFF" : "ON"}
      </span>
    </button>
  );
}
```

- [ ] **Step 4: Verify audio toggle renders**

Add `<AudioToggle />` temporarily to `app/page.tsx`.
Run: `pnpm dev`
Verify: button appears bottom-right, toggles ON/OFF, no console errors.

- [ ] **Step 5: Commit**

```bash
git add lib/audio-manager.ts hooks/use-audio.ts components/ui/audio-toggle.tsx
git commit -m "feat: add audio system with Web Audio API, soundtrack, SFX, and mute toggle"
```

---

## Task 5: Data Definitions

**Files:**
- Create: `lib/projects-data.ts`
- Create: `lib/skills-data.ts`

- [ ] **Step 1: Create project data**

Create `lib/projects-data.ts`:

```typescript
export interface Project {
  slug: string;
  title: string;
  description: string;
  tech: string[];
  featured: boolean;
  links?: {
    live?: string;
    github?: string;
  };
}

export const projects: Project[] = [
  // Placeholder projects — Yuri will replace with real data
  {
    slug: "project-one",
    title: "Project One",
    description: "A description of the first project showcasing creative frontend work.",
    tech: ["React", "GSAP", "TypeScript"],
    featured: true,
  },
  {
    slug: "project-two",
    title: "Project Two",
    description: "Another project demonstrating animation and interaction craft.",
    tech: ["Next.js", "Three.js"],
    featured: false,
  },
  {
    slug: "project-three",
    title: "Project Three",
    description: "A third project exploring the boundaries of web interaction.",
    tech: ["Canvas", "Pretext"],
    featured: false,
  },
];
```

- [ ] **Step 2: Create skills data**

Create `lib/skills-data.ts`:

```typescript
export interface Skill {
  name: string;
  orbit: "inner" | "middle" | "outer";
  proficiency: number; // 0-1, affects node size
  connections: string[]; // names of connected skills
  description: string;
}

export const skills: Skill[] = [
  // Inner orbit — core skills
  { name: "React", orbit: "inner", proficiency: 0.9, connections: ["Next.js", "TypeScript"], description: "Component architecture, hooks, server components" },
  { name: "TypeScript", orbit: "inner", proficiency: 0.85, connections: ["React", "Next.js"], description: "Strict typing, generics, type inference" },
  { name: "Next.js", orbit: "inner", proficiency: 0.85, connections: ["React", "TypeScript"], description: "App Router, SSR, routing, API" },

  // Middle orbit — daily tools
  { name: "GSAP", orbit: "middle", proficiency: 0.9, connections: ["React"], description: "ScrollTrigger, SplitText, FLIP, timelines" },
  { name: "Tailwind", orbit: "middle", proficiency: 0.85, connections: ["React", "Next.js"], description: "Utility-first CSS, design systems" },
  { name: "Framer Motion", orbit: "middle", proficiency: 0.75, connections: ["React"], description: "Spring physics, layout animations, gestures" },

  // Outer orbit — specialized
  { name: "Three.js", orbit: "outer", proficiency: 0.6, connections: ["React", "GSAP"], description: "WebGL, 3D scenes, shaders, post-processing" },
  { name: "Pretext", orbit: "outer", proficiency: 0.5, connections: ["GSAP"], description: "Kinetic typography, Canvas text layout engine" },
  { name: "Web Audio", orbit: "outer", proficiency: 0.5, connections: ["GSAP"], description: "SFX, spatial audio, soundtrack management" },
];
```

- [ ] **Step 3: Commit**

```bash
git add lib/projects-data.ts lib/skills-data.ts
git commit -m "feat: add project and skills data definitions"
```

---

## Task 6: Sticky Header

**Files:**
- Create: `components/ui/header.tsx`

- [ ] **Step 1: Create header component**

Create `components/ui/header.tsx`:

```typescript
"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const SOCIAL_LINKS = [
  { label: "GitHub", href: "https://github.com/yuribodo", icon: "GH" },
  { label: "LinkedIn", href: "https://linkedin.com/in/yuribodo", icon: "LI" },
  { label: "Email", href: "mailto:contact@yuribodo.dev", icon: "EM" },
] as const;

export function Header() {
  const headerRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (!headerRef.current) return;

    gsap.fromTo(
      headerRef.current,
      { yPercent: -100, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        ease: "none",
        scrollTrigger: {
          trigger: "body",
          start: "top top",
          end: "+=600",
          scrub: true,
        },
      }
    );
  }, []);

  return (
    <header
      ref={headerRef}
      className="fixed top-0 left-0 z-40 flex w-full items-center justify-between border-b border-border bg-background/80 px-6 py-3 opacity-0 backdrop-blur-md"
    >
      <span className="font-sans text-sm font-black tracking-tight text-foreground-bright">
        YURI BODO
      </span>

      <nav className="flex items-center gap-4">
        {SOCIAL_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target={link.href.startsWith("http") ? "_blank" : undefined}
            rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
            className="font-mono text-xs text-subtle transition-colors duration-300 hover:text-accent"
            aria-label={link.label}
          >
            {link.icon}
          </a>
        ))}
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: Verify header appears on scroll**

Add `<Header />` to `app/page.tsx` temporarily.
Run: `pnpm dev`
Scroll down — header should fade in from top.

- [ ] **Step 3: Commit**

```bash
git add components/ui/header.tsx
git commit -m "feat: add sticky header with scroll-driven reveal"
```

---

## Task 7: Hero Section — Boot Sequence + Text Physics

This is the most complex task. Split into sub-steps.

**Files:**
- Create: `components/canvas/particle-engine.ts`
- Create: `components/canvas/text-particles.tsx`
- Create: `components/canvas/hero-scene.tsx`
- Create: `components/sections/hero.tsx`

- [ ] **Step 1: Create particle physics engine**

Create `components/canvas/particle-engine.ts`:

```typescript
export interface Particle {
  char: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  velocityX: number;
  velocityY: number;
  fontSize: number;
  color: string;
}

interface EngineConfig {
  springStiffness: number;
  damping: number;
  cursorRadius: number;
  cursorForce: number;
  breathAmplitude: number;
}

const DEFAULT_CONFIG: EngineConfig = {
  springStiffness: 0.03,
  damping: 0.85,
  cursorRadius: 120,
  cursorForce: 8,
  breathAmplitude: 0.5,
};

export class ParticleEngine {
  particles: Particle[] = [];
  private config: EngineConfig;
  private time = 0;

  constructor(config: Partial<EngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setParticles(particles: Particle[]): void {
    this.particles = particles;
  }

  update(cursorX: number, cursorY: number, deltaTime: number): void {
    this.time += deltaTime;

    for (const p of this.particles) {
      // Spring force toward target
      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      p.velocityX += dx * this.config.springStiffness;
      p.velocityY += dy * this.config.springStiffness;

      // Cursor repulsion
      const cdx = p.x - cursorX;
      const cdy = p.y - cursorY;
      const dist = Math.sqrt(cdx * cdx + cdy * cdy);
      if (dist < this.config.cursorRadius && dist > 0) {
        const force =
          (1 - dist / this.config.cursorRadius) * this.config.cursorForce;
        p.velocityX += (cdx / dist) * force;
        p.velocityY += (cdy / dist) * force;
      }

      // Breathing — micro-movement
      const breathX =
        Math.sin(this.time * 0.001 + p.targetX * 0.01) *
        this.config.breathAmplitude;
      const breathY =
        Math.cos(this.time * 0.0013 + p.targetY * 0.01) *
        this.config.breathAmplitude;
      p.velocityX += (breathX - (p.x - p.targetX)) * 0.002;
      p.velocityY += (breathY - (p.y - p.targetY)) * 0.002;

      // Damping
      p.velocityX *= this.config.damping;
      p.velocityY *= this.config.damping;

      // Apply velocity
      p.x += p.velocityX;
      p.y += p.velocityY;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.font = `900 ${p.fontSize}px Archivo, system-ui, sans-serif`;
      ctx.fillStyle = p.color;
      ctx.textBaseline = "middle";
      ctx.fillText(p.char, p.x, p.y);
    }
  }
}
```

- [ ] **Step 2: Create text particles canvas component**

Create `components/canvas/text-particles.tsx`:

```typescript
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Particle, ParticleEngine } from "./particle-engine";
import { useMousePosition } from "@/hooks/use-mouse-position";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface TextParticlesProps {
  text: string;
  fontSize: number;
  color: string;
  onBootComplete?: () => void;
}

const BOOT_LINES = [
  { text: "GAME_WORLD OS v2.0", delay: 0 },
  { text: "Initializing render engine... OK", delay: 400 },
  { text: "Loading protagonist... OK", delay: 800 },
  { text: "Preparing canvas... OK", delay: 1200 },
];

export function TextParticles({
  text,
  fontSize,
  color,
  onBootComplete,
}: TextParticlesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ParticleEngine>(new ParticleEngine());
  const animFrameRef = useRef<number>(0);
  const mousePos = useMousePosition(containerRef);
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<"boot" | "spawn" | "interactive">("boot");
  const bootLinesRef = useRef<HTMLDivElement>(null);

  // Measure text and create particles
  const createParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.font = `900 ${fontSize}px Archivo, system-ui, sans-serif`;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const startX = centerX - textWidth / 2;

    const particles: Particle[] = [];
    let offsetX = 0;

    for (const char of text) {
      if (char === " ") {
        offsetX += ctx.measureText(" ").width;
        continue;
      }
      const charWidth = ctx.measureText(char).width;
      const targetX = startX + offsetX + charWidth / 2;
      const targetY = centerY;

      // Start from random positions (explosion effect)
      const angle = Math.random() * Math.PI * 2;
      const dist = 200 + Math.random() * 300;
      particles.push({
        char,
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        targetX,
        targetY,
        velocityX: 0,
        velocityY: 0,
        fontSize,
        color,
      });
      offsetX += charWidth;
    }

    engineRef.current.setParticles(particles);
  }, [text, fontSize, color]);

  // Boot sequence
  useGSAP(() => {
    if (reducedMotion) {
      setPhase("interactive");
      onBootComplete?.();
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        setPhase("spawn");
        createParticles();
        // Fade boot lines
        gsap.to(bootLinesRef.current, {
          opacity: 0,
          duration: 0.5,
          onComplete: () => {
            setPhase("interactive");
            onBootComplete?.();
          },
        });
      },
    });

    // Animate boot lines in
    BOOT_LINES.forEach((line, i) => {
      tl.fromTo(
        `[data-boot-line="${i}"]`,
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" },
        line.delay / 1000
      );
    });
  }, [reducedMotion]);

  // Canvas render loop
  useEffect(() => {
    if (phase !== "spawn" && phase !== "interactive") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx!.scale(dpr, dpr);
    }
    resize();
    window.addEventListener("resize", resize);

    let lastTime = performance.now();
    function loop(now: number) {
      const delta = now - lastTime;
      lastTime = now;

      ctx!.clearRect(0, 0, canvas!.width / dpr, canvas!.height / dpr);
      engineRef.current.update(
        mousePos.current.x,
        mousePos.current.y,
        delta
      );
      engineRef.current.render(ctx!);
      animFrameRef.current = requestAnimationFrame(loop);
    }
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [phase, mousePos]);

  // Reduced motion: static render
  if (reducedMotion) {
    return (
      <div
        ref={containerRef}
        className="flex h-screen w-full items-center justify-center"
      >
        <h1
          className="font-sans text-foreground-bright"
          style={{ fontSize, fontWeight: 900, letterSpacing: "-2px" }}
        >
          {text}
        </h1>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-screen w-full">
      {/* Boot sequence overlay */}
      {phase === "boot" && (
        <div
          ref={bootLinesRef}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2"
        >
          {BOOT_LINES.map((line, i) => (
            <div
              key={i}
              data-boot-line={i}
              className="font-mono text-sm text-subtle opacity-0"
            >
              {line.text}
            </div>
          ))}
        </div>
      )}

      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ imageRendering: "auto" }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create Three.js hero scene**

Create `components/canvas/hero-scene.tsx`:

```typescript
"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export function HeroScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Icosahedron with wireframe
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0x45272f,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Warm rim light
    const light = new THREE.PointLight(0xfa4b12, 2, 10);
    light.position.set(2, 2, 3);
    scene.add(light);

    function resize() {
      const rect = container!.getBoundingClientRect();
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      renderer.setSize(rect.width, rect.height);
    }
    resize();
    window.addEventListener("resize", resize);

    let mouseX = 0;
    let mouseY = 0;
    function handleMouse(e: MouseEvent) {
      const rect = container!.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    }
    window.addEventListener("mousemove", handleMouse);

    let animFrame = 0;
    function animate() {
      animFrame = requestAnimationFrame(animate);
      mesh.rotation.x += 0.002;
      mesh.rotation.y += 0.003;
      mesh.rotation.x += (mouseY * 0.5 - mesh.rotation.x) * 0.02;
      mesh.rotation.y += (mouseX * 0.5 - mesh.rotation.y) * 0.02;
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouse);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute right-[10%] top-1/2 h-[300px] w-[300px] -translate-y-1/2 opacity-30"
    />
  );
}
```

- [ ] **Step 4: Create hero section component**

Create `components/sections/hero.tsx`:

```typescript
"use client";

import { useRef } from "react";
import { TextParticles } from "@/components/canvas/text-particles";
import { HeroScene } from "@/components/canvas/hero-scene";
import { startSoundtrack } from "@/lib/audio-manager";

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);

  function handleBootComplete() {
    startSoundtrack("/audio/soundtrack.mp3");
  }

  return (
    <section ref={sectionRef} className="relative h-screen w-full overflow-hidden">
      <TextParticles
        text="YURI BODO"
        fontSize={72}
        color="#ede4df"
        onBootComplete={handleBootComplete}
      />
      <HeroScene />

      {/* Subtitle — appears after boot */}
      <div className="pointer-events-none absolute bottom-[20%] left-1/2 -translate-x-1/2 text-center">
        <p className="font-sans text-sm font-semibold uppercase tracking-[4px] text-muted">
          Creative Frontend Developer
        </p>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-xs text-subtle">
        SCROLL ▼
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Verify hero renders**

Replace `app/page.tsx` content with:
```typescript
import { Hero } from "@/components/sections/hero";

export default function Home() {
  return (
    <main>
      <Hero />
    </main>
  );
}
```

Run: `pnpm dev`
Verify: boot sequence plays, name appears as particles, cursor repels letters, 3D icosahedron visible.

- [ ] **Step 6: Commit**

```bash
git add components/canvas/ components/sections/hero.tsx app/page.tsx
git commit -m "feat: add hero section with boot sequence, text physics, and 3D scene"
```

---

## Task 8: About Section

**Files:**
- Create: `components/sections/about.tsx`

- [ ] **Step 1: Create about section**

Create `components/sections/about.tsx`:

```typescript
"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const PARAGRAPHS = [
  "Sou Yuri Bodo, desenvolvedor frontend criativo do Brasil. Meu trabalho vive na interseção entre código e arte — onde animações têm propósito e interações contam histórias.",
  "Cresci jogando Pokémon, duelando Yu-Gi-Oh e estudando xadrez. Esses jogos me ensinaram paciência, estratégia e a importância de cada detalhe. Aplico isso em tudo que construo.",
  "Minha stack favorita envolve React, TypeScript, GSAP e qualquer coisa que me permita empurrar os limites do que a web pode fazer.",
];

export function About() {
  const sectionRef = useRef<HTMLElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      // Label
      gsap.from(labelRef.current, {
        opacity: 0,
        scale: 0.95,
        duration: 0.4,
        ease: "power2.out",
        scrollTrigger: {
          trigger: labelRef.current,
          start: "top 85%",
        },
      });

      // Headline — SplitText-style char stagger via manual split
      if (headlineRef.current) {
        gsap.from(headlineRef.current, {
          opacity: 0,
          y: 30,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: headlineRef.current,
            start: "top 80%",
          },
        });
      }

      // Paragraphs
      gsap.utils.toArray<HTMLElement>("[data-about-paragraph]").forEach((el, i) => {
        gsap.from(el, {
          opacity: 0,
          y: 20,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
          },
          delay: i * 0.1,
        });
      });
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} className="relative min-h-screen px-6 py-32">
      <div className="mx-auto max-w-2xl">
        <div
          ref={labelRef}
          className="mb-8 font-sans text-xs font-semibold uppercase tracking-[4px] text-subtle"
        >
          002 — About
        </div>

        <h2
          ref={headlineRef}
          className="mb-12 font-sans text-3xl font-black leading-tight tracking-tight text-foreground-bright md:text-4xl"
        >
          Cada interface que eu construo é uma{" "}
          <span className="text-accent">jogada calculada</span>.
        </h2>

        <div className="flex flex-col gap-8">
          {PARAGRAPHS.map((text, i) => (
            <p
              key={i}
              data-about-paragraph
              className="border-l-2 border-border pl-4 font-sans text-sm leading-relaxed text-muted md:text-base"
            >
              {text}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add About to page and verify**

Add `<About />` to `app/page.tsx` after `<Hero />`.
Run: `pnpm dev`
Scroll to About — verify label, headline, paragraphs animate in.

- [ ] **Step 3: Commit**

```bash
git add components/sections/about.tsx app/page.tsx
git commit -m "feat: add about section with scroll-triggered reveal animations"
```

---

## Task 9: Project Cards + Deck Section

**Files:**
- Create: `components/ui/project-card.tsx`
- Create: `components/sections/projects.tsx`

- [ ] **Step 1: Create project card with holographic tilt**

Create `components/ui/project-card.tsx`:

```typescript
"use client";

import { useRef } from "react";
import type { Project } from "@/lib/projects-data";

interface ProjectCardProps {
  project: Project;
  isActive: boolean;
}

export function ProjectCard({ project, isActive }: ProjectCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -20;
    card.style.transform = `perspective(600px) rotateY(${x}deg) rotateX(${y}deg) scale(${isActive ? 1.05 : 1})`;
  }

  function handleMouseLeave() {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = `perspective(600px) rotateY(0deg) rotateX(0deg) scale(1)`;
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-[280px] flex-shrink-0 cursor-pointer overflow-hidden rounded-lg border bg-surface transition-all duration-300 md:w-[320px] ${
        project.featured
          ? "border-accent shadow-[0_0_30px_rgba(250,75,18,0.08)]"
          : "border-border"
      }`}
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* Holographic overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-accent-dim to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Preview area */}
      <div className="h-[160px] bg-surface-hover md:h-[180px]" />

      {/* Content */}
      <div className="p-4">
        <h3 className="font-sans text-base font-bold text-foreground-bright">
          {project.title}
          {project.featured && (
            <span className="ml-2 text-accent">★</span>
          )}
        </h3>
        <p className="mt-1 font-sans text-xs leading-relaxed text-muted">
          {project.description}
        </p>
        <div className="mt-3 flex flex-wrap gap-1">
          {project.tech.map((tech) => (
            <span
              key={tech}
              className={`rounded font-mono text-[10px] px-2 py-0.5 ${
                project.featured
                  ? "border border-accent/30 text-accent"
                  : "border border-border text-subtle"
              }`}
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create projects deck section**

Create `components/sections/projects.tsx`:

```typescript
"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ProjectCard } from "@/components/ui/project-card";
import { projects } from "@/lib/projects-data";

gsap.registerPlugin(ScrollTrigger);

export function Projects() {
  const sectionRef = useRef<HTMLElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useGSAP(
    () => {
      // Label
      gsap.from(labelRef.current, {
        opacity: 0,
        scale: 0.95,
        duration: 0.4,
        ease: "power2.out",
        scrollTrigger: { trigger: labelRef.current, start: "top 85%" },
      });

      // Cards stagger entrance
      const cards = gsap.utils.toArray<HTMLElement>("[data-project-card]");
      cards.forEach((card, i) => {
        gsap.from(card, {
          opacity: 0,
          x: 60,
          rotation: 5 + i * 2,
          duration: 0.6,
          ease: "power3.out",
          scrollTrigger: { trigger: deckRef.current, start: "top 80%" },
          delay: i * 0.1,
        });
      });
    },
    { scope: sectionRef }
  );

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const cardWidth = 320 + 16; // card width + gap
    const index = Math.round(el.scrollLeft / cardWidth);
    setActiveIndex(Math.min(index, projects.length - 1));
  }

  return (
    <section ref={sectionRef} className="relative min-h-screen py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div
          ref={labelRef}
          className="mb-8 font-sans text-xs font-semibold uppercase tracking-[4px] text-subtle"
        >
          003 — Projects
        </div>

        <h2 className="mb-12 font-sans text-3xl font-black tracking-tight text-foreground-bright md:text-4xl">
          O deck.
        </h2>
      </div>

      {/* Horizontal scroll deck */}
      <div
        ref={deckRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-8 scrollbar-hide md:px-[calc(50vw-160px)]"
      >
        {projects.map((project, i) => (
          <div key={project.slug} data-project-card className="snap-center">
            <ProjectCard project={project} isActive={i === activeIndex} />
          </div>
        ))}
      </div>

      {/* Scroll indicator dots */}
      <div className="mt-4 flex justify-center gap-2">
        {projects.map((_, i) => (
          <div
            key={i}
            className={`h-[3px] rounded-full transition-all duration-300 ${
              i === activeIndex
                ? "w-5 bg-accent"
                : "w-2 bg-border"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Add Projects to page and verify**

Add `<Projects />` to `app/page.tsx` after `<About />`.
Run: `pnpm dev`
Verify: cards fan in from right, horizontal scroll works, tilt effect on hover, active card highlighted.

- [ ] **Step 4: Commit**

```bash
git add components/ui/project-card.tsx components/sections/projects.tsx app/page.tsx
git commit -m "feat: add projects deck section with holographic tilt cards"
```

---

## Task 10: Skills — Solar System Orbits

**Files:**
- Create: `components/ui/skill-node.tsx`
- Create: `components/sections/skills.tsx`

- [ ] **Step 1: Create skill node**

Create `components/ui/skill-node.tsx`:

```typescript
"use client";

import { useState } from "react";
import type { Skill } from "@/lib/skills-data";

interface SkillNodeProps {
  skill: Skill;
  angle: number;
  radius: number;
  isPaused: boolean;
  isHighlighted: boolean;
  onHover: (name: string | null) => void;
}

export function SkillNode({
  skill,
  angle,
  radius,
  isPaused,
  isHighlighted,
  onHover,
}: SkillNodeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const size = 32 + skill.proficiency * 24; // 32-56px based on proficiency

  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  function handleMouseEnter() {
    setShowTooltip(true);
    onHover(skill.name);
  }

  function handleMouseLeave() {
    setShowTooltip(false);
    onHover(null);
  }

  return (
    <div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
      style={{
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`flex items-center justify-center rounded-full border bg-surface font-mono text-[10px] transition-all duration-300 ${
          isHighlighted
            ? "border-accent text-accent shadow-[0_0_16px_rgba(250,75,18,0.2)]"
            : "border-muted/30 text-muted"
        } ${isPaused && showTooltip ? "scale-125" : ""}`}
        style={{ width: size, height: size }}
      >
        {skill.name}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded border border-border bg-surface px-3 py-2 text-center shadow-lg">
          <div className="font-sans text-xs font-bold text-foreground-bright">
            {skill.name}
          </div>
          <div className="mt-1 font-sans text-[10px] text-muted">
            {skill.description}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create skills orbit section**

Create `components/sections/skills.tsx`:

```typescript
"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SkillNode } from "@/components/ui/skill-node";
import { skills } from "@/lib/skills-data";

gsap.registerPlugin(ScrollTrigger);

const ORBIT_RADII = { inner: 100, middle: 170, outer: 240 } as const;
const ORBIT_SPEEDS = { inner: 0.0003, middle: 0.0002, outer: 0.00015 } as const;

export function Skills() {
  const sectionRef = useRef<HTMLElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);
  const [angles, setAngles] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>();
    const groups = { inner: 0, middle: 0, outer: 0 };
    const counts = { inner: 0, middle: 0, outer: 0 };

    for (const s of skills) counts[s.orbit]++;
    for (const s of skills) {
      const step = (Math.PI * 2) / counts[s.orbit];
      map.set(s.name, groups[s.orbit] * step);
      groups[s.orbit]++;
    }
    return map;
  });

  // Orbit animation
  useGSAP(
    () => {
      const ctx = gsap.context(() => {
        gsap.ticker.add(() => {
          if (hoveredSkill) return; // pause on hover

          setAngles((prev) => {
            const next = new Map(prev);
            for (const s of skills) {
              const current = next.get(s.name) ?? 0;
              next.set(s.name, current + ORBIT_SPEEDS[s.orbit]);
            }
            return next;
          });
        });
      });

      // Entrance animation
      gsap.from(labelRef.current, {
        opacity: 0,
        scale: 0.95,
        duration: 0.4,
        ease: "power2.out",
        scrollTrigger: { trigger: labelRef.current, start: "top 85%" },
      });

      gsap.from(orbitRef.current, {
        opacity: 0,
        scale: 0.8,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: orbitRef.current, start: "top 80%" },
      });

      return () => ctx.revert();
    },
    { scope: sectionRef, dependencies: [hoveredSkill] }
  );

  function handleHover(name: string | null) {
    setHoveredSkill(name);
  }

  const hoveredConnections = hoveredSkill
    ? skills.find((s) => s.name === hoveredSkill)?.connections ?? []
    : [];

  return (
    <section ref={sectionRef} className="relative min-h-screen px-6 py-32">
      <div className="mx-auto max-w-2xl text-center">
        <div
          ref={labelRef}
          className="mb-8 font-sans text-xs font-semibold uppercase tracking-[4px] text-subtle"
        >
          004 — Skills
        </div>

        <h2 className="mb-16 font-sans text-3xl font-black tracking-tight text-foreground-bright md:text-4xl">
          O sistema.
        </h2>
      </div>

      {/* Orbit visualization */}
      <div
        ref={orbitRef}
        className="relative mx-auto h-[500px] w-[500px] max-w-full"
      >
        {/* Orbit lines */}
        {(["inner", "middle", "outer"] as const).map((orbit) => (
          <div
            key={orbit}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border"
            style={{
              width: ORBIT_RADII[orbit] * 2,
              height: ORBIT_RADII[orbit] * 2,
            }}
          />
        ))}

        {/* Center node */}
        <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-accent bg-surface font-sans text-xs font-black text-accent shadow-[0_0_20px_rgba(250,75,18,0.15)]">
          YB
        </div>

        {/* Skill nodes */}
        {skills.map((skill) => (
          <SkillNode
            key={skill.name}
            skill={skill}
            angle={angles.get(skill.name) ?? 0}
            radius={ORBIT_RADII[skill.orbit]}
            isPaused={hoveredSkill !== null}
            isHighlighted={
              skill.name === hoveredSkill ||
              hoveredConnections.includes(skill.name)
            }
            onHover={handleHover}
          />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Add Skills to page and verify**

Add `<Skills />` to `app/page.tsx` after `<Projects />`.
Run: `pnpm dev`
Verify: orbit rings visible, nodes orbit slowly, hover pauses orbit and shows tooltip, connected nodes highlight.

- [ ] **Step 4: Commit**

```bash
git add components/ui/skill-node.tsx components/sections/skills.tsx app/page.tsx
git commit -m "feat: add skills section with solar system orbit visualization"
```

---

## Task 11: Project Detail Pages

**Files:**
- Create: `app/projects/[slug]/page.tsx`

- [ ] **Step 1: Create project detail page**

Create `app/projects/[slug]/page.tsx`:

```typescript
import { notFound } from "next/navigation";
import Link from "next/link";
import { projects } from "@/lib/projects-data";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();

  return (
    <main className="min-h-screen px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/#projects"
          className="mb-8 inline-block font-mono text-xs text-subtle transition-colors duration-300 hover:text-accent"
        >
          ← Back to deck
        </Link>

        <h1 className="font-sans text-4xl font-black tracking-tight text-foreground-bright md:text-5xl">
          {project.title}
        </h1>

        <p className="mt-4 font-sans text-base leading-relaxed text-muted">
          {project.description}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {project.tech.map((tech) => (
            <span
              key={tech}
              className="rounded border border-border px-3 py-1 font-mono text-xs text-subtle"
            >
              {tech}
            </span>
          ))}
        </div>

        {project.links && (
          <div className="mt-8 flex gap-4">
            {project.links.live && (
              <a
                href={project.links.live}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border border-accent px-4 py-2 font-mono text-xs text-accent transition-colors duration-300 hover:bg-accent hover:text-background"
              >
                Live Demo →
              </a>
            )}
            {project.links.github && (
              <a
                href={project.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border border-border px-4 py-2 font-mono text-xs text-subtle transition-colors duration-300 hover:border-accent hover:text-accent"
              >
                GitHub →
              </a>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify project pages**

Run: `pnpm dev`
Navigate to http://localhost:3000/projects/project-one
Verify: project title, description, tech tags render. Back link works.

- [ ] **Step 3: Commit**

```bash
git add app/projects/
git commit -m "feat: add dedicated project detail pages with dynamic routing"
```

---

## Task 12: Easter Eggs — Konami Code + Pong Trigger

**Files:**
- Create: `components/easter-eggs/konami-code.tsx`

- [ ] **Step 1: Create Konami code listener**

Create `components/easter-eggs/konami-code.tsx`:

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const PongGame = dynamic(
  () => import("@/components/pong/pong-game").then((m) => m.default),
  { ssr: false }
);

const KONAMI_SEQUENCE = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "b", "a",
];

export function KonamiCode() {
  const [isActive, setIsActive] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isActive) return;

      if (e.key === KONAMI_SEQUENCE[indexRef.current]) {
        indexRef.current++;
        if (indexRef.current === KONAMI_SEQUENCE.length) {
          setIsActive(true);
          indexRef.current = 0;
        }
      } else {
        indexRef.current = 0;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <PongGame />
      <button
        onClick={() => setIsActive(false)}
        className="fixed right-4 top-4 z-[101] rounded border border-border bg-surface px-3 py-1 font-mono text-xs text-muted transition-colors duration-300 hover:text-accent"
      >
        ESC
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify Konami code activates Pong**

Add `<KonamiCode />` to `app/page.tsx`.
Run: `pnpm dev`
Type the Konami code (↑↑↓↓←→←→BA). Verify: Pong game launches fullscreen. ESC button closes it.

- [ ] **Step 3: Commit**

```bash
git add components/easter-eggs/konami-code.tsx app/page.tsx
git commit -m "feat: add Konami code easter egg to trigger Pong game"
```

---

## Task 13: Compose Full Page + Final Integration

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Compose all sections into the final page**

Replace `app/page.tsx`:

```typescript
import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { Projects } from "@/components/sections/projects";
import { Skills } from "@/components/sections/skills";
import { Header } from "@/components/ui/header";
import { AudioToggle } from "@/components/ui/audio-toggle";
import { KonamiCode } from "@/components/easter-eggs/konami-code";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <About />
        <section id="projects">
          <Projects />
        </section>
        <Skills />
      </main>
      <AudioToggle />
      <KonamiCode />
    </>
  );
}
```

- [ ] **Step 2: Verify full page scroll experience**

Run: `pnpm dev`
Test end-to-end:
- Hero boot → particles → cursor interaction
- Scroll → header fades in
- About → scroll reveal paragraphs
- Projects → deck scroll, card tilt
- Skills → orbiting nodes, hover pause
- Audio toggle works
- Konami code triggers Pong

- [ ] **Step 3: Build check**

Run: `pnpm build`
Expected: no TypeScript errors, no lint warnings.

Run: `pnpm lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: compose full portfolio page with all sections integrated"
```

---

## Task 14: Polish + Reduced Motion + Scrollbar Hide

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add utility styles**

Add to `app/globals.css`:

```css
/* Scrollbar hide for deck */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Verify reduced motion**

In browser DevTools, enable "Prefer reduced motion".
Refresh page. Verify: no boot sequence, no particle animation, static layout, content still readable.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: add scrollbar-hide utility and prefers-reduced-motion support"
```

---

## Verification Checklist

After all tasks:

- [ ] `pnpm build` — no errors
- [ ] `pnpm lint` — no warnings
- [ ] Hero: boot sequence → text physics → cursor interaction → scroll morph to header
- [ ] About: scroll-triggered paragraph reveals
- [ ] Projects: deck scroll, card holographic tilt, active card state
- [ ] Skills: orbiting nodes, hover pause, tooltip, connected highlights
- [ ] Project pages: `/projects/[slug]` renders correctly
- [ ] Audio: toggle works, soundtrack fades, no autoplay
- [ ] Easter egg: Konami code → Pong
- [ ] Mobile: touch works for card tilt, particle push
- [ ] Reduced motion: static fallback for all animations
- [ ] Palette: warm Kubrick tones throughout, burnt orange accent surgical
- [ ] Typography: Archivo headlines, JetBrains Mono code elements
