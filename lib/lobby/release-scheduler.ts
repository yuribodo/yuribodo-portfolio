import { haveClosedBitmaps } from "./texture-upload-queue";

export interface ReleaseApi {
  releaseLobbyAssets: () => void;
  rearmLobbyAssets: () => void;
}

/** Defers the loader-cache release until the Canvas is torn down, and undoes it for a replay.
 * `load` is the dynamic import of release-assets, which drags in three and drei: this module imports only the
 * three-free upload queue, so the gate can use it statically.
 * A replay inside the delay finds the release not yet loaded but the bitmaps already closed, so it must load the
 * module and clear the caches itself instead of waiting for a release that was cancelled. */
export function createReleaseScheduler(load: () => Promise<ReleaseApi>, delayMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let epoch = 0;
  let api: ReleaseApi | undefined;
  const loaded = () => api ? Promise.resolve(api) : load().then(module => (api = module));

  return {
    /** Module-level on purpose: the release must still land if the gate unmounts first (client nav right after the dive). */
    schedule() {
      const mine = ++epoch;
      clearTimeout(timer);
      timer = setTimeout(() => {
        loaded().then(module => { if (mine === epoch) module.releaseLobbyAssets(); }).catch(() => {});
      }, delayMs);
    },
    /** The lobby is about to run again. */
    cancel() {
      const mine = ++epoch;
      clearTimeout(timer);
      if (api) return api.rearmLobbyAssets();
      if (!haveClosedBitmaps()) return;
      loaded().then(module => { if (mine === epoch) module.rearmLobbyAssets(); }).catch(() => {});
    },
  };
}
