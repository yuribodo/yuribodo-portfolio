/** Fraction of the live pixel ratio the sky target renders at: preserves the small sculpted cloud edges. */
export const SKY_RT_SCALE = 0.75;
/** Pixel-ratio levels the sky target snaps to. Each change reallocates a half-float target and forces a redraw. */
const SKY_RATIO_MIN = 1;
const SKY_RATIO_MAX = 2;
/** A level holds until the live ratio is this far from it (levels are 0.5 apart, so the switch point is 0.1 past the midpoint). */
const SKY_RATIO_HOLD = 0.35;
/** Camera turn, in radians, that must accumulate since the last sky draw: about 0.6 px at 50 deg fov on 1080p. */
export const SKY_ROTATION_EPSILON = 0.0005;
/** Camera travel in world units: 0.0005 rad against the nearest distant cloud (~640 away). Seated parallax moves 0.06. */
export const SKY_TRANSLATION_EPSILON = 0.3;
/** Seconds between refreshes while nothing else changed: cloud drift is ~0.1 px/s. */
export const SKY_IDLE_REFRESH_S = 1;

/** Snap the live gl pixel ratio to 1, 1.5 or 2, keeping `current` until the ratio clearly leaves it. */
export function quantizeSkyRatio(live: number, current: number): number {
  if (current >= SKY_RATIO_MIN && Math.abs(live - current) <= SKY_RATIO_HOLD) return current;
  const snapped = Math.round((Number.isFinite(live) ? live : SKY_RATIO_MIN) * 2) / 2;
  return Math.min(SKY_RATIO_MAX, Math.max(SKY_RATIO_MIN, snapped));
}

/** Largest chord between matching basis columns of two column-major world matrices: ~ the angle turned, in radians. */
export function rotationDelta(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let worst = 0;
  for (const column of [0, 4, 8]) {
    const dx = a[column] - b[column], dy = a[column + 1] - b[column + 1], dz = a[column + 2] - b[column + 2];
    worst = Math.max(worst, dx * dx + dy * dy + dz * dz);
  }
  return Math.sqrt(worst);
}

export function translationDelta(a: ArrayLike<number>, b: ArrayLike<number>): number {
  return Math.hypot(a[12] - b[12], a[13] - b[13], a[14] - b[14]);
}

/** True once the camera has moved enough since the last sky draw to be visible in the half-res target. */
export function skyPoseChanged(drawn: ArrayLike<number>, now: ArrayLike<number>): boolean {
  return rotationDelta(drawn, now) > SKY_ROTATION_EPSILON || translationDelta(drawn, now) > SKY_TRANSLATION_EPSILON;
}
