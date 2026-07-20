#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readManifest, resolveManifestPath } from "./example-manifest.mjs";

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error("Usage: node scripts/render-example-set.mjs <manifest.json>");
  process.exit(1);
}

const { manifest, baseDir } = await readManifest(manifestPath);
const template = resolveManifestPath(baseDir, manifest.template);
const css = resolveManifestPath(baseDir, manifest.css);

for (const variant of manifest.variants) {
  const modifyFile = resolveManifestPath(baseDir, variant.modifyFile);
  const output = resolveManifestPath(baseDir, variant.output);
  const result = spawnSync("npm", [
    "run",
    "dev",
    "--",
    "template",
    template,
    "--css",
    css,
    "--modify-file",
    modifyFile,
    "--out",
    output,
    "--width",
    String(manifest.width),
    "--height",
    String(manifest.height),
  ], { stdio: "inherit" });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
