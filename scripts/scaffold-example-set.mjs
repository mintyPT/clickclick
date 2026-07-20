#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const [slug, ...variants] = process.argv.slice(2);
if (!slug || variants.length === 0) {
  console.error("Usage: node scripts/scaffold-example-set.mjs <slug> <variant...>");
  process.exit(1);
}

const baseDir = resolve("examples/use-cases");
await mkdir(baseDir, { recursive: true });

const htmlPath = join(baseDir, `${slug}.html`);
const cssPath = join(baseDir, `${slug}.css`);
const manifestPath = join(baseDir, `${slug}.manifest.json`);

await writeFile(htmlPath, `<main data-layer="post" class="post post-${variants[0]}">
  <p data-layer="brand" class="brand">Fictional Brand</p>
  <h1 data-layer="title">Replace this headline</h1>
  <p data-layer="url" class="url">example.test</p>
</main>
`, { flag: "wx" });

await writeFile(cssPath, `body {
  margin: 0;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}

.post {
  box-sizing: border-box;
  width: 1080px;
  height: 1080px;
  padding: 96px;
  background: #f4f4f4;
  color: #111;
}
`, { flag: "wx" });

for (const variant of variants) {
  await writeFile(join(baseDir, `${slug}-${variant}.json`), `[
  { "name": "post", "className": "post post-${variant}" },
  { "name": "brand", "text": "Fictional Brand" },
  { "name": "title", "text": "Original headline" },
  { "name": "url", "text": "example.test" }
]
`, { flag: "wx" });
}

await writeFile(manifestPath, `${JSON.stringify({
  name: titleCase(slug),
  description: "Describe the reusable visual system and note how source-specific names, logos, slogans, and colors were replaced.",
  template: `./${slug}.html`,
  css: `./${slug}.css`,
  width: 1080,
  height: 1080,
  variants: variants.map((variant) => ({
    id: variant,
    title: `${titleCase(variant)} Post`,
    modifyFile: `./${slug}-${variant}.json`,
    output: `./${slug}-${variant}.png`,
    alt: `${titleCase(slug)} ${variant} result`,
  })),
}, null, 2)}
`, { flag: "wx" });

function titleCase(value) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
