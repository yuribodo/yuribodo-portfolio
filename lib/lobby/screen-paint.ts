// Monitor preview shares the Hero's palette and grain. During the approach
// the grain resolves and the preview text dissolves into the real page.
// Gradient and Bayer grain run in the screen's fragment shader; only the
// static text is painted to canvases, once.

export const SCREEN_CANVAS_WIDTH = 1024;
export const SCREEN_CANVAS_HEIGHT = 512;

export type ScreenMode = "idle" | "diving";

export const GRADIENT_TIME_SCALE = 0.0003;

// Slightly heavier dither than Hero's resting state — the monitor is a
// "smaller window" so the dither pattern reads more like CRT pixel grain.
const IDLE_DITHER = 0.55;
const DIVE_DITHER_END = 0.4;

// The Bayer grain is generated, not sampled, so no mipmap averages it. Indexed
// by canvas texel it only survives while a render pixel is no bigger than a
// texel; beyond that (the screen is ~230 px wide at rest, 4+ texels per pixel)
// the 4-texel period beats against the pixel grid into diagonal streaks. So
// the cell follows the render pixel once the screen is minified. Texels per
// pixel below SPACE_FROM keep the canvas-aligned grain, above SPACE_TO it is
// pixel-aligned, and the dive crosses between them.
export const DITHER_SPACE_FROM = 0.7;
export const DITHER_SPACE_TO = 1.4;

/** Canvas texels covered by one render pixel for a screen drawn `pixelWidth` wide. */
export function texelsPerPixel(pixelWidth: number): number {
  return SCREEN_CANVAS_WIDTH / pixelWidth;
}

/** 0 = grain cells follow canvas texels, 1 = they follow render pixels. Mirrors the shader's smoothstep. */
export function ditherPixelWeight(texelsPerPixel: number): number {
  const t = Math.max(0, Math.min(1, (texelsPerPixel - DITHER_SPACE_FROM) / (DITHER_SPACE_TO - DITHER_SPACE_FROM)));
  return t * t * (3 - 2 * t);
}

// Subtitle legibility once the screen is minified (strokes ~1 px wide).
const SUBTITLE_MINIFY_SPAN = 3;
const SUBTITLE_LOD_BIAS = 0.75;
const SUBTITLE_COVERAGE_BOOST = 0.8;

// Same table as dither.ts (Hero), row-major 4x4.
export const BAYER_4X4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;

export function ditherStrengthFor(mode: ScreenMode, progress: number): number {
  if (mode === "idle") return IDLE_DITHER;
  // Resolve toward the same grain strength as the real Hero.
  return IDLE_DITHER + (DIVE_DITHER_END - IDLE_DITHER) * progress;
}

// Dissolve the preview title before the real DOM title enters; their
// responsive layouts differ, so overlapping both creates a double image.
export function textAlphaFor(mode: ScreenMode, progress: number): number {
  if (mode === "idle") return 1;
  return 1 - Math.max(0, Math.min(1, (progress - 0.65) / 0.3));
}

// Hero's --accent token resolves to #fa4b12. Matching exactly so the
// "YURI white / BODO orange" split on the monitor → Hero handoff has no
// visible colour shift.
const ACCENT_HEX = "#fa4b12";

// Sizes are tuned so that when the dive ends and the screen mesh fills
// the viewport, "YURI BODO" lands at roughly the same visual size as
// Hero's `lg:text-[140px]` h1 (140px on a 1400px+ viewport). Larger
// canvas text scaled to viewport produced a visible "text shrink"
// layout shift at the moment of the fade handoff.
export const TITLE_FONT = `900 ${Math.round(SCREEN_CANVAS_HEIGHT * 0.16)}px "Geist", "Inter", sans-serif`;
// Sized to match Hero's `text-xs md:text-sm` (~14px at desktop scale).
export const SUBTITLE_FONT = `600 ${Math.round(SCREEN_CANVAS_HEIGHT * 0.024)}px "Geist", sans-serif`;

/** Title is composited with "difference" in the shader, the subtitle normally, so they live on separate layers. */
export function paintScreenText(title: HTMLCanvasElement, subtitle: HTMLCanvasElement): void {
  const w = SCREEN_CANVAS_WIDTH;
  const h = SCREEN_CANVAS_HEIGHT;
  const yMid = h / 2;

  const ctx = title.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, w, h);
    ctx.font = TITLE_FONT;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    // Two coloured runs around the visual centre, same layout as Hero's
    // two adjacent <span>s with a thin separator.
    const gap = Math.round(h * 0.16) * 0.22;
    const yuriW = ctx.measureText("YURI").width;
    const bodoW = ctx.measureText("BODO").width;
    const startX = w / 2 - (yuriW + gap + bodoW) / 2;
    ctx.fillStyle = "#ffffff";
    ctx.fillText("YURI", startX, yMid);
    ctx.fillStyle = ACCENT_HEX;
    ctx.fillText("BODO", startX + yuriW + gap, yMid);
  }

  const sub = subtitle.getContext("2d");
  if (sub) {
    sub.clearRect(0, 0, w, h);
    sub.fillStyle = "#ffffff";
    sub.font = SUBTITLE_FONT;
    sub.textAlign = "center";
    sub.textBaseline = "middle";
    sub.letterSpacing = "4px";
    sub.fillText("FULL STACK ENGINEER", w / 2, yMid + h * 0.13);
  }
}

