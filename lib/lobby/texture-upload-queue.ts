import type { Source, Texture, WebGLRenderer } from 'three';
import { isLoaderBitmap } from './bitmap-texture-loader';
import { FAST_PRIORITY0_UPLOADS } from './upload-flags';

type Job = { textures: Texture[]; index: number; priority: number; cancelled: () => boolean; resolve: () => void; reject: (error: unknown) => void };
const queues = new WeakMap<WebGLRenderer, { jobs: Job[]; frame: number }>();
const uploaded = new WeakMap<WebGLRenderer, WeakSet<Texture>>();
const siblings = new WeakMap<Source<unknown>, Set<Texture>>();
let closedSinceClear = false;
const totals = { count: 0, bytes: 0 };

/** Ms of uploads per tick. The desk is what the loader waits on, so it gets long chunks between macrotasks
 * (a chunk only delays a Skip click; the loader sweep runs on the compositor). Scenery beside the visible desk
 * keeps a slice of a frame so it never costs the desk a frame.
 */
export const DESK_UPLOAD_BUDGET_MS = 30;
export const SCENERY_UPLOAD_BUDGET_MS = 6;
const isDesk = (job: Job | undefined) => FAST_PRIORITY0_UPLOADS && job?.priority === 0;
const budgetFor = (job: Job | undefined) => isDesk(job) ? DESK_UPLOAD_BUDGET_MS : SCENERY_UPLOAD_BUDGET_MS;

// Only GLTFLoader's embedded images are released here (canvas, data and render-target textures hold other
// types, so the instanceof test also keeps the monitor screen out of this path). Loose images decoded by the
// bitmap texture loader stay open until the lobby is released: see isLoaderBitmap.
const imageBitmapOf = (texture: Texture) => typeof ImageBitmap !== 'undefined' && texture.image instanceof ImageBitmap ? texture.image : null;
const bitmapOf = (texture: Texture) => { const bitmap = imageBitmapOf(texture); return bitmap && !isLoaderBitmap(bitmap) ? bitmap : null; };
const isClosed = (bitmap: ImageBitmap) => bitmap.width === 0 && bitmap.height === 0;
const hasUploaded = (renderer: WebGLRenderer, texture: Texture) => uploaded.get(renderer)?.has(texture) === true;

/** One budget shared by all Suspense groups, with the desk ahead of scenery.
 * A single native upload is indivisible; the budget limits work between calls.
 */
export function uploadTextures(renderer: WebGLRenderer, textures: Texture[], priority: number, cancelled: () => boolean) {
  let queue = queues.get(renderer);
  if (!queue) { queue = { jobs: [], frame: 0 }; queues.set(renderer, queue); }
  const current = queue;
  return new Promise<void>((resolve, reject) => {
    current.jobs.push({ textures, index: 0, priority, cancelled, resolve, reject });
    current.jobs.sort((a, b) => a.priority - b.priority);
    if (current.frame) return;
    const tick = () => {
      const start = performance.now();
      while (current.jobs.length) {
        const job = current.jobs[0];
        if (job.cancelled() || job.index === job.textures.length) {
          current.jobs.shift(); job.resolve(); continue;
        }
        try {
          const texture = job.textures[job.index++], bitmap = imageBitmapOf(texture);
          // A closed bitmap this renderer never uploaded can only come from a cached scene that outlived its release.
          if (bitmap && isClosed(bitmap) && !hasUploaded(renderer, texture)) throw new Error('Texture bitmap was released before this renderer uploaded it');
          renderer.initTexture(texture);
          let seen = uploaded.get(renderer);
          if (!seen) { seen = new WeakSet(); uploaded.set(renderer, seen); }
          seen.add(texture);
        }
        catch (error) { current.jobs.shift(); job.reject(error); }
        if (performance.now() - start >= budgetFor(current.jobs[0])) break;
      }
      // A macrotask, not a frame: the budget is already a whole frame or more, so waiting for the next one only idles the thread.
      current.frame = current.jobs.length ? (isDesk(current.jobs[0]) ? setTimeout(tick, 0) as unknown as number : requestAnimationFrame(tick)) : 0;
    };
    current.frame = requestAnimationFrame(tick);
  });
}

/** Close the decoded ImageBitmap behind each uploaded texture once the GPU holds every Texture that shares its Source.
 * GLTFLoader clones a Texture per differing sampler over one Source, and a later upload of a sibling (or of this
 * texture after dispose(), or after a colorSpace/anisotropy change) would read the closed bitmap, so `known` lists
 * every texture reachable in the scene: a source with any sibling not yet uploaded stays open. Nothing re-uploads
 * a closed bitmap, including after context loss; the lobby skips instead (render-scale ContextLossGuard) and the
 * loader caches are cleared before a replay (release-assets). Returns the bytes freed.
 */
export function releaseUploadedBitmaps(renderer: WebGLRenderer, done: Iterable<Texture>, known: Iterable<Texture> = []) {
  for (const texture of [...known, ...done]) {
    if (!bitmapOf(texture)) continue;
    let group = siblings.get(texture.source);
    if (!group) { group = new Set(); siblings.set(texture.source, group); }
    group.add(texture);
  }
  let count = 0, bytes = 0;
  for (const texture of done) {
    const bitmap = bitmapOf(texture);
    if (!bitmap || isClosed(bitmap)) continue;
    if (![...siblings.get(texture.source)!].every(sibling => hasUploaded(renderer, sibling))) continue;
    bytes += bitmap.width * bitmap.height * 4;
    bitmap.close();
    count++;
  }
  if (!count) return 0;
  closedSinceClear = true;
  totals.count += count; totals.bytes += bytes;
  performance.mark('lobby:bitmaps-released', { detail: { count, bytes, totalCount: totals.count, totalBytes: totals.bytes } });
  return bytes;
}

/** Running total of closed bitmaps (RGBA bytes); also marked as `lobby:bitmaps-released` entries. */
export const bitmapReleaseStats = () => ({ ...totals });

/** True while some cached scene may hold a closed bitmap: it cannot be reused by a new renderer. */
export const haveClosedBitmaps = () => closedSinceClear;

/** The caches that held those scenes are gone. */
export function forgetClosedBitmaps() {
  closedSinceClear = false;
}
