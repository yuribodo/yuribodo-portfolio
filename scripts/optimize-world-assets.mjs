/** Run after prepare-world-assets.py. Original downloads stay outside the repo. */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const sharp = require(require.resolve('sharp', { paths: [require.resolve('next')] }));
const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/optimize-world-assets.mjs /path/to/skybound-assets');
for (const name of ['ruins-kit', 'nature-kit', 'coastal-cliff']) {
  execFileSync('pnpm', ['exec', 'gltf-transform', 'optimize', `assets/lobby-world/production/${name}.glb`, `public/lobby/world/${name}.glb`, '--compress', 'meshopt', '--texture-compress', 'webp', '--texture-size', '1024', '--flatten', 'false', '--join', 'false', '--instance', 'false', '--palette', 'false', '--simplify', 'false'], { stdio: 'inherit' });
}
for (const [channel, name, size] of [['Diffuse', 'color', 2048], ['nor_gl', 'normal', 1024], ['Rough', 'roughness', 512], ['AO', 'ao', 512]]) {
  await sharp(resolve(source, `floor-${channel}.jpg`)).resize(size, size).webp({ quality: 85 }).toFile(`public/lobby/world/paving-${name}.webp`);
}
for (const [file, name] of [['ground_baseColor.png', 'color'], ['ground_normal_GL.png', 'normal']]) {
  await sharp(resolve(source, 'nature/StarterNaturePack_(FoliageKit1)/FBX_Textures/Textures/Ground1', file)).resize(1024, 1024).webp({ quality: 85 }).toFile(`public/lobby/world/earth-${name}.webp`);
}
