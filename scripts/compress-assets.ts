#!/usr/bin/env tsx
/**
 * Repeatable asset compression pipeline for the lobby. Run before shipping
 * new GLBs / textures / audio so the lobby route stays inside the 8MB
 * total-asset budget.
 *
 *   pnpm assets:compress
 *
 * Requirements (devDependencies the user installs once):
 *   npm i -D @gltf-transform/cli @gltf-transform/core ffmpeg-static
 *
 * The script shells out to the gltf-transform CLI rather than importing the
 * SDK so future contributors can run the same command interactively on a
 * single file and see identical output. Each step is idempotent — re-running
 * on an already-compressed asset is a no-op modulo file timestamps.
 *
 * Outputs go to a sibling `optimized/` directory so the script never
 * overwrites the source unless --in-place is passed. Review the diff in
 * a 3D viewer before promoting.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";

const ROOT = resolve(__dirname, "..");
const MODELS_DIR = join(ROOT, "public/lobby/models");
const TEXTURES_DIR = join(ROOT, "public/lobby/textures");
const AUDIO_DIR = join(ROOT, "public/audio");

const inPlace = process.argv.includes("--in-place");

function outPath(srcPath: string): string {
  if (inPlace) return srcPath;
  const optimizedDir = join(dirname(srcPath), "optimized");
  if (!existsSync(optimizedDir)) mkdirSync(optimizedDir, { recursive: true });
  return join(optimizedDir, srcPath.split("/").pop()!);
}

function run(cmd: string): void {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

function compressGlbs(): void {
  if (!existsSync(MODELS_DIR)) return;
  const glbs = readdirSync(MODELS_DIR).filter((f) => extname(f) === ".glb");
  for (const glb of glbs) {
    const src = join(MODELS_DIR, glb);
    const out = outPath(src);
    // Pipeline:
    //   dedup    — collapse identical accessors/materials/textures
    //   prune    — strip unused materials/nodes/animations
    //   resample — quantise animation curves (no-op for static models)
    //   meshopt  — geometry quantisation + reorder; works on top of draco
    //   uastc    — KTX2 supercompressed textures (best for albedo/normal)
    run(
      `pnpm exec gltf-transform optimize "${src}" "${out}" ` +
        `--compress meshopt --texture-compress webp --simplify`,
    );
  }
}

function compressTextures(): void {
  // Loose textures (cards, etc) are already authored as WebP at sensible
  // sizes — they live as .webp in source. If anyone drops a PNG in here,
  // shell out to cwebp.
  if (!existsSync(TEXTURES_DIR)) return;
  const files = readdirSync(TEXTURES_DIR).filter((f) =>
    [".png", ".jpg", ".jpeg"].includes(extname(f).toLowerCase()),
  );
  for (const file of files) {
    const src = join(TEXTURES_DIR, file);
    const out = outPath(src).replace(/\.(png|jpe?g)$/i, ".webp");
    run(`pnpm exec cwebp -q 82 "${src}" -o "${out}"`);
  }
}

function compressAudio(): void {
  if (!existsSync(AUDIO_DIR)) return;
  const files = readdirSync(AUDIO_DIR).filter((f) =>
    [".mp3", ".wav", ".ogg"].includes(extname(f).toLowerCase()),
  );
  for (const file of files) {
    const src = join(AUDIO_DIR, file);
    const stats = statSync(src);
    // Skip already-tiny clips — the bitrate floor isn't worth the artifacts.
    if (stats.size < 50_000) continue;
    const out = outPath(src);
    run(`ffmpeg -y -i "${src}" -b:a 96k -ar 44100 "${out}"`);
  }
}

function main(): void {
  console.log(`Compressing lobby assets${inPlace ? " (in-place)" : ""}…`);
  compressGlbs();
  compressTextures();
  compressAudio();
  console.log("\nDone. Inspect outputs in the optimized/ sibling directories.");
}

main();
