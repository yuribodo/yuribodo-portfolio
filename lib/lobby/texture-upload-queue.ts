import type { Texture, WebGLRenderer } from 'three';

type Job = { textures: Texture[]; index: number; priority: number; cancelled: () => boolean; resolve: () => void; reject: (error: unknown) => void };
const queues = new WeakMap<WebGLRenderer, { jobs: Job[]; frame: number }>();

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
        try { renderer.initTexture(job.textures[job.index++]); }
        catch (error) { current.jobs.shift(); job.reject(error); }
        if (performance.now() - start >= 6) break;
      }
      current.frame = current.jobs.length ? requestAnimationFrame(tick) : 0;
    };
    current.frame = requestAnimationFrame(tick);
  });
}
