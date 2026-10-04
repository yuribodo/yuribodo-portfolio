export interface TerrainData {
  near: Float32Array;
  far: Float32Array;
  canopy: Uint8Array;
  trails: Uint8Array;
}
const MAGIC = 0x54455231;

/** Lossless Float32 heights and original RGBA masks, gzip-compressed by the build. */
export function packTerrainData(data: TerrainData): Uint8Array {
  const parts = [data.near, data.far, data.canopy, data.trails];
  const bytes = new Uint8Array(20 + parts.reduce((n, p) => n + p.byteLength, 0));
  const header = new DataView(bytes.buffer);
  header.setUint32(0, MAGIC, true);
  let offset = 20;
  parts.forEach((part, i) => {
    header.setUint32(4 + i * 4, part.byteLength, true);
    bytes.set(new Uint8Array(part.buffer, part.byteOffset, part.byteLength), offset);
    offset += part.byteLength;
  });
  return bytes;
}

export function unpackTerrainData(buffer: ArrayBuffer): TerrainData {
  if (buffer.byteLength < 20) throw new Error('Truncated terrain data');
  const header = new DataView(buffer);
  const lengths = [4, 8, 12, 16].map(offset => header.getUint32(offset, true));
  if (header.getUint32(0, true) !== MAGIC || lengths.some(n => !n || n % 4)
    || lengths.reduce((n, v) => n + v, 20) !== buffer.byteLength) throw new Error('Invalid terrain data');
  const [near, far, canopy, trails] = lengths;
  return {
    near: new Float32Array(buffer, 20, near / 4),
    far: new Float32Array(buffer, 20 + near, far / 4),
    canopy: new Uint8Array(buffer, 20 + near + far, canopy),
    trails: new Uint8Array(buffer, 20 + near + far + canopy, trails),
  };
}
