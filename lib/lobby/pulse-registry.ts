// Module-level pulse registry. Each lobby object that wants to participate
// in the first-pointermove discovery sweep (issue #14, part B) registers a
// pulse callback under a stable id. The sweep hook then samples N callbacks
// at random and fires them with a stagger.
//
// Why module-level instead of context: the lobby has a single live instance
// per session (LobbyGate unmounts on done), there's no use case for two
// independent registries, and avoiding a Provider keeps the registration
// hook a one-liner inside leaf 3D components that don't otherwise need to
// thread context.
//
// What does NOT belong here: the monitor's own LED pulse — it has its own
// idle animation and is excluded by simply never registering.

type PulseFn = () => void;

const registry = new Map<string, PulseFn>();
let hasSweptThisSession = false;

export function registerPulseTarget(id: string, pulse: PulseFn): void {
  registry.set(id, pulse);
}

export function unregisterPulseTarget(id: string): void {
  registry.delete(id);
}

/** Picks up to `max` random callbacks (at least `min` if available). Returns
 *  the selected callbacks in shuffled order — the caller staggers them. */
export function pickRandomPulseTargets(min: number, max: number): PulseFn[] {
  const all = Array.from(registry.values());
  if (all.length === 0) return [];
  // Fisher-Yates partial shuffle — pull random items from the back.
  const shuffled = [...all];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const target = Math.min(Math.max(min, Math.min(max, shuffled.length)), shuffled.length);
  return shuffled.slice(0, target);
}

/** True the first time it's called this session; false thereafter. Used by
 *  the sweep hook to fire exactly once per page load. Reset on full reload
 *  because module state is fresh per browser navigation. */
export function consumeSweepToken(): boolean {
  if (hasSweptThisSession) return false;
  hasSweptThisSession = true;
  return true;
}
