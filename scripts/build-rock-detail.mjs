/** Poly Haven Rock Face 03, CC0: preserve 2K surface detail in compact WebP.
 * Usage: node scripts/build-rock-detail.mjs /directory/with/downloaded/jpgs
 * Input files retain the Poly Haven 2K diffuse/OpenGL normal JPEG data.
 */
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const sharp=createRequire(require.resolve('next/package.json'))('sharp');
const sourceDir=process.argv[2]??'public/lobby/world';
for(const [input,output,quality]of [['rock-face-detail.jpg','rock-face-detail.webp',90],['rock-face-normal.jpg','rock-face-normal.webp',94]]){
 const source=path.join(sourceDir,input);
 await sharp(await fs.readFile(source)).webp({quality,effort:6}).toFile('public/lobby/world/'+output);
}
