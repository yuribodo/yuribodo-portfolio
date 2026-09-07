/** Camera pose shared with the monitor dive. World landmarks face -Z. */
export const DESK_CAMERA = { x: 0, y: 0.4, z: 1.9 } as const;
export const DESK_TARGET = { x: 0, y: -0.05, z: -0.2 } as const;
export const DESK_PITCH = Math.atan2(
  DESK_TARGET.y - DESK_CAMERA.y,
  DESK_CAMERA.z - DESK_TARGET.z,
);

export type WorldView = "desk" | "looking" | "returning";

export const MIN_LOOK_PITCH = -Math.PI / 6;
export const MAX_LOOK_PITCH = Math.PI * 0.3;

export function clampLookPitch(pitch: number) {
  return Math.max(MIN_LOOK_PITCH, Math.min(MAX_LOOK_PITCH, pitch));
}

export function requestWorldEntry(view: WorldView) {
  return view === "desk" ? "enter" : "return-first";
}
