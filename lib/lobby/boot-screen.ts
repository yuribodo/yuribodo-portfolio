// CRT-style boot glyphs rendered into a CanvasTexture. The dive transition
// (#10) drives `progress` from 0→1 over ~1s; this module is purely the
// drawing routine, no animation or state of its own.

export const BOOT_CANVAS_WIDTH = 1024;
export const BOOT_CANVAS_HEIGHT = 512;

const BOOT_LINES = [
  "> INITIALIZING...",
  "> LOADING YURI BODO",
  "> [████████████]",
];
const TOTAL_CHARS = BOOT_LINES.reduce((acc, line) => acc + line.length, 0);

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
  /** Reveal progress in [0, 1]. 0 = blank black screen, 1 = all lines visible. */
  progress: number;
  /** When true, append a block cursor at the end of the currently-typing line. */
  showCursor: boolean;
}

export function drawBootScreen(
  canvas: HTMLCanvasElement,
  { progress, showCursor }: DrawBootScreenOptions,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, w, h);

  if (progress <= 0) return;

  // Geist Mono is loaded globally via next/font in app/layout.tsx. The
  // monospace fallback keeps the layout intact if the font hasn't loaded
  // yet when the canvas first draws.
  ctx.font = `${FONT_SIZE}px "Geist Mono", "JetBrains Mono", ui-monospace, monospace`;
  ctx.textBaseline = "top";
  ctx.fillStyle = TEXT_COLOR;
  ctx.shadowColor = TEXT_SHADOW;
  ctx.shadowBlur = 12;

  const revealedChars = Math.floor(Math.min(progress, 1) * TOTAL_CHARS);

  let remaining = revealedChars;
  for (let i = 0; i < BOOT_LINES.length; i++) {
    if (remaining <= 0) break;
    const line = BOOT_LINES[i];
    const charsThisLine = Math.min(line.length, remaining);
    let text = line.slice(0, charsThisLine);

    const isTypingThisLine = charsThisLine < line.length;
    if (isTypingThisLine && showCursor) {
      text += "█";
    }

    ctx.fillText(text, PADDING_X, PADDING_Y + i * LINE_HEIGHT);
    remaining -= charsThisLine;
  }
}
