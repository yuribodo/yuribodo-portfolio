// Cheap one-shot probes to decide whether the visitor's device is likely to
// download (~30 MB) and render the desk scene at a watchable framerate. When
// any signal says no, the gate shows the portfolio directly — no 3D desk.
// The GPU blocklist is intentionally conservative — we only refuse hardware
// we've actually seen hitch; when in doubt, give the benefit of the doubt.
//
// SSR returns no block so the gate can render its loader without flashing.
// The client effect re-runs detection before the lobby mounts. Integrated
// GPUs still get the valley; they render it at a lower shadow map and pixel cap.

import { isMobileUserAgent } from "./is-mobile";

const RENDERER_BLOCKLIST: readonly string[] = [
  // Intel HD 3000–5000 ship in pre-2014 ultraportables. Empirically tank
  // shader compilation on r3f scenes with >5 unique materials.
  "intel(r) hd graphics 3000",
  "intel hd graphics 3000",
  "intel(r) hd graphics 4000",
  "intel hd graphics 4000",
  "intel(r) hd graphics 5000",
  "intel hd graphics 5000",
  // Software rasterizers: no hardware accelerator available; lobby is
  // unwatchable. SwiftShader (Chrome), llvmpipe/softpipe (Mesa), WARP.
  "swiftshader",
  "google swiftshader",
  "llvmpipe",
  "softpipe",
  "microsoft basic render",
];

export interface LobbyScale {
  maxDpr: number;
  shadow: number;
}

const HIGH_SCALE: LobbyScale = { maxDpr: 1.5, shadow: 2048 };
const LOW_SCALE: LobbyScale = { maxDpr: 1, shadow: 1024 };

/** Same world either way. iGPUs spend the budget on fewer shadow texels and a lower pixel cap. */
export function lobbyScaleForRenderer(renderer: string): LobbyScale {
  const value = renderer.toLowerCase();
  if (/nvidia|geforce|quadro|apple/.test(value)) return HIGH_SCALE;
  if (/radeon/.test(value) && /rx|pro/.test(value)) return HIGH_SCALE;
  if (/intel|iris|uhd|hd graphics|adreno|mali|powervr|radeon/.test(value)) return LOW_SCALE;
  return HIGH_SCALE;
}

function readRenderer(): { ok: boolean; renderer: string | null } {
  if (typeof window === "undefined") return { ok: true, renderer: null };
  let gl: WebGL2RenderingContext | null = null;
  try {
    // Match the lobby canvas so a dual-GPU laptop reports the discrete chip.
    gl = document.createElement("canvas").getContext("webgl2", { powerPreference: "high-performance" });
    if (!gl) return { ok: false, renderer: null };
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (!ext) return { ok: true, renderer: null };
    const renderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? "").toLowerCase();
    return { ok: true, renderer: renderer || null };
  } catch {
    return { ok: true, renderer: null };
  } finally {
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

export type LobbyBlockReason =
  | "mobile"
  | "touch-only"
  | "reduced-motion"
  | "save-data"
  | "slow-network"
  | "low-memory"
  | "low-cpu"
  | "gpu";

export interface DeviceSignals {
  userAgent: string;
  /** `(hover: none) and (pointer: coarse)` — tablets with desktop UAs (iPadOS). */
  touchOnly: boolean;
  reducedMotion: boolean;
  saveData: boolean;
  /** Network Information API: "slow-2g" | "2g" | "3g" | "4g" (Chromium only). */
  effectiveType?: string;
  /** GiB, Chromium only, capped at 8. */
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

/** Pure ordering of the cheap signals; the WebGL probe runs last (it costs a context). */
export function lobbyBlockReasonFor(signals: DeviceSignals): LobbyBlockReason | null {
  if (isMobileUserAgent(signals.userAgent)) return "mobile";
  if (signals.touchOnly) return "touch-only";
  if (signals.reducedMotion) return "reduced-motion";
  if (signals.saveData) return "save-data";
  if (signals.effectiveType && signals.effectiveType !== "4g") return "slow-network";
  if (signals.deviceMemory !== undefined && signals.deviceMemory < 4) return "low-memory";
  if (signals.hardwareConcurrency !== undefined && signals.hardwareConcurrency < 4) return "low-cpu";
  return null;
}

export function getLobbyAdmission(): { block: LobbyBlockReason | null; scale: LobbyScale } {
  if (typeof window === "undefined") return { block: null, scale: HIGH_SCALE };
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const block = lobbyBlockReasonFor({
    userAgent: nav.userAgent,
    touchOnly: matchMedia("(hover: none) and (pointer: coarse)").matches,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    saveData: nav.connection?.saveData === true,
    effectiveType: nav.connection?.effectiveType,
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: nav.hardwareConcurrency,
  });
  if (block) return { block, scale: LOW_SCALE };
  const gpu = readRenderer();
  if (!gpu.ok) return { block: "gpu", scale: LOW_SCALE };
  if (gpu.renderer && RENDERER_BLOCKLIST.some((entry) => gpu.renderer!.includes(entry))) {
    return { block: "gpu", scale: LOW_SCALE };
  }
  return { block: null, scale: gpu.renderer ? lobbyScaleForRenderer(gpu.renderer) : HIGH_SCALE };
}
