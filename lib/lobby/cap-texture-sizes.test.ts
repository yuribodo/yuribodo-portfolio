import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CAPS, MAX_PIXEL_SHARE, assertPreserved, capFor, fitWithin, imageUsage, parseGlb, repack, textureBytes, writeGlb } from '../../scripts/cap-texture-sizes.mjs';

interface Json { images: { bufferView: number; mimeType: string }[]; bufferViews: Record<string, unknown>[]; buffers: { byteLength: number; extensions?: unknown }[]; [key: string]: unknown }

/** Draco-style plain views + a meshopt-style compressed view that lives in buffer 0 but points at a fallback buffer. */
function sampleGlb() {
  const mesh = Buffer.from('MESHDATA12'), image0 = Buffer.from('IMAGE-ZERO-BYTES!'), image1 = Buffer.from('IMG1'), compressed = Buffer.from('COMPRESSED-STREAM');
  const parts = [mesh, image0, compressed, image1];
  const offsets: number[] = []; let cursor = 0;
  const padded = parts.map(part => { offsets.push(cursor); const bytes = Buffer.concat([part, Buffer.alloc((4 - part.length % 4) % 4)]); cursor += bytes.length; return bytes; });
  const json: Json = {
    asset: { version: '2.0' },
    buffers: [{ byteLength: cursor }, { byteLength: 99, extensions: { EXT_meshopt_compression: { fallback: true } } }],
    bufferViews: [
      { buffer: 0, byteOffset: offsets[0], byteLength: mesh.length },
      { buffer: 0, byteOffset: offsets[1], byteLength: image0.length },
      { buffer: 1, byteOffset: 0, byteLength: 99, extensions: { EXT_meshopt_compression: { buffer: 0, byteOffset: offsets[2], byteLength: compressed.length, count: 3, byteStride: 4 } } },
      { buffer: 0, byteOffset: offsets[3], byteLength: image1.length },
    ],
    images: [{ bufferView: 1, mimeType: 'image/webp' }, { bufferView: 3, mimeType: 'image/webp' }],
    textures: [{ source: 0 }, { extensions: { EXT_texture_webp: { source: 1 } } }],
    materials: [{ name: 'a', pbrMetallicRoughness: { baseColorTexture: { index: 0 } }, normalTexture: { index: 1 } }, { name: 'b', pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
  };
  return { glb: writeGlb(json, Buffer.concat(padded)), image0, image1, mesh, compressed };
}

describe('capFor', () => {
  const rows = [['f', 'house:*', 256], ['f', 'house:Roof|base', 128], ['f', '*', 512], ['g', '*', 64]];
  it('prefers the exact row, then the longest prefix, then the file row', () => {
    assert.equal(capFor(rows, 'f', ['house:Roof|base'])?.max, 128);
    assert.equal(capFor(rows, 'f', ['house:Door|base'])?.max, 256);
    assert.equal(capFor(rows, 'f', ['barn:Door|base'])?.max, 512);
    assert.equal(capFor(rows, 'g', ['x|base'])?.max, 64);
    assert.equal(capFor(rows, 'h', ['x|base']), undefined);
  });
  it('keeps the largest cap of a shared image and uses q95 for auxiliary maps', () => {
    assert.equal(capFor(rows, 'f', ['house:Roof|base', 'house:Door|base'])?.max, 256);
    assert.equal(capFor(rows, 'f', ['a|normal'])?.quality, 95);
    assert.equal(capFor(rows, 'f', ['a|base'])?.quality, 92);
    assert.equal(capFor(rows, 'f', ['a|base', 'a|mr'])?.quality, 95);
  });
});

describe('fitWithin', () => {
  it('never enlarges and keeps the aspect ratio', () => {
    assert.equal(fitWithin(512, 512, 1024), null);
    assert.equal(fitWithin(512, 512, 512), null);
    assert.deepEqual(fitWithin(2048, 1024, 512), [512, 256]);
    assert.deepEqual(fitWithin(1024, 1024, 128), [128, 128]);
  });
  it('skips caps that remove less than a quarter of the pixels', () => {
    assert.equal(fitWithin(1024, 1024, 960), null);
    assert.ok(MAX_PIXEL_SHARE <= 0.75);
    assert.deepEqual(fitWithin(1024, 1024, 768), [768, 768]);
  });
});

describe('texture memory', () => {
  it('counts RGBA plus the mip chain', () => {
    assert.equal(textureBytes(1024, 1024), Math.round(1024 * 1024 * 4 * 4 / 3));
  });
});

describe('CAPS table', () => {
  it('has unique keys per file, caps of at least 64 and the dragon floor of 512', () => {
    const seen = new Set<string>();
    for (const [file, key, max] of CAPS as [string, string, number][]) {
      assert.ok(!seen.has(`${file}#${key}`), `${file} ${key} is listed twice`);
      seen.add(`${file}#${key}`);
      assert.ok(max >= 64);
    }
    for (const slot of ['base', 'normal']) assert.ok((CAPS as [string, string, number][]).some(([file, key, max]) => file === 'toothless-flight' && key === `Body|${slot}` && max >= 512));
  });
});

describe('repack', () => {
  it('replaces only the image bytes and keeps meshopt and plain ranges byte for byte', () => {
    const { glb, mesh, compressed, image1 } = sampleGlb();
    const before = parseGlb(glb), json = structuredClone(before.json) as Json;
    const bigger = Buffer.from('A-MUCH-LONGER-REPLACEMENT-IMAGE');
    const packed = writeGlb(json, repack(json, before.bin, new Map([[0, bigger]]))), after = parseGlb(packed);
    assertPreserved(before, after, new Set([0]));
    const view = (index: number) => after.json.bufferViews[index] as { byteOffset: number; byteLength: number };
    assert.equal(after.bin.subarray(view(0).byteOffset, view(0).byteOffset + view(0).byteLength).toString(), mesh.toString());
    assert.equal(after.bin.subarray(view(1).byteOffset, view(1).byteOffset + view(1).byteLength).toString(), bigger.toString());
    assert.equal(after.bin.subarray(view(3).byteOffset, view(3).byteOffset + view(3).byteLength).toString(), image1.toString());
    const ext = (after.json.bufferViews[2] as { extensions: { EXT_meshopt_compression: { byteOffset: number; byteLength: number } } }).extensions.EXT_meshopt_compression;
    assert.equal(after.bin.subarray(ext.byteOffset, ext.byteOffset + ext.byteLength).toString(), compressed.toString());
    assert.equal(ext.byteOffset % 4, 0);
    assert.equal(after.json.buffers[0].byteLength, after.bin.length);
    assert.equal((after.json.buffers[1] as { byteLength: number }).byteLength, 99);
  });
  it('is the identity when nothing is replaced', () => {
    const { glb } = sampleGlb(), before = parseGlb(glb), json = structuredClone(before.json) as Json;
    assert.deepEqual(writeGlb(json, repack(json, before.bin, new Map())), glb);
  });
  it('detects altered non-image bytes', () => {
    const { glb } = sampleGlb(), before = parseGlb(glb), json = structuredClone(before.json) as Json, bin = Buffer.from(before.bin);
    bin[0] ^= 1;
    assert.throws(() => assertPreserved(before, { json, bin }, new Set([0])), /non-image bytes changed/);
  });
});

describe('imageUsage', () => {
  it('maps images to material|slot through EXT_texture_webp sources', () => {
    const usage = imageUsage(parseGlb(sampleGlb().glb).json);
    assert.deepEqual(usage.get(0), ['a|base', 'b|base']);
    assert.deepEqual(usage.get(1), ['a|normal']);
  });
});
