// Pure, framework-free spin physics for the lobby Beyblade. Kept out of the
// R3F component so the gyroscopic math is unit-testable and the component
// stays small. NOT a rigid-body sim — a driven kinematic model tuned to read
// like a metal top: fast+upright while spinning, tilting into a widening
// precession cone as it bleeds speed, then toppling.

export type BeybladePhase = "idle" | "spinning" | "toppled";

export interface BeybladeState {
  phase: BeybladePhase;
  /** Angular velocity about the top's own axis (rad/s). */
  omega: number;
  /** Accumulated spin about own axis (rad). */
  spinAngle: number;
  /** Tilt of the axis from vertical (rad) — grows as omega falls. */
  tilt: number;
  /** Azimuth the tilt currently points toward; sweeps → precession (rad). */
  precessAngle: number;
  /** Drives the horizontal wander of the contact point (rad). */
  wanderPhase: number;
}

export interface BeybladeParams {
  /** Launch angular velocity (rad/s). */
  maxOmega: number;
  /** Angular deceleration (rad/s^2). */
  friction: number;
  /** Tilt at the topple threshold (rad). */
  maxTilt: number;
  /** Precession rate scaler — precession ≈ precessGain / omega. */
  precessGain: number;
  /** Radius of the contact-point wander (metres). */
  wanderRadius: number;
  /** Below this omega the top topples. */
  toppleOmega: number;
}

export const DEFAULT_PARAMS: BeybladeParams = {
  maxOmega: 90,
  friction: 12,
  maxTilt: 0.5,
  precessGain: 6,
  wanderRadius: 0.03,
  toppleOmega: 4,
};

export function initialState(): BeybladeState {
  return {
    phase: "idle",
    omega: 0,
    spinAngle: 0,
    tilt: 0,
    precessAngle: 0,
    wanderPhase: 0,
  };
}

/** Rip: (re)launch to max speed, upright, spinning. Preserves accumulated
 *  spinAngle so the visible mesh doesn't jump on a re-click. */
export function launch(
  state: BeybladeState,
  p: BeybladeParams = DEFAULT_PARAMS,
): BeybladeState {
  return {
    ...state,
    phase: "spinning",
    omega: p.maxOmega,
    tilt: 0,
  };
}

export function stepBeyblade(
  state: BeybladeState,
  dt: number,
  p: BeybladeParams = DEFAULT_PARAMS,
): BeybladeState {
  if (state.phase !== "spinning") return state;

  const omega = state.omega - p.friction * dt;

  if (omega <= p.toppleOmega) {
    return {
      ...state,
      phase: "toppled",
      omega: 0,
      tilt: p.maxTilt,
      spinAngle: state.spinAngle + Math.max(omega, 0) * dt,
    };
  }

  // Tilt grows from 0 (full speed) toward maxTilt (near topple).
  const speedFrac = omega / p.maxOmega; // 1 → 0
  const tilt = p.maxTilt * (1 - speedFrac) * (1 - speedFrac);

  // Precession accelerates as omega drops (∝ 1/omega), classic gyroscope.
  const precessRate = p.precessGain / omega;

  return {
    phase: "spinning",
    omega,
    spinAngle: state.spinAngle + omega * dt,
    tilt,
    precessAngle: state.precessAngle + precessRate * dt,
    // Wander speeds up as it slows so the "drift" reads near the end.
    wanderPhase: state.wanderPhase + (2 - speedFrac) * dt * 3,
  };
}

/** Map physics state → a group euler + xz contact-point offset. The euler
 *  composes as Ry(precess) · Rx(tilt) · Ry(spin): the top spins about its own
 *  axis, tilted by `tilt`, with the tilt direction sweeping around. The
 *  component applies this to a group whose origin sits at the tip, so the
 *  pivot is the contact point. */
export function deriveTransform(
  state: BeybladeState,
  wanderRadius: number,
): { euler: [number, number, number]; offset: [number, number] } {
  const wanderAmt = wanderRadius * state.tilt * 2; // scaled by lean
  return {
    euler: [state.tilt, state.precessAngle + state.spinAngle, 0],
    offset: [
      Math.cos(state.wanderPhase) * wanderAmt,
      Math.sin(state.wanderPhase) * wanderAmt,
    ],
  };
}
