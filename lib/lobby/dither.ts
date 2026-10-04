// Quantize each byte through a tiny lookup table. Uint8ClampedArray preserves
// the original Canvas rounding exactly, including halfway-to-even values.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function createDither() {
  const table = new Uint8ClampedArray(16 * 256);
  let previousStrength = NaN;
  return (data: Uint8ClampedArray, width: number, height: number, strength: number) => {
    if (strength !== previousStrength) {
      previousStrength = strength;
      const divisor = Math.max(2, Math.round(2 + (1 - strength) * 14)) - 1;
      for (let cell = 0; cell < 16; cell++) {
        for (let value = 0; value < 256; value++) {
          table[cell * 256 + value] = Math.floor(value / 255 * divisor + BAYER[cell] / 16 * strength) / divisor * 255;
        }
      }
    }
    for (let y = 0; y < height; y++) {
      const row = (y & 3) * 4;
      for (let x = 0, index = y * width * 4; x < width; x++, index += 4) {
        const offset = (row + (x & 3)) * 256;
        data[index] = table[offset + data[index]];
        data[index + 1] = table[offset + data[index + 1]];
        data[index + 2] = table[offset + data[index + 2]];
      }
    }
  };
}
