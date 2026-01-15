# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**yuribodo-portfolio** is a personal portfolio website designed to be an "awesome website" with impeccable animations and premium visual quality. The goal is to create a memorable, high-impact experience showcasing work and skills.

### Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 |
| Animations | GSAP, Framer Motion |
| Package Manager | pnpm |

### Scripts

```bash
pnpm dev          # Dev server at http://localhost:3000
pnpm build        # Production build
pnpm start        # Production server
pnpm lint         # ESLint
```

---

## Core Principles

### Type Safety

- **NEVER** use `any` - always type correctly, infer with `satisfies` and `as const`
- Prefer `interface` for objects, `type` for unions and intersections
- Export types alongside related components/functions

### Clean Code

- Descriptive names with auxiliary verbs: `isLoading`, `hasError`, `canAnimate`
- Small functions with single responsibility
- Early returns to reduce nesting
- Components with max 150-200 lines

---

## Project Structure

```
yuribodo-portfolio/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout with fonts/metadata
│   ├── page.tsx                 # Home page
│   ├── globals.css              # Global styles + Tailwind
│   └── [routes]/                # Additional pages
│
├── components/                   # React components
│   ├── ui/                      # Reusable UI primitives
│   ├── sections/                # Page sections (Hero, About, Projects)
│   └── animations/              # Animation wrappers and effects
│
├── lib/
│   ├── utils.ts                 # cn() utility (clsx + tailwind-merge)
│   └── animations.ts            # GSAP/Motion animation presets
│
├── hooks/                        # Custom React hooks
│   └── use-gsap.ts              # GSAP ScrollTrigger hooks
│
└── public/                       # Static assets
```

### Naming Conventions

- Components and files: `kebab-case.tsx`
- Hooks: `use-name.ts`
- Constants: `SCREAMING_SNAKE_CASE`
- Variables and functions: `camelCase`

---

## React Components

### Rules

- **Server Components by default** - `"use client"` only when needed (hooks, events, browser APIs)
- Path alias: Use `@/` for imports from project root
- Always type props with interface
- Forward ref when needed for animation libraries

### Import Order

1. React/Next
2. External libs (GSAP, Framer Motion)
3. UI components
4. Internal components
5. Hooks
6. Utils
7. Types

---

## Animations

### Philosophy

This is an **awesome website** - animations should be:
- **Intentional**: Every animation has a purpose
- **Polished**: Smooth, high-quality motion
- **Performant**: Never sacrifice UX for effects
- **Accessible**: Respect user preferences

### GSAP Guidelines

```typescript
"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
```

- Use `useGSAP` hook for automatic cleanup
- Register plugins once at module level
- Prefer timeline animations for sequences
- Use ScrollTrigger for scroll-based animations

### Framer Motion Guidelines

- Create client wrappers in `components/animations/` for Server Components
- Define reusable variants in `lib/animations.ts`
- Use `AnimatePresence` for exit animations

### Animation Rules

- Use GPU-friendly properties: `transform`, `opacity`
- **Never** use `transition: all`
- Animations must be interruptible by user
- Set correct `transform-origin` for scale animations
- Stagger animations with appropriate delays
- Respect `prefers-reduced-motion`:

```typescript
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;
```

### Performance

- Prefer CSS over JS for simple animations
- Use `will-change` sparingly and remove after animation
- Avoid animating layout properties (width, height, top, left)
- Test with CPU throttling enabled

---

## Interactions

### Keyboard & Focus

- All interactions keyboard-operable
- Visible focus ring on focusable elements (`:focus-visible`)
- "Skip to content" link

### Hit Targets

- Minimum 24px desktop, 44px mobile
- No dead zones - clickable areas match visual elements

### Links vs Buttons

- `<Link>` for navigation
- `<button>` for actions
- Never `<div>` for interactive elements

---

## Styling

### Tailwind CSS 4

- Utility-first approach
- Dark mode: `dark:` prefix (system preference detection)
- Theme colors as CSS variables in `globals.css`
- Fonts: `--font-geist-sans` and `--font-geist-mono`

### Design Rules

- **NEVER** hardcode colors - use CSS variables or Tailwind semantic classes
- Layered shadows (ambient + direct) for depth
- Nested radii: child ≤ parent
- Semi-transparent borders improve clarity

### CSS Variables

```css
/* Use semantic variables */
--background, --foreground
--primary, --primary-foreground
--muted, --muted-foreground
--border, --ring
--radius
```

---

## Layout

### Responsiveness

- Mobile-first approach
- Test: mobile, laptop, ultra-wide
- Prefer flex/grid over JS measurements
- Avoid excessive scrollbars

### Alignment

- Optical alignment when perception beats geometry (±1px)
- Every element aligns with something intentionally

---

## Performance

### Assets

- Use `next/image` for all images (optimization, lazy loading)
- Use `next/font` for fonts (already configured)
- Preload only above-the-fold content
- Explicit image dimensions (avoid CLS)

### Rendering

- Minimize re-renders
- Virtualize large lists if needed
- Move heavy calculations to useMemo/useCallback

---

## Code Checklist

Before committing:

- [ ] TypeScript without errors, no `any`
- [ ] ESLint without warnings
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Tested on mobile and desktop
- [ ] Keyboard navigation works
- [ ] Focus states visible
- [ ] Dark mode tested
