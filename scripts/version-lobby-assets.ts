import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const versions: Record<string, string> = {};
  async function walk(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (/\.(glb|webp|png|jpg|wasm|js|gz)$/.test(file)) {
        versions[`/${file.slice('public/'.length)}`] = createHash('sha256').update(await readFile(file)).digest('hex').slice(0, 16);
      }
    }
  }
  await walk('public/lobby');
  const entries = Object.fromEntries(Object.entries(versions).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile('lib/lobby/asset-versions.ts', `// Generated from file contents by scripts/version-lobby-assets.ts.\nexport const ASSET_VERSIONS: Record<string, string> = ${JSON.stringify(entries, null, 2)};\n`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
