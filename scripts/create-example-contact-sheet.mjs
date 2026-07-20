#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { PNG } from "pngjs";
import { readManifest, resolveManifestPath } from "./example-manifest.mjs";

const manifestPath = process.argv[2];
const outputArg = process.argv[3];
if (!manifestPath || !outputArg) {
  console.error("Usage: node scripts/create-example-contact-sheet.mjs <manifest.json> <out.png>");
  process.exit(1);
}

const { manifest, baseDir } = await readManifest(manifestPath);
const images = await Promise.all(manifest.variants.map(async (variant) => {
  const path = resolveManifestPath(baseDir, variant.output);
  return PNG.sync.read(await readFile(path));
}));

const columns = Math.min(3, images.length);
const rows = Math.ceil(images.length / columns);
const tileWidth = images[0].width;
const tileHeight = images[0].height;
const gap = 24;
const padding = 48;
const sheet = new PNG({
  width: padding * 2 + columns * tileWidth + (columns - 1) * gap,
  height: padding * 2 + rows * tileHeight + (rows - 1) * gap,
});

fill(sheet, 34, 34, 34, 255);

images.forEach((image, index) => {
  const column = index % columns;
  const row = Math.floor(index / columns);
  const x = padding + column * (tileWidth + gap);
  const y = padding + row * (tileHeight + gap);
  PNG.bitblt(image, sheet, 0, 0, image.width, image.height, x, y);
});

const output = resolve(outputArg);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, PNG.sync.write(sheet));

function fill(png, r, g, b, a) {
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = (png.width * y + x) << 2;
      png.data[index] = r;
      png.data[index + 1] = g;
      png.data[index + 2] = b;
      png.data[index + 3] = a;
    }
  }
}
