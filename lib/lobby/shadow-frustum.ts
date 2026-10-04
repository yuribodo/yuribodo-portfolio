/** Orthographic fit of the sun's shadow camera to everything in the lobby that casts a sun shadow.
 * Light space: u = right, v = up, t = toward the sun, in metres about the world origin.
 * The bounds project every caster (desk and props, terrace masonry and leaves, the slime, the two
 * spirits by the terrace, the two trees inside 16 m with wind sway) plus the terrain their shadows
 * land on, then pad them (1 m sideways, 1.5 m in depth). The wider axis sets the texel size, so the
 * shorter v axis has spare headroom. A caster outside them silently stops shadowing, which is
 * what shadow-frustum.test.ts guards. */
export const SUN_SHADOW_BOUNDS = { u: [-26.9, 7.6], v: [-8.1, 18.6], t: [-29.5, 12.5] } as const;

// The old +-56 m frustum on a tier map gave 54.7 mm texels (HIGH) and 109 mm (LOW), and that texel is
// what the sun's look was tuned on: the 5-tap PCF kernel is 1 texel wide, so its penumbra, its
// edge position (normal bias) and its grain at a 1x buffer all follow it. A finer texel with the
// same kernel shifts the edge ~5 px and narrows the penumbra; a wider kernel to compensate turns
// into visible stipple. So the fitted map keeps the old texel, which also shrinks it ~10x.
const OLD_SHADOW_SPAN = 112;
const MAP_STEP = 64;
// Bias scales with the texel, so the map keeps the acne margin it was tuned with (0.87 / 0.27 of a texel).
const DEPTH_BIAS_TEXELS = 0.85;
const NORMAL_BIAS_TEXELS = 0.27;
const PCF_RADIUS = 1;

export type Vec3 = readonly [number, number, number];

export interface SunShadowFit {
  position: Vec3;
  target: Vec3;
  left: number;
  right: number;
  top: number;
  bottom: number;
  near: number;
  far: number;
  mapSize: number;
  /** World size of one shadow texel along the wider axis. */
  texelMm: number;
  bias: number;
  normalBias: number;
  radius: number;
}

const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a: Vec3): Vec3 => { const length = Math.hypot(...a); return [a[0] / length, a[1] / length, a[2] / length]; };

/** The shadow camera's right and up axes, and the unit vector toward the sun. */
export function sunBasis(sun: Vec3) {
  const toSun = unit(sun), right = unit(cross([0, 1, 0], toSun));
  return { right, up: cross(toSun, right), toSun };
}

export function toLightSpace(sun: Vec3, point: Vec3) {
  const { right, up, toSun } = sunBasis(sun);
  return { u: dot(point, right), v: dot(point, up), t: dot(point, toSun) };
}

/** The map that keeps the old texel over the fitted box: 2048 -> 640, 1024 -> 320 (53.9 / 107.8 mm). */
export function sunShadowMapSize(tierShadow: number, bounds = SUN_SHADOW_BOUNDS) {
  const span = Math.max(bounds.u[1] - bounds.u[0], bounds.v[1] - bounds.v[0]);
  return Math.max(256, Math.ceil(tierShadow * span / OLD_SHADOW_SPAN / MAP_STEP) * MAP_STEP);
}

/** `sun` is the light's offset from its target, so the lighting direction does not change. */
export function fitSunShadow(sun: Vec3, mapSize: number, bounds = SUN_SHADOW_BOUNDS): SunShadowFit {
  const { right, up } = sunBasis(sun), distance = Math.hypot(...sun);
  const uCenter = (bounds.u[0] + bounds.u[1]) / 2, vCenter = (bounds.v[0] + bounds.v[1]) / 2;
  const target: Vec3 = [0, 1, 2].map((i) => right[i] * uCenter + up[i] * vCenter) as unknown as Vec3;
  const near = distance - bounds.t[1], far = distance - bounds.t[0];
  const texel = Math.max(bounds.u[1] - bounds.u[0], bounds.v[1] - bounds.v[0]) / mapSize;
  return {
    position: [target[0] + sun[0], target[1] + sun[1], target[2] + sun[2]],
    target,
    left: bounds.u[0] - uCenter, right: bounds.u[1] - uCenter,
    top: bounds.v[1] - vCenter, bottom: bounds.v[0] - vCenter,
    near, far, mapSize,
    texelMm: texel * 1000,
    bias: -DEPTH_BIAS_TEXELS * texel / (far - near),
    normalBias: NORMAL_BIAS_TEXELS * texel,
    radius: PCF_RADIUS,
  };
}
