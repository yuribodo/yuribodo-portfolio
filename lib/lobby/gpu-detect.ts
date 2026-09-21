// Cheap one-shot probes to decide whether the visitor's device is likely to
// download (~30 MB) and render the desk scene at a watchable framerate. When
// any signal says no, the gate shows the portfolio directly — no 3D desk.
// The GPU blocklist is intentionally conservative; the runtime FPS watchdog
// in scene-ready.tsx is the safety net for borderline hardware.
//
// Returning `true` from a SSR context lets the gate render its loading
// state without flashing; the client effect re-runs detection before the
// lobby mounts.

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

export function isGpuCapable(): boolean {
  if (typeof window === "undefined") return true;

  let gl: WebGL2RenderingContext | null = null;
  try {
    // three r163+ dropped WebGL1: without WebGL2 the renderer throws on mount.
    gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return false;

    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (!ext) return true;

    const renderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? "").toLowerCase();
    if (!renderer) return true;
    return !RENDERER_BLOCKLIST.some((entry) => renderer.includes(entry));
  } catch {
    // Any failure (security policy, missing context) → assume capable so
    // we don't lock out users whose browsers don't expose the renderer.
    return true;
  } finally {
    // Free the context immediately. WebGL contexts are a scarce resource;
    // some browsers throttle once a tab has > 16 live contexts.
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
  | "previous-low-fps"
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
  /** Set by the FPS watchdog after a previous visit ran unwatchably slow. */
  hadLowFps: boolean;
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
  if (signals.hadLowFps) return "previous-low-fps";
  return null;
}

const LOW_FPS_KEY = "lobbyLowFps";

/** Remember an unwatchable run so the next visit lands on the portfolio directly. */
// ponytail: persistent flag; a battery-saver session locks the device out until
// storage is cleared. Add an expiry if that ever bites.
export function markLobbyLowFps() {
  try { localStorage.setItem(LOW_FPS_KEY, String(Date.now())); } catch { /* storage disabled */ }
}

function readLowFps(): boolean {
  try { return localStorage.getItem(LOW_FPS_KEY) !== null; } catch { return false; }
}

export function getLobbyBlockReason(): LobbyBlockReason | null {
  if (typeof window === "undefined") return null;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const reason = lobbyBlockReasonFor({
    userAgent: nav.userAgent,
    touchOnly: matchMedia("(hover: none) and (pointer: coarse)").matches,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    saveData: nav.connection?.saveData === true,
    effectiveType: nav.connection?.effectiveType,
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: nav.hardwareConcurrency,
    hadLowFps: readLowFps(),
  });
  if (reason) return reason;
  return isGpuCapable() ? null : "gpu";
}
