import { readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

export async function readManifest(manifestPath) {
  const absolutePath = resolve(manifestPath);
  const manifest = JSON.parse(await readFile(absolutePath, "utf8"));
  const baseDir = dirname(absolutePath);
  validateManifest(manifest, manifestPath);
  return { manifest, baseDir };
}

export function resolveManifestPath(baseDir, path) {
  return resolve(baseDir, path);
}

export function displayPath(path) {
  return relative(process.cwd(), path).replaceAll("\\", "/");
}

function validateManifest(manifest, manifestPath) {
  const required = ["name", "template", "css", "width", "height", "variants"];
  for (const field of required) {
    if (manifest[field] === undefined) {
      throw new Error(`Missing ${field} in ${manifestPath}`);
    }
  }
  if (!Array.isArray(manifest.variants) || manifest.variants.length === 0) {
    throw new Error(`Manifest must include at least one variant: ${manifestPath}`);
  }
  for (const variant of manifest.variants) {
    for (const field of ["id", "title", "modifyFile", "output"]) {
      if (!variant[field]) {
        throw new Error(`Variant is missing ${field} in ${manifestPath}`);
      }
    }
  }
}
