import { createDither } from "./dither";

// Monitor preview shares the Hero's palette and grain. During the approach
// the grain resolves and the preview text dissolves into the real page.

export const SCREEN_CANVAS_WIDTH = 1024;
export const SCREEN_CANVAS_HEIGHT = 512;

export type ScreenMode = "idle" | "diving";

interface PaintScreenOptions {
  mode: ScreenMode;
  /** Driven by transition.ts during dive (0→1). Tightens dither toward
   *  the end of the dolly so the screen "resolves" as you arrive. */
  progress: number;
  /** Animation clock for the gradient sweep. */
  time: number;
}

const dither = createDither();

const GRADIENT_TIME_SCALE = 0.0003;
const GRADIENT_STOPS = [
  { stop: 0, color: "#1a1a1a" },
  { stop: 0.3, color: "#45272f" },
  { stop: 0.5, color: "#2e2024" },
  { stop: 0.7, color: "#9f5454" },
  { stop: 1, color: "#1a1a1a" },
] as const;
const RADIAL_HOT = "rgba(250, 75, 18, 0.18)";

// Slightly heavier dither than Hero's resting state — the monitor is a
// "smaller window" so the dither pattern reads more like CRT pixel grain.
const IDLE_DITHER = 0.55;
const DIVE_DITHER_END = 0.4;

export function paintScreen(
  canvas: HTMLCanvasElement,
  opts: PaintScreenOptions,
): void {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  drawHeroGradient(ctx, w, h, opts.time);

  const ditherStrength = ditherStrengthFor(opts);
  if (ditherStrength > 0.01) applyDither(ctx, w, h, ditherStrength);

  // Dissolve the preview title before the real DOM title enters; their
  // responsive layouts differ, so overlapping both creates a double image.
  ctx.save();
  if (opts.mode === "diving") {
    ctx.globalAlpha = 1 - Math.max(0, Math.min(1, (opts.progress - 0.65) / 0.3));
  }
  drawHeroText(ctx, w, h);
  ctx.restore();
}

function ditherStrengthFor(opts: PaintScreenOptions): number {
  switch (opts.mode) {
    case "idle":
      return IDLE_DITHER;
    case "diving":
      // Resolve toward the same grain strength as the real Hero.
      return IDLE_DITHER + (DIVE_DITHER_END - IDLE_DITHER) * opts.progress;
  }
}

function drawHeroGradient(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
): void {
  const t = time * GRADIENT_TIME_SCALE;

  const grad = ctx.createLinearGradient(
    w * (0.3 + Math.sin(t) * 0.2),
    0,
    w * (0.7 + Math.cos(t * 0.7) * 0.2),
    h,
  );
  for (const { stop, color } of GRADIENT_STOPS) {
    grad.addColorStop(stop, color);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const grad2 = ctx.createRadialGradient(
    w * (0.5 + Math.sin(t * 1.3) * 0.3),
    h * (0.5 + Math.cos(t * 0.9) * 0.3),
    0,
    w * 0.5,
    h * 0.5,
    w * 0.6,
  );
  grad2.addColorStop(0, RADIAL_HOT);
  grad2.addColorStop(1, "transparent");
  ctx.fillStyle = grad2;
  ctx.fillRect(0, 0, w, h);
}

function applyDither(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strength: number,
): void {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  dither(data, w, h, strength);

  ctx.putImageData(imageData, 0, 0);
}

// Hero's --accent token resolves to #fa4b12. Matching exactly so the
// "YURI white / BODO orange" split on the monitor → Hero handoff has no
// visible colour shift.
const ACCENT_HEX = "#fa4b12";

function drawHeroText(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  // Sizes are tuned so that when the dive ends and the screen mesh fills
  // the viewport, "YURI BODO" lands at roughly the same visual size as
  // Hero's `lg:text-[140px]` h1 (140px on a 1400px+ viewport). Larger
  // canvas text scaled to viewport produced a visible "text shrink"
  // layout shift at the moment of the fade handoff.
  const fontSize = Math.round(h * 0.16);
  const font = `900 ${fontSize}px "Geist", "Inter", sans-serif`;

  ctx.save();
  // "difference" composite mirrors Hero's `mix-blend-difference` — text
  // inverts against the gradient so it stays readable over both dark and
  // warm regions.
  ctx.globalCompositeOperation = "difference";
  ctx.font = font;
  ctx.textBaseline = "middle";

  // Two coloured runs around the visual centre, same layout as Hero's
  // two adjacent <span>s with a thin separator.
  ctx.textAlign = "left";
  const yuri = "YURI";
  const bodo = "BODO";
  const gap = fontSize * 0.22;
  const yuriW = ctx.measureText(yuri).width;
  const bodoW = ctx.measureText(bodo).width;
  const totalW = yuriW + gap + bodoW;
  const startX = w / 2 - totalW / 2;
  const yMid = h / 2;

  ctx.fillStyle = "#ffffff";
  ctx.fillText(yuri, startX, yMid);

  ctx.fillStyle = ACCENT_HEX;
  ctx.fillText(bodo, startX + yuriW + gap, yMid);
  ctx.restore();

  // Subtitle reads against the warm midtones — no blend needed.
  // Sized to match Hero's `text-xs md:text-sm` (~14px at desktop scale).
  ctx.save();
  ctx.fillStyle = "rgba(220, 220, 220, 0.55)";
  const subSize = Math.round(h * 0.024);
  ctx.font = `600 ${subSize}px "Geist", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "4px";
  ctx.fillText("FULL STACK ENGINEER", w / 2, yMid + h * 0.13);
  ctx.restore();
}
