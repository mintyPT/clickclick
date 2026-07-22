#!/usr/bin/env node
import { mkdir, readFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import { ClickClickError, clearCache, listConfigTemplates, renderImage, renderRecipe, renderTemplate, renderTemplateSet, screenshotUrl } from "../index.js";
import type { LayerModification, RenderCacheOptions, RenderImageInput, RenderImageResult, RenderWarning, TemplateInput } from "../types.js";
import { collectOption, parseCacheOptions, parseInteger, parseOutputOptions, parseRenderOptions, parseSizeOptions } from "./options.js";
import type { ParsedRenderSize } from "./options.js";
import { registerPresetCommands } from "./presets.js";

const program = new Command();

program
  .name("clickclick")
  .description("Generate PNG and JPEG social images from HTML.")
  .version("0.1.0");

program
  .command("render")
  .argument("<html-file>", "HTML file to render")
  .option("--css <file>", "Optional CSS file to inject")
  .option("--out, --output <file>", "Output image path")
  .option("--out-dir <dir>", "Directory for multi-size output images")
  .option("--size <size>", "Named size or WIDTHxHEIGHT. Repeat for multiple outputs.", collectOption, [])
  .option("--sizes <sizes>", "Comma-separated named sizes or WIDTHxHEIGHT values")
  .option("--width <px>", "Viewport width", parseInteger)
  .option("--height <px>", "Viewport height", parseInteger)
  .option("--format <format>", "Output format: png or jpeg")
  .option("--quality <number>", "JPEG quality from 0 to 100", parseInteger)
  .option("--omit-background", "Allow transparent PNG backgrounds")
  .option("--selector <selector>", "Screenshot a specific element")
  .option("--wait-until <event>", "Playwright wait event")
  .option("--delay <ms>", "Delay before screenshot", parseInteger)
  .option("--cache", "Reuse cached output for identical deterministic input")
  .option("--cache-dir <dir>", "Cache directory", ".clickclick-cache")
  .option("--cache-info", "Print cache hit/miss information")
  .option("--strict", "Exit non-zero when renderer warnings are produced")
  .action(async (htmlFile: string, options) => {
    const htmlPath = resolve(htmlFile);
    const cssPath = options.css ? resolve(options.css) : undefined;
    const html = await readFileChecked(htmlPath, "HTML");
    const css = cssPath ? await readFileChecked(cssPath, "CSS") : undefined;
    const input = {
      document: {
        html,
        css,
        baseUrl: pathToFileURL(dirname(htmlPath)).href + "/",
      },
      viewport: {
        width: options.width,
        height: options.height,
      },
      output: parseOutputOptions(options),
      render: parseRenderOptions(options),
    };
    const sizes = parseSizeOptions(options);
    if (sizes.length > 0) {
      await runMultiSizeRender(input, sizes, multiSizeOutputOptions(options, basenameWithoutExtension(htmlPath)), Boolean(options.strict), parseCacheOptions(options));
      return;
    }
    await runRender(input, Boolean(options.strict), parseCacheOptions(options));
  });

program
  .command("screenshot-url")
  .argument("<url>", "URL to screenshot")
  .option("--out, --output <file>", "Output image path")
  .option("--width <px>", "Viewport width", parseInteger)
  .option("--height <px>", "Viewport height", parseInteger)
  .option("--full-page", "Screenshot the full scrollable page")
  .option("--selector <selector>", "Screenshot a specific element")
  .option("--wait-until <event>", "Playwright wait event")
  .option("--delay <ms>", "Delay before screenshot", parseInteger)
  .option("--format <format>", "Output format: png or jpeg")
  .option("--quality <number>", "JPEG quality from 0 to 100", parseInteger)
  .option("--omit-background", "Allow transparent PNG backgrounds")
  .option("--locale <locale>", "Browser locale, such as en-US")
  .action(async (url: string, options) => {
    await screenshotUrl({
      url,
      viewport: {
        width: options.width,
        height: options.height,
      },
      output: parseOutputOptions(options),
      render: {
        ...parseRenderOptions(options),
        fullPage: Boolean(options.fullPage),
      },
      locale: typeof options.locale === "string" ? options.locale : undefined,
    });
  });

program
  .command("template")
  .argument("<html-file>", "HTML template file to render")
  .option("--css <file>", "Optional CSS file to inject")
  .option("--modify-json <json>", "Layer modifications as JSON")
  .option("--modify-file <file>", "Layer modifications JSON file")
  .option("--font <spec...>", "Font registry entry: Family=path-or-url")
  .option("--debug-dir <dir>", "Write source and warning diagnostics")
  .option("--on-missing-layer <mode>", "Missing layer behavior: warn, error, or ignore")
  .option("--on-duplicate-layer <mode>", "Duplicate layer behavior: warn, error, or ignore")
  .option("--out, --output <file>", "Output image path")
  .option("--out-dir <dir>", "Directory for multi-size output images")
  .option("--size <size>", "Named size or WIDTHxHEIGHT. Repeat for multiple outputs.", collectOption, [])
  .option("--sizes <sizes>", "Comma-separated named sizes or WIDTHxHEIGHT values")
  .option("--width <px>", "Viewport width", parseInteger)
  .option("--height <px>", "Viewport height", parseInteger)
  .option("--format <format>", "Output format: png or jpeg")
  .option("--quality <number>", "JPEG quality from 0 to 100", parseInteger)
  .option("--selector <selector>", "Screenshot a specific element")
  .option("--wait-until <event>", "Playwright wait event")
  .option("--delay <ms>", "Delay before screenshot", parseInteger)
  .option("--cache", "Reuse cached output for identical deterministic input")
  .option("--cache-dir <dir>", "Cache directory", ".clickclick-cache")
  .option("--cache-info", "Print cache hit/miss information")
  .option("--strict", "Exit non-zero when renderer warnings are produced")
  .action(async (htmlFile: string, options) => {
    const htmlPath = resolve(htmlFile);
    const cssPath = options.css ? resolve(options.css) : undefined;
    const input = {
      htmlPath,
      cssPath,
      modifications: await parseModifications(options),
      fonts: parseFonts(options.font),
      debugDir: typeof options.debugDir === "string" ? options.debugDir : undefined,
      onMissingLayer: parseLayerBehavior(options.onMissingLayer),
      onDuplicateLayer: parseLayerBehavior(options.onDuplicateLayer),
      viewport: {
        width: options.width,
        height: options.height,
      },
      output: parseOutputOptions(options),
      render: parseRenderOptions(options),
      cache: parseCacheOptions(options),
    };
    const sizes = parseSizeOptions(options);
    if (sizes.length > 0) {
      await runMultiSizeTemplate(input, sizes, multiSizeOutputOptions(options, basenameWithoutExtension(htmlPath)), Boolean(options.strict));
      return;
    }
    await runTemplate(input, Boolean(options.strict));
  });

program
  .command("cache")
  .description("Manage the local render cache.")
  .command("clear")
  .option("--cache-dir <dir>", "Cache directory", ".clickclick-cache")
  .action(async (options) => {
    await clearCache({ dir: typeof options.cacheDir === "string" ? options.cacheDir : undefined });
  });

const config = program.command("config").description("Render local templates from a project config.");

config
  .command("templates")
  .argument("<config-file>", "ClickClick config JSON file")
  .description("List templates registered in a config file")
  .action(async (configFile: string) => {
    for (const name of await listConfigTemplates(resolve(configFile))) {
      console.log(name);
    }
  });

config
  .command("recipe")
  .argument("<config-file>", "ClickClick config JSON file")
  .argument("<name>", "Recipe name")
  .option("--modify-json <json>", "Additional layer modifications as JSON")
  .option("--modify-file <file>", "Additional layer modifications JSON file")
  .option("--debug-dir <dir>", "Write source and warning diagnostics")
  .option("--out, --output <file>", "Output image path")
  .option("--out-dir <dir>", "Directory for multi-size output images")
  .option("--size <size>", "Named size or WIDTHxHEIGHT. Repeat for multiple outputs.", collectOption, [])
  .option("--sizes <sizes>", "Comma-separated named sizes or WIDTHxHEIGHT values")
  .option("--width <px>", "Viewport width", parseInteger)
  .option("--height <px>", "Viewport height", parseInteger)
  .option("--format <format>", "Output format: png or jpeg")
  .option("--quality <number>", "JPEG quality from 0 to 100", parseInteger)
  .option("--cache", "Reuse cached output for identical deterministic input")
  .option("--cache-dir <dir>", "Cache directory", ".clickclick-cache")
  .option("--cache-info", "Print cache hit/miss information")
  .option("--strict", "Exit non-zero when renderer warnings are produced")
  .action(async (configFile: string, name: string, options) => {
    const input = {
      modifications: await parseModifications(options),
      debugDir: typeof options.debugDir === "string" ? options.debugDir : undefined,
      viewport: { width: options.width, height: options.height },
      output: parseOutputOptions(options),
      cache: parseCacheOptions(options),
    };
    const sizes = parseSizeOptions(options);
    if (sizes.length > 0) {
      await runMultiSizeRecipe(resolve(configFile), name, input, sizes, multiSizeOutputOptions(options, name), Boolean(options.strict));
      return;
    }
    const result = await renderRecipe(resolve(configFile), name, input);
    reportResult(result, Boolean(options.strict), Boolean(options.cacheInfo));
  });

config
  .command("set")
  .argument("<config-file>", "ClickClick config JSON file")
  .argument("<name>", "Template set name")
  .option("--out-dir <dir>", "Directory for generated images")
  .option("--cache", "Reuse cached output for identical deterministic input")
  .option("--cache-dir <dir>", "Cache directory", ".clickclick-cache")
  .option("--cache-info", "Print cache hit/miss information")
  .option("--strict", "Exit non-zero when renderer warnings are produced")
  .action(async (configFile: string, name: string, options) => {
    const outDir = typeof options.outDir === "string" ? resolve(options.outDir) : undefined;
    if (outDir) await mkdir(outDir, { recursive: true });
    const results = await renderTemplateSet(resolve(configFile), name, outDir, {
      cache: parseCacheOptions(options),
    });
    for (const result of results) {
      reportResult(result, Boolean(options.strict), Boolean(options.cacheInfo));
      if (result.path) console.log(result.path);
    }
  });

program
  .command("preview")
  .argument("<html-file>", "HTML template file to preview")
  .option("--css <file>", "Optional CSS file to inject")
  .option("--out-dir <dir>", "Directory for preview image", ".clickclick-preview")
  .option("--watch", "Keep watching files and re-render on changes")
  .option("--width <px>", "Viewport width", parseInteger)
  .option("--height <px>", "Viewport height", parseInteger)
  .action(async (htmlFile: string, options) => {
    const htmlPath = resolve(htmlFile);
    const cssPath = options.css ? resolve(options.css) : undefined;
    const outDir = resolve(options.outDir);
    await mkdir(outDir, { recursive: true });
    const output = { path: join(outDir, "preview.png") };
    const renderOnce = async () => {
      await runTemplate({
        htmlPath,
        cssPath,
        output,
        viewport: { width: options.width, height: options.height },
      }, false);
      console.log(output.path);
    };
    await renderOnce();
    if (options.watch) {
      const { watch } = await import("node:fs");
      const rerender = () => { void renderOnce().catch(reportError); };
      watch(htmlPath, rerender);
      if (cssPath) watch(cssPath, rerender);
      await new Promise(() => undefined);
    }
  });

registerPresetCommands(program.command("preset").description("Render built-in presets."), {
  runRender,
});

program.parseAsync().catch((error: unknown) => {
  reportError(error);
  process.exitCode = 1;
});

async function runRender(input: RenderImageInput, strict: boolean, cache?: RenderCacheOptions) {
  const result = await renderImage(input, { cache });
  reportResult(result, strict, isCacheInfoEnabled(cache));
}

async function runTemplate(input: TemplateInput, strict: boolean) {
  const result = await renderTemplate(input);
  reportResult(result, strict, isCacheInfoEnabled(input.cache));
}

async function runMultiSizeRender(input: RenderImageInput, sizes: ParsedRenderSize[], output: MultiSizeOutputOptions, strict: boolean, cache?: RenderCacheOptions) {
  await mkdir(output.dir, { recursive: true });
  for (const size of sizes) {
    const path = multiSizePath(output, size);
    const result = await renderImage({
      ...input,
      viewport: { width: size.width, height: size.height },
      output: { ...input.output, path },
    }, { cache });
    reportResult(result, strict, isCacheInfoEnabled(cache));
    console.log(path);
  }
}

async function runMultiSizeTemplate(input: TemplateInput, sizes: ParsedRenderSize[], output: MultiSizeOutputOptions, strict: boolean) {
  await mkdir(output.dir, { recursive: true });
  for (const size of sizes) {
    const path = multiSizePath(output, size);
    const result = await renderTemplate({
      ...input,
      viewport: { width: size.width, height: size.height },
      output: { ...input.output, path },
    });
    reportResult(result, strict, isCacheInfoEnabled(input.cache));
    console.log(path);
  }
}

async function runMultiSizeRecipe(configPath: string, name: string, input: Partial<TemplateInput>, sizes: ParsedRenderSize[], output: MultiSizeOutputOptions, strict: boolean) {
  await mkdir(output.dir, { recursive: true });
  for (const size of sizes) {
    const path = multiSizePath(output, size);
    const result = await renderRecipe(configPath, name, {
      ...input,
      viewport: { width: size.width, height: size.height },
      output: { ...input.output, path },
    });
    reportResult(result, strict, isCacheInfoEnabled(input.cache));
    console.log(path);
  }
}

interface MultiSizeOutputOptions {
  dir: string;
  baseName: string;
  extension: "png" | "jpg";
}

function multiSizeOutputOptions(options: Record<string, unknown>, baseName: string): MultiSizeOutputOptions {
  if (typeof options.output === "string") {
    throw new ClickClickError("INVALID_INPUT", "--out cannot be combined with --size or --sizes. Use --out-dir for multi-size output.");
  }
  if (typeof options.outDir !== "string") {
    throw new ClickClickError("INVALID_INPUT", "--out-dir is required when --size or --sizes is used.");
  }
  if (options.format !== undefined && options.format !== "png" && options.format !== "jpeg") {
    throw new ClickClickError("INVALID_INPUT", "Format must be png or jpeg.");
  }
  return {
    dir: resolve(options.outDir),
    baseName,
    extension: options.format === "jpeg" ? "jpg" : "png",
  };
}

function multiSizePath(output: MultiSizeOutputOptions, size: ParsedRenderSize): string {
  return join(output.dir, `${output.baseName}-${size.label}.${output.extension}`);
}

function basenameWithoutExtension(path: string): string {
  return basename(path).replace(/\.[^.]+$/, "");
}

function reportWarnings(result: { warnings: RenderWarning[] }, strict: boolean) {
  for (const warning of result.warnings) {
    const target = "selector" in warning ? warning.selector : "layer" in warning ? warning.layer : undefined;
    console.error(`warning ${warning.code}: ${target ? `${target} ` : ""}${warning.message}`);
  }
  if (strict && result.warnings.length > 0) {
    process.exitCode = 1;
  }
}

function reportResult(result: RenderImageResult, strict: boolean, cacheInfo: boolean) {
  if (cacheInfo && result.cache) {
    console.error(`cache ${result.cache.hit ? "hit" : "miss"}${result.cache.skippedReason ? ` (${result.cache.skippedReason})` : ""}: ${result.cache.key ?? result.cache.dir ?? ""}`.trim());
  }
  reportWarnings(result, strict);
}

function isCacheInfoEnabled(cache: RenderCacheOptions | undefined): boolean {
  return Boolean(cache && cache !== true && cache.info);
}

async function readFileChecked(path: string, label: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch {
    throw new ClickClickError("INVALID_INPUT", `${label} file could not be read: ${path}`);
  }
}

async function parseModifications(options: Record<string, unknown>): Promise<LayerModification[] | undefined> {
  const parts: LayerModification[] = [];
  if (typeof options.modifyJson === "string") {
    parts.push(...parseModificationJson(options.modifyJson));
  }
  if (typeof options.modifyFile === "string") {
    parts.push(...parseModificationJson(await readFileChecked(resolve(options.modifyFile), "Modification JSON")));
  }
  return parts.length > 0 ? parts : undefined;
}

function parseModificationJson(raw: string): LayerModification[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new ClickClickError("INVALID_INPUT", "Layer modifications must be valid JSON.", error);
  }
  const modifications = Array.isArray(parsed) ? parsed : [parsed];
  for (const item of modifications) {
    if (!item || typeof item !== "object" || typeof (item as { name?: unknown }).name !== "string") {
      throw new ClickClickError("INVALID_INPUT", "Each layer modification must be an object with a string name.");
    }
  }
  return modifications as LayerModification[];
}

function parseFonts(values: unknown) {
  if (!Array.isArray(values)) return undefined;
  return values.map((value) => {
    if (typeof value !== "string" || !value.includes("=")) {
      throw new ClickClickError("INVALID_INPUT", "Font entries must use Family=path-or-url.");
    }
    const [family, ...sourceParts] = value.split("=");
    if (!family) {
      throw new ClickClickError("INVALID_INPUT", "Font entries must include a family before =.");
    }
    return { family, source: sourceParts.join("=") };
  });
}

function parseLayerBehavior(value: unknown): "warn" | "error" | "ignore" | undefined {
  if (value === undefined) return undefined;
  if (value === "warn" || value === "error" || value === "ignore") return value;
  throw new ClickClickError("INVALID_INPUT", "Layer behavior must be warn, error, or ignore.");
}

function reportError(error: unknown) {
  if (error instanceof ClickClickError) {
    console.error(`${error.code}: ${error.message}`);
    return;
  }
  console.error(error instanceof Error ? error.message : String(error));
}