// Canvas-space reproduction of the former 2D paint: linear + two-point radial
// gradient (Skia interpolates unpremultiplied), 8-bit quantize, the shared
// 4×4 Bayer table from dither.ts, then "difference" title and a 55% subtitle.
// Title texture is premultiplied; everything happens in sRGB, then decodes.
export const SCREEN_FRAGMENT = /* glsl */ `
#ifdef USE_EMISSIVEMAP
  vec2 screenSize = vec2(${SCREEN_CANVAS_WIDTH}.0, ${SCREEN_CANVAS_HEIGHT}.0);
  vec2 screenPx = floor(vec2(vEmissiveMapUv.x, 1.0 - vEmissiveMapUv.y) * screenSize);
  vec2 screenP = screenPx + 0.5;
  float st = screenTime;

  vec2 ga = screenSize * vec2(0.3 + sin(st) * 0.2, 0.0);
  vec2 gab = screenSize * vec2(0.7 + cos(st * 0.7) * 0.2, 1.0) - ga;
  float g = clamp(dot(screenP - ga, gab) / dot(gab, gab), 0.0, 1.0);
  vec3 c0 = vec3(26.0) / 255.0, c1 = vec3(69.0, 39.0, 47.0) / 255.0;
  vec3 c2 = vec3(46.0, 32.0, 36.0) / 255.0, c3 = vec3(159.0, 84.0, 84.0) / 255.0;
  vec3 screen = g < 0.3 ? mix(c0, c1, g / 0.3)
    : g < 0.5 ? mix(c1, c2, (g - 0.3) / 0.2)
    : g < 0.7 ? mix(c2, c3, (g - 0.5) / 0.2)
    : mix(c3, c0, (g - 0.7) / 0.3);

  vec2 rc = screenSize * vec2(0.5 + sin(st * 1.3) * 0.3, 0.5 + cos(st * 0.9) * 0.3);
  vec2 rd = screenSize * 0.5 - rc, rq = screenP - rc;
  float r1 = screenSize.x * 0.6;
  float qa = dot(rd, rd) - r1 * r1, qb = dot(rq, rd);
  float rt = clamp((qb - sqrt(qb * qb - qa * dot(rq, rq))) / qa, 0.0, 1.0);
  screen = mix(screen, vec3(250.0, 75.0, 18.0) / 255.0 * (1.0 - rt), 0.18 * (1.0 - rt));

  screen = floor(screen * 255.0 + 0.5) / 255.0;
  vec2 uvPx = vec2(vEmissiveMapUv.x, 1.0 - vEmissiveMapUv.y) * screenSize;
  float texelsPerPixel = max(length(dFdx(uvPx)), length(dFdy(uvPx)));
  if (screenDither > 0.01) {
    const float bayer[16] = float[16](${BAYER_4X4.map((v) => `${v}.0`).join(", ")});
    float levels = max(2.0, floor(2.0 + (1.0 - screenDither) * 14.0 + 0.5)) - 1.0;
    float pixelCell = smoothstep(${DITHER_SPACE_FROM.toFixed(1)}, ${DITHER_SPACE_TO.toFixed(1)}, texelsPerPixel);
    ivec2 texelCell = ivec2(mod(screenPx, 4.0)), pixelCellXY = ivec2(mod(floor(gl_FragCoord.xy), 4.0));
    float cell = mix(bayer[texelCell.y * 4 + texelCell.x], bayer[pixelCellXY.y * 4 + pixelCellXY.x], pixelCell);
    float threshold = cell / 16.0 * screenDither;
    screen = clamp(floor(screen * levels + threshold) / levels, 0.0, 1.0);
  }

  vec4 title = texture2D(emissiveMap, vEmissiveMapUv);
  vec3 titleColor = title.rgb / max(title.a, 1e-4);
  screen = mix(screen, abs(screen - titleColor), title.a * screenTextAlpha);
  // Hairline strokes lose coverage to the mip chain at rest; sharpen the lookup and give the lost coverage back.
  float minify = clamp((texelsPerPixel - 1.0) / ${SUBTITLE_MINIFY_SPAN.toFixed(1)}, 0.0, 1.0);
  float subtitleCoverage = min(1.0, texture2D(screenSubtitle, vEmissiveMapUv, -${SUBTITLE_LOD_BIAS.toFixed(2)} * minify).a * (1.0 + ${SUBTITLE_COVERAGE_BOOST.toFixed(2)} * minify));
  float subtitle = subtitleCoverage * 0.55 * screenTextAlpha;
  screen = mix(screen, vec3(220.0 / 255.0), subtitle);

  totalEmissiveRadiance *= sRGBTransferEOTF(vec4(screen, 1.0)).rgb;
#endif
`;
