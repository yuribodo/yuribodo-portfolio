// Monitor screen render — the visual "portal" that hands off to Hero.
//
// Three modes:
//   - idle:    dithered preview of the site (animated gradient + "YURI BODO"
//              text) — feels like the site is already running on the
//              monitor, waiting for you.
//   - glitch:  200ms channel-change beat triggered on click — horizontal
//              tearing + cheap RGB shift via offset composites. Punctuates
//              the click without typing terminal text.
//   - diving:  same look as idle but dither tightens as the camera dollies
//              in (progress 0→1). At t=1.60s of the transition the lobby
//              container fades; Hero (already mounted under) takes over —
//              because the palette / text / dither all match, the handoff
//              reads as visual continuity rather than a cut.
//
// Palette + gradient + Bayer dither are intentionally identical to Hero's
// own render loop (components/sections/hero.tsx). That match IS the trick.

export const SCREEN_CANVAS_WIDTH = 1024;
export const SCREEN_CANVAS_HEIGHT = 512;

export type ScreenMode = "idle" | "glitch" | "diving";

interface PaintScreenOptions {
  mode: ScreenMode;
  /** Driven by transition.ts during dive (0→1). Tightens dither toward
   *  the end of the dolly so the screen "resolves" as you arrive. */
  progress: number;
  /** Animation clock — performance.now() is the natural source. Drives
   *  the gradient sweep and per-frame glitch jitter seeds. */
  time: number;
  /** 0→1, only used in "glitch" mode. The caller ramps it down across
   *  the 200ms glitch window so the beat decays naturally. */
  glitchIntensity?: number;
}

// 4x4 ordered Bayer matrix — same as Hero. Lifted into a normalised
// table so the inner pixel loop avoids a division per channel.
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
const BAYER_NORMALIZED = BAYER_4X4.map((row) => row.map((v) => v / 16));

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
const DIVE_DITHER_END = 0.78;

// A reusable offscreen for glitch passes. Recreated per canvas size — at
// 1024x512 this is one 2MB buffer kept around for the session, cheaper
// than the per-frame `document.createElement` alternative.
const offscreenCache = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();

function getOffscreen(canvas: HTMLCanvasElement): HTMLCanvasElement {
  let off = offscreenCache.get(canvas);
  if (!off || off.width !== canvas.width || off.height !== canvas.height) {
    off = document.createElement("canvas");
    off.width = canvas.width;
    off.height = canvas.height;
    offscreenCache.set(canvas, off);
  }
  return off;
}

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

  drawHeroText(ctx, w, h);

  if (opts.mode === "glitch") {
    const intensity = Math.max(0, Math.min(1, opts.glitchIntensity ?? 0));
    if (intensity > 0.01) applyGlitch(ctx, canvas, w, h, intensity);
  }
}

function ditherStrengthFor(opts: PaintScreenOptions): number {
  switch (opts.mode) {
    case "idle":
      return IDLE_DITHER;
    case "glitch":
      // hold the idle look under the glitch so the underlying frame is
      // recognisable through the tearing — the glitch reads as disturbance,
      // not as a totally new image.
      return IDLE_DITHER;
    case "diving":
      // tighten from idle → high as we approach the screen, so the image
      // gets crisper just before handoff.
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
  // Same quantisation curve as Hero's applyDithering: 2 colour levels at
  // max strength, 16 at min — gives the visible "phosphor pixel" look.
  const colorLevels = Math.max(2, Math.round(2 + (1 - strength) * 14));
  const divisor = colorLevels - 1;

  for (let y = 0; y < h; y++) {
    const row = BAYER_NORMALIZED[y % 4];
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const threshold = row[x % 4];
      for (let c = 0; c < 3; c++) {
        const value = data[idx + c] / 255;
        const quantized = Math.floor(value * divisor + threshold * strength) / divisor;
        data[idx + c] = Math.min(255, Math.max(0, quantized * 255));
      }
    }
  }

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

function applyGlitch(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
  intensity: number,
): void {
  const off = getOffscreen(canvas);
  const offCtx = off.getContext("2d");
  if (!offCtx) return;

  // Snapshot the "settled" frame, then redraw with offsets — the visible
  // canvas becomes a torn / channel-shifted version of the snapshot.
  offCtx.clearRect(0, 0, w, h);
  offCtx.drawImage(canvas, 0, 0);

  ctx.save();
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);

  // Horizontal slice tearing — each band re-draws at a random x offset.
  // Slice count climbs with intensity so the effect "feels" louder when
  // hot. 8-16 slices reads as glitch without becoming abstract noise.
  const sliceCount = 8 + Math.floor(intensity * 8);
  const sliceH = h / sliceCount;
  for (let i = 0; i < sliceCount; i++) {
    const sy = i * sliceH;
    const offsetX = (Math.random() - 0.5) * 60 * intensity;
    ctx.drawImage(off, 0, sy, w, sliceH, offsetX, sy, w, sliceH);
  }

  // Fake RGB shift — two offset overlays in "lighter" composite reads as
  // chromatic aberration without paying for per-pixel channel isolation.
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.35 * intensity;
  const rgbShift = Math.round(intensity * 10);
  ctx.drawImage(off, rgbShift, 0);
  ctx.drawImage(off, -rgbShift, 0);

  ctx.restore();
}
