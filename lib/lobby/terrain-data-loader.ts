import { FileLoader, Loader } from 'three';
import { type TerrainData, unpackTerrainData } from './terrain-data-format';

export class TerrainDataLoader extends Loader<TerrainData> {
  load(url: string, onLoad: (value: TerrainData) => void, onProgress?: (event: ProgressEvent) => void, onError?: (error: unknown) => void) {
    new FileLoader(this.manager).setResponseType('arraybuffer').load(url, buffer => {
      const blob = new Blob([buffer as ArrayBuffer]);
      new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
        .then(buffer => onLoad(unpackTerrainData(buffer))).catch(error => { this.manager.itemError(url); onError?.(error); });
    }, onProgress, onError);
  }
}
