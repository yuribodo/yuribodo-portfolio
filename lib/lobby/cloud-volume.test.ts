import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { test } from 'node:test';
import { unpackCloudVolume } from './cloud-volume-format';
import { cumulusField } from './cloud-volume';

test('baked cloud volumes preserve every authored density and lighting byte', () => {
  for (let variant = 0; variant < 3; variant++) {
    const stored = gunzipSync(readFileSync(`public/lobby/world/cloud-volume-${variant}.bin.gz`));
    assert.deepEqual(unpackCloudVolume(new Uint8Array(stored)), cumulusField(variant));
  }
});
