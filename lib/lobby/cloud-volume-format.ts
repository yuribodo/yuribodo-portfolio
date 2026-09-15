export const CLOUD_WIDTH = 128, CLOUD_HEIGHT = 96, CLOUD_DEPTH = 80;
const VOXELS = CLOUD_WIDTH * CLOUD_HEIGHT * CLOUD_DEPTH;
/** Store density and light in separate planes for better lossless compression.
 * Height and opacity are analytic, so sending them would duplicate constants. */
export function packCloudVolume(rgba: Uint8Array) {
  if (rgba.length !== VOXELS * 4) throw new Error('Invalid cloud volume');
  const packed = new Uint8Array(VOXELS * 2);
  for (let i = 0; i < VOXELS; i++) { packed[i] = rgba[i * 4]; packed[VOXELS + i] = rgba[i * 4 + 1]; }
  return packed;
}
export function unpackCloudVolume(packed: Uint8Array) {
  if (packed.length !== VOXELS * 2) throw new Error('Invalid cloud volume');
  const rgba = new Uint8Array(VOXELS * 4);
  for (let i = 0; i < VOXELS; i++) {
    rgba[i*4] = packed[i]; rgba[i*4+1] = packed[VOXELS+i];
    rgba[i*4+2] = (Math.floor(i / CLOUD_WIDTH) % CLOUD_HEIGHT) / CLOUD_HEIGHT * 255;
    rgba[i*4+3] = 255;
  }
  return rgba;
}
