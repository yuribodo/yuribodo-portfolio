import { Texture, TextureLoader } from 'three';
import { BITMAP_TEXTURES } from './upload-flags';

type Load = TextureLoader['load'];

const INSTALLED = Symbol.for('lobby.bitmapTextureLoader');
const IMAGE_PATH = /\.(?:webp|png|jpe?g|avif)$/i;
let original: Load | undefined;
const live = new Set<ImageBitmap>();

/** True for a bitmap this loader decoded. releaseUploadedBitmaps leaves these open: useTexture hands one cached
 * Texture to every consumer, and each consumer clones it over the same Source whenever it mounts (the ground
 * preview is read by two core groups, canopies and impostors by several), so no upload proves the last clone exists.
 * They are closed together by closeBitmapTextures when the lobby is released.
 */
export const isLoaderBitmap = (bitmap: ImageBitmap) => live.has(bitmap);

/** Closes every bitmap this loader decoded; the textures that held them must be gone (lobby release). */
export function closeBitmapTextures() {
  for (const bitmap of live) bitmap.close();
  live.clear();
}

/** Same engine gate as GLTFLoader's own ImageBitmapLoader choice: Safari and old Firefox ignore imageOrientation. */
export function supportsBitmapTextures(userAgent: string) {
  if (typeof createImageBitmap !== 'function' || typeof fetch !== 'function') return false;
  if (/^((?!chrome|android).)*safari/i.test(userAgent)) return false;
  const firefox = /Firefox\/(\d+)\./.exec(userAgent);
  return !firefox || Number(firefox[1]) >= 98;
}

/** Same-origin still images only: data:/blob:/cross-origin URLs and other formats keep the stock <img> path. */
export function isBitmapTextureUrl(resolved: string, base: string) {
  try {
    const url = new URL(resolved, base);
    return url.origin === new URL(base).origin && IMAGE_PATH.test(url.pathname);
  } catch { return false; }
}

/** TextureLoader.load that decodes through fetch + createImageBitmap, off the main thread. The pixels are
 * bit-identical to the <img> upload (flipY applied by the decoder, no premultiply or colour conversion, as
 * three itself asks of a GLTF's images); what changes is that texSubImage2D from an ImageBitmap is
 * ~10x cheaper than from an HTMLImageElement, which re-decodes on the main thread. Any failure falls back
 * to the original loader into the same Texture object.
 */
function loadBitmapTexture(this: TextureLoader, url: string, onLoad?: (texture: Texture) => void, onProgress?: (event: ProgressEvent) => void, onError?: (error: unknown) => void) {
  const load = original!, manager = this.manager, resolved = manager.resolveURL(this.path + url);
  if (!isBitmapTextureUrl(resolved, location.href)) return load.call(this, url, onLoad, onProgress, onError);
  const texture = new Texture();
  manager.itemStart(resolved);
  const fallback = () => {
    load.call(this, url, loaded => { texture.image = loaded.image; texture.needsUpdate = true; onLoad?.(texture); }, onProgress, onError);
    manager.itemEnd(resolved);
  };
  fetch(resolved)
    .then(response => { if (!response.ok) throw new Error(`${response.status} ${resolved}`); return response.blob(); })
    .then(blob => createImageBitmap(blob, {
      imageOrientation: texture.flipY ? 'flipY' : 'none',
      premultiplyAlpha: texture.premultiplyAlpha ? 'premultiply' : 'none',
      colorSpaceConversion: 'none',
    }))
    .then(bitmap => {
      // An ImageBitmap upload ignores UNPACK_FLIP_Y_WEBGL, so the decoder flipped it and the texture must not flip again.
      texture.flipY = false;
      live.add(bitmap);
      texture.image = bitmap;
      texture.needsUpdate = true;
      onLoad?.(texture);
      manager.itemEnd(resolved);
    }, fallback);
  return texture;
}

/** Idempotent. Patches the prototype so useTexture, useLoader and loadAsync callers are all covered.
 * Returns whether the bitmap path is active.
 */
export function installBitmapTextureLoader() {
  if (!BITMAP_TEXTURES || typeof window === 'undefined' || !supportsBitmapTextures(navigator.userAgent)) return false;
  if (Reflect.has(TextureLoader.prototype.load, INSTALLED)) return true;
  original = TextureLoader.prototype.load;
  const patched = loadBitmapTexture as unknown as Load;
  Reflect.defineProperty(patched, INSTALLED, { value: true });
  TextureLoader.prototype.load = patched;
  return true;
}

/** Puts the stock loader back (tests, and a clean slate for the flag). */
export function uninstallBitmapTextureLoader() {
  if (original && Reflect.has(TextureLoader.prototype.load, INSTALLED)) TextureLoader.prototype.load = original;
  original = undefined;
}
