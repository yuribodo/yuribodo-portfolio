// Cheap one-shot WebGL probe to decide whether the visitor's GPU is likely
// to render the desk scene at a watchable framerate. The blocklist is
// intentionally conservative — we only refuse hardware we've actually seen
// hitch on a 3D scene of this complexity. When in doubt, give the benefit
// of the doubt; the reduced-motion gate is a separate safety net.
//
// Returning `true` from a SSR context lets the gate render its loading
// state without flashing; the client effect re-runs detection before the
// lobby mounts.

type AnyWebGLContext = WebGLRenderingContext | WebGL2RenderingContext;

const RENDERER_BLOCKLIST: readonly string[] = [
  // Intel HD 3000–5000 ship in pre-2014 ultraportables. Empirically tank
  // shader compilation on r3f scenes with >5 unique materials.
  "intel(r) hd graphics 3000",
  "intel hd graphics 3000",
  "intel(r) hd graphics 4000",
  "intel hd graphics 4000",
  "intel(r) hd graphics 5000",
  "intel hd graphics 5000",
  // Software fallback (Chrome's SwiftShader). Means the user has no
  // hardware accelerator available; lobby is unwatchable.
  "swiftshader",
  "google swiftshader",
  // ANGLE software backend on Windows.
  "microsoft basic render",
];

export function isGpuCapable(): boolean {
  if (typeof window === "undefined") return true;

  let canvas: HTMLCanvasElement | null = null;
  let gl: AnyWebGLContext | null = null;
  try {
    canvas = document.createElement("canvas");
    gl =
      (canvas.getContext("webgl2") as WebGL2RenderingContext | null) ??
      (canvas.getContext("webgl") as WebGLRenderingContext | null);
    if (!gl) return false;

    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (!ext) return true;

    const rendererParam = gl.getParameter(
      (ext as { UNMASKED_RENDERER_WEBGL: number }).UNMASKED_RENDERER_WEBGL,
    );
    const renderer = String(rendererParam ?? "").toLowerCase();
    if (!renderer) return true;
    return !RENDERER_BLOCKLIST.some((entry) => renderer.includes(entry));
  } catch {
    // Any failure (security policy, missing context) → assume capable so
    // we don't lock out users whose browsers don't expose the renderer.
    return true;
  } finally {
    // Free the context immediately. WebGL contexts are a scarce resource;
    // some browsers throttle once a tab has > 16 live contexts.
    if (gl) {
      const lose = gl.getExtension("WEBGL_lose_context");
      lose?.loseContext();
    }
  }
}
