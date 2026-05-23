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
