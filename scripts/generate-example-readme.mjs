#!/usr/bin/env node
import { readManifest, resolveManifestPath, displayPath } from "./example-manifest.mjs";

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error("Usage: node scripts/generate-example-readme.mjs <manifest.json>");
  process.exit(1);
}

const { manifest, baseDir } = await readManifest(manifestPath);
const template = displayPath(resolveManifestPath(baseDir, manifest.template));
const css = displayPath(resolveManifestPath(baseDir, manifest.css));

const lines = [
  `### Render ${manifest.name}`,
  "",
  ...wrapText(manifest.description),
  "",
];

for (const variant of manifest.variants) {
  const modifyFile = displayPath(resolveManifestPath(baseDir, variant.modifyFile));
  const output = displayPath(resolveManifestPath(baseDir, variant.output));
  lines.push(
    `#### ${variant.title}`,
    "",
    "CLI:",
    "",
    "```bash",
    `npm run dev -- template ${template} \\`,
    `  --css ${css} \\`,
    `  --modify-file ${modifyFile} \\`,
    `  --out ${output} \\`,
    `  --width ${manifest.width} \\`,
    `  --height ${manifest.height}`,
    "```",
    "",
    "Library:",
    "",
    "```ts",
    "await renderTemplate({",
    `  htmlPath: "${template}",`,
    `  cssPath: "${css}",`,
    `  modifications: JSON.parse(await readFile("${modifyFile}", "utf8")),`,
    `  viewport: { width: ${manifest.width}, height: ${manifest.height} },`,
    `  output: { path: "${output}" },`,
    "});",
    "```",
    "",
    "Result:",
    "",
    `![${variant.alt ?? variant.title}](./${output})`,
    "",
  );
}

console.log(lines.join("\n").trimEnd());

function wrapText(text, width = 100) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}
