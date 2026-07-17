#!/usr/bin/env node
import { readFileSync, statSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const packJsonPath = process.argv[2];
if (!packJsonPath) {
  fail("Usage: node scripts/verify-package.mjs <npm-pack-json>");
}

const packJson = JSON.parse(readFileSync(packJsonPath, "utf8"));
const packResult = Array.isArray(packJson) ? packJson[0] : (packJson.files ? packJson : packJson[packageJson.name]);
if (!packResult?.files) {
  fail("npm pack dry-run output did not include package file metadata.");
}

const files = new Set(packResult.files.map((file) => file.path));

const requiredFiles = [
  "package.json",
  "README.md",
  "LICENSE",
  "dist/index.js",
  "dist/index.d.ts",
  "dist/cli/index.js",
  "dist/cli/index.d.ts",
];

const missing = requiredFiles.filter((file) => !files.has(file));
if (missing.length > 0) {
  fail(`Package dry-run is missing required files: ${missing.join(", ")}`);
}

const binPath = packageJson.bin?.clickclick?.replace(/^\.\//, "");
if (!binPath || !files.has(binPath)) {
  fail(`Package dry-run does not include the clickclick bin entry: ${packageJson.bin?.clickclick ?? "<unset>"}`);
}

const cli = readFileSync(binPath, "utf8");
if (!cli.startsWith("#!/usr/bin/env node")) {
  fail(`${binPath} must start with the node shebang so npm can expose the clickclick binary.`);
}

const mode = statSync(binPath).mode;
if ((mode & 0o111) === 0) {
  fail(`${binPath} is not executable in the built output.`);
}

console.log(`Verified ${packageJson.name}@${packageJson.version} package dry-run (${packResult.files.length} files).`);

function fail(message) {
  console.error(message);
  process.exit(1);
}
