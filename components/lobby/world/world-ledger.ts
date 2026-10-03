import type { Object3D } from "three";
import { CORE_WORLD_PARTS } from "./core-world";

/** Everything the world still owes before the lobby may be revealed. The scene
 * is the key because the desk's Suspense boundary resolves long before the
 * landscape does, and nothing else in the tree can see both. */
interface WorldLedger {
  /** Tasks begun and not yet finished (a detail family preparing, a texture upgrade). */
  pending: number;
  /** Every detail family has been mounted, so `pending` can no longer grow. */
  detailsMounted: boolean;
}

function ledgerOf(scene: Object3D): WorldLedger {
  scene.userData.worldLedger ??= { pending: 0, detailsMounted: false } satisfies WorldLedger;
  return scene.userData.worldLedger as WorldLedger;
}

/** Registers an outstanding piece of the world. The returned function settles it
 * and is idempotent, so success, failure and unmount may all call it. */
export function beginWorldTask(scene: Object3D): () => void {
  const ledger = ledgerOf(scene);
  ledger.pending++;
  let settled = false;
  return () => {
    if (settled) return;
    settled = true;
    ledger.pending--;
  };
}

export function markDetailsMounted(scene: Object3D, mounted: boolean) {
  ledgerOf(scene).detailsMounted = mounted;
}

/** True when the core landscape, every detail family and the terrain upgrade have
 * each either finished or failed. A failed part still counts: the graceful desk
 * fallback is better than holding the visitor on the loader. */
export function isWorldSettled(scene: Object3D): boolean {
  const core = scene.userData.coreWorld as Record<string, string> | undefined;
  if (!CORE_WORLD_PARTS.every(id => core?.[id])) return false;
  const ledger = ledgerOf(scene);
  return ledger.detailsMounted && ledger.pending === 0;
}
