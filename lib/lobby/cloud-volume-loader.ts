import { unpackCloudVolume, CLOUD_WIDTH, CLOUD_HEIGHT, CLOUD_DEPTH } from "./cloud-volume-format";
import { Data3DTexture, FileLoader, LinearFilter, Loader, RGBAFormat } from 'three';

export const CLOUD_VOLUMES = [0, 1, 2].map(variant => `/lobby/world/cloud-volume-${variant}.bin.gz`);
/** The exact authored 3D density/light fields, baked offline. Gzip is lossless;
 * DecompressionStream runs native decoding instead of millions of JS noise calls. */
export class CloudVolumeLoader extends Loader<Data3DTexture> {
  load(url: string, onLoad: (texture: Data3DTexture) => void, onProgress?: (event: ProgressEvent) => void, onError?: (error: unknown) => void) {
    new FileLoader(this.manager).setResponseType('arraybuffer').load(url, buffer => {
      const compressed = new Blob([buffer as ArrayBuffer]);
      new Response(compressed.stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer().then(data => {
        const texture = new Data3DTexture(unpackCloudVolume(new Uint8Array(data)), CLOUD_WIDTH, CLOUD_HEIGHT, CLOUD_DEPTH);
        texture.format = RGBAFormat;
        texture.minFilter = texture.magFilter = LinearFilter;
        texture.unpackAlignment = 1; texture.needsUpdate = true;
        onLoad(texture);
      }).catch(error => { this.manager.itemError(url); onError?.(error); });
    }, onProgress, onError);
  }
}
