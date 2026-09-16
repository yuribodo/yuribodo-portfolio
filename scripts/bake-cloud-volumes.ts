/** Rebuild the original density fields without changing a voxel. */
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { packCloudVolume } from '../lib/lobby/cloud-volume-format';
import { cumulusField } from '../lib/lobby/cloud-volume';
for (let variant = 0; variant < 3; variant++) {
  const bytes = gzipSync(packCloudVolume(cumulusField(variant)), { level: 9 });
  writeFileSync(`public/lobby/world/cloud-volume-${variant}.bin.gz`, bytes);
  console.log(`Cloud ${variant}: ${bytes.length} bytes`);
}
