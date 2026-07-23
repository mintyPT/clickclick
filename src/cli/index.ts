#!/usr/bin/env node
import { mkdir, readFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import { ClickClickError, checkImageQuality, checkRenderQuality, clearCache, createContactSheet, dataRowToLayerModifications, generateTemplateBatch, listConfigTemplates, loadBrandKit, renderImage, renderRecipe, renderTemplate, renderTemplateSet, screenshotUrl } from "../index.js";
import type { BatchDataRow } from "../index.js";
import type { BrandKit, LayerModification, QualityResult, QualitySafeArea, RenderCacheOptions, RenderImageInput, RenderImageResult, RenderWarning, TemplateInput } from "../types.js";
import { collectOption, parseCacheOptions, parseInteger, parseNumber, parseOutputOptions, parseRenderOptions, parseSizeOptions } from "./options.js";
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
  .option("--brand <file>", "Brand kit JSON file")
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
      brand: await parseBrandKitOption(options),
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
  .command("generate")
  .argument("<html-file>", "HTML template file to render for every data row")
  .requiredOption("--data <file>", "JSON, CSV, or YAML data file")
  .option("--data-format <format>", "Data format: json, csv, or yaml")
  .option("--css <file>", "Optional CSS file to inject")
  .option("--modify-json <json>", "Base layer modifications as JSON")
  .option("--modify-file <file>", "Base layer modifications JSON file")
  .option("--brand <file>", "Brand kit JSON file")
  .option("--font <spec...>", "Font registry entry: Family=path-or-url")
  .option("--layer-field <field>", "Data field to apply as a template layer. Repeat to select multiple fields.", collectOption, [])
  .option("--on-missing-layer <mode>", "Missing layer behavior: warn, error, or ignore")
  .option("--on-duplicate-layer <mode>", "Duplicate layer behavior: warn, error, or ignore")
  .requiredOption("--out-dir <dir>", "Directory for generated images")
  .option("--out-pattern <pattern>", "Output filename pattern with {{field}} and {{size}} placeholders")
  .option("--size <size>", "Named size or WIDTHxHEIGHT. Repeat for multiple outputs.", collectOption, [])
  .option("--sizes <sizes>", "Comma-separated named sizes or WIDTHxHEIGHT values")
  .option("--width <px>", "Viewport width when --size/--sizes are not used", parseInteger)
  .option("--height <px>", "Viewport height when --size/--sizes are not used", parseInteger)
  .option("--format <format>", "Output format: png or jpeg")
  .option("--quality <number>", "JPEG quality from 0 to 100", parseInteger)
  .option("--selector <selector>", "Screenshot a specific element")
  .option("--wait-until <event>", "Playwright wait event")
  .option("--delay <ms>", "Delay before screenshot", parseInteger)
  .option("--strict", "Exit non-zero when renderer warnings are produced")
  .action(async (htmlFile: string, options) => {
    const htmlPath = resolve(htmlFile);
    const cssPath = options.css ? resolve(options.css) : undefined;
    const sizes = parseSizeOptions(options);
    const outputPattern = typeof options.outPattern === "string"
      ? options.outPattern
      : sizes.length > 0
        ? "{{slug}}-{{size}}.png"
        : "{{slug}}.png";
    const layerFields = stringArrayOption(options.layerField);
    const results = await generateTemplateBatch({
      template: {
        htmlPath,
        cssPath,
        brand: await parseBrandKitOption(options),
        modifications: await parseModifications(options),
        fonts: parseFonts(options.font),
        onMissingLayer: parseLayerBehavior(options.onMissingLayer),
        onDuplicateLayer: parseLayerBehavior(options.onDuplicateLayer),
        viewport: { width: options.width, height: options.height },
        output: parseOutputOptions(options),
        render: parseRenderOptions(options),
      },
      rows: await parseDataRows(resolve(options.data), options.dataFormat),
      outputDir: resolve(options.outDir),
      outputPattern,
      sizes,
      rowToModifications: layerFields.length > 0 ? (row) => dataRowToLayerModifications(row, layerFields) : undefined,
    });
    for (const result of results) {
      reportResult(result, Boolean(options.strict), false);
      if (result.path) console.log(result.path);
    }
  });

program
  .command("contact-sheet")
  .argument("<images...>", "PNG or JPEG image paths to arrange into a contact sheet")
  .requiredOption("--out, --output <file>", "Output image path")
  .option("--columns <count>", "Number of grid columns", parseInteger)
  .option("--spacing <px>", "Spacing between tiles", parseInteger)
  .option("--padding <px>", "Outer padding", parseInteger)
  .option("--label <label>", "Optional image label. Repeat once per image.", collectOption, [])
  .option("--background <color>", "Sheet background color")
  .option("--text-color <color>", "Caption text color")
  .option("--tile-width <px>", "Force tile width", parseInteger)
  .option("--tile-height <px>", "Force tile height", parseInteger)
  .option("--format <format>", "Output format: png or jpeg")
  .option("--quality <number>", "JPEG quality from 0 to 100", parseInteger)
  .action(async (images: string[], options) => {
    const labels = stringArrayOption(options.label);
    const result = await createContactSheet({
      images: images.map((path, index) => ({ path, label: labels[index] })),
      output: parseOutputOptions(options),
      columns: options.columns,
      spacing: options.spacing,
      padding: options.padding,
      background: typeof options.background === "string" ? options.background : undefined,
      textColor: typeof options.textColor === "string" ? options.textColor : undefined,
      tileWidth: options.tileWidth,
      tileHeight: options.tileHeight,
    });
    reportResult(result, false, false);
    if (result.path) console.log(result.path);
  });

program
  .command("cache")
  .description("Manage the local render cache.")
  .command("clear")
  .option("--cache-dir <dir>", "Cache directory", ".clickclick-cache")
  .action(async (options) => {
    await clearCache({ dir: typeof options.cacheDir === "string" ? options.cacheDir : undefined });
  });

const quality = program.command("quality").description("Run CI-friendly image quality gates.");

quality
  .command("image")
  .argument("<actual-image>", "Rendered PNG image to check")
  .option("--baseline <file>", "Baseline PNG for visual diffing")
  .option("--max-diff-ratio <ratio>", "Allowed changed-pixel ratio from 0 to 1", parseNumber)
  .option("--max-pixel-delta <number>", "Per-channel pixel delta ignored by visual diffing", parseInteger)
  .option("--strict", "Exit non-zero when quality diagnostics are produced")
  .action(async (actualImage: string, options) => {
    const result = await checkImageQuality({
      actualPath: resolve(actualImage),
      baselinePath: typeof options.baseline === "string" ? resolve(options.baseline) : undefined,
      maxDiffRatio: options.maxDiffRatio,
      maxPixelDelta: options.maxPixelDelta,
    });
    reportQualityResult(result, Boolean(options.strict));
  });

quality
  .command("render")
  .argument("<html-file>", "HTML file to render and inspect")
  .option("--css <file>", "Optional CSS file to inject")
  .option("--baseline <file>", "Baseline PNG for visual diffing")
  .option("--max-diff-ratio <ratio>", "Allowed changed-pixel ratio from 0 to 1", parseNumber)
  .option("--max-pixel-delta <number>", "Per-channel pixel delta ignored by visual diffing", parseInteger)
  .option("--text-selector <selector>", "Selector for text quality checks", "body *")
  .option("--min-contrast-ratio <ratio>", "Minimum contrast ratio for text checks", parseNumber)
  .option("--safe-area <insets>", "Safe area insets as all, vertical,horizontal, or top,right,bottom,left pixels")
  .option("--deterministic", "Render twice and fail when pixels differ")
  .option("--width <px>", "Viewport width", parseInteger)
  .option("--height <px>", "Viewport height", parseInteger)
  .option("--selector <selector>", "Screenshot a specific element for pixel checks")
  .option("--wait-until <event>", "Playwright wait event")
  .option("--delay <ms>", "Delay before screenshot", parseInteger)
  .option("--omit-background", "Allow transparent PNG backgrounds")
  .option("--strict", "Exit non-zero when quality diagnostics are produced")
  .action(async (htmlFile: string, options) => {
    const htmlPath = resolve(htmlFile);
    const cssPath = options.css ? resolve(options.css) : undefined;
    const result = await checkRenderQuality({
      document: {
        html: await readFileChecked(htmlPath, "HTML"),
        css: cssPath ? await readFileChecked(cssPath, "CSS") : undefined,
        baseUrl: pathToFileURL(dirname(htmlPath)).href + "/",
      },
      viewport: {
        width: options.width,
        height: options.height,
      },
      output: {
        omitBackground: Boolean(options.omitBackground),
      },
      render: parseRenderOptions(options),
      baselinePath: typeof options.baseline === "string" ? resolve(options.baseline) : undefined,
      maxDiffRatio: options.maxDiffRatio,
      maxPixelDelta: options.maxPixelDelta,
      safeArea: parseSafeArea(options.safeArea),
      textSelector: typeof options.textSelector === "string" ? options.textSelector : undefined,
      minContrastRatio: options.minContrastRatio,
      deterministic: Boolean(options.deterministic),
    });
    reportQualityResult(result, Boolean(options.strict));
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
  .option("--brand <file>", "Brand kit JSON file")
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
      brand: await parseBrandKitOption(options),
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
  .option("--brand <file>", "Brand kit JSON file")
  .option("--cache", "Reuse cached output for identical deterministic input")
  .option("--cache-dir <dir>", "Cache directory", ".clickclick-cache")
  .option("--cache-info", "Print cache hit/miss information")
  .option("--strict", "Exit non-zero when renderer warnings are produced")
  .action(async (configFile: string, name: string, options) => {
    const outDir = typeof options.outDir === "string" ? resolve(options.outDir) : undefined;
    if (outDir) await mkdir(outDir, { recursive: true });
    const results = await renderTemplateSet(resolve(configFile), name, outDir, {
      cache: parseCacheOptions(options),
      brand: await parseBrandKitOption(options),
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

function stringArrayOption(value: unknown): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
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

function reportQualityResult(result: QualityResult, strict: boolean) {
  console.log(JSON.stringify(result, null, 2));
  if (strict && !result.passed) {
    process.exitCode = 1;
  }
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

async function parseBrandKitOption(options: Record<string, unknown>): Promise<BrandKit | undefined> {
  return typeof options.brand === "string" ? loadBrandKit(resolve(options.brand)) : undefined;
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

async function parseDataRows(path: string, requestedFormat: unknown): Promise<BatchDataRow[]> {
  const raw = await readFileChecked(path, "Data");
  const format = parseDataFormat(requestedFormat, path);
  if (format === "json") return normalizeDataRows(parseJsonData(raw), "JSON data");
  if (format === "csv") return parseCsvData(raw);
  return parseYamlData(raw);
}

function parseDataFormat(value: unknown, path: string): "json" | "csv" | "yaml" {
  if (value === "json" || value === "csv" || value === "yaml" || value === "yml") {
    return value === "yml" ? "yaml" : value;
  }
  if (value !== undefined) {
    throw new ClickClickError("INVALID_INPUT", "Data format must be json, csv, or yaml.");
  }
  if (/\.json$/i.test(path)) return "json";
  if (/\.csv$/i.test(path)) return "csv";
  if (/\.ya?ml$/i.test(path)) return "yaml";
  throw new ClickClickError("INVALID_INPUT", "Data format could not be inferred. Use --data-format json, csv, or yaml.");
}

function parseJsonData(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new ClickClickError("INVALID_INPUT", "Data file is not valid JSON.", error);
  }
}

function normalizeDataRows(value: unknown, label: string): BatchDataRow[] {
  const rows = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { rows?: unknown }).rows)
      ? (value as { rows: unknown[] }).rows
      : [value];
  if (rows.length === 0) {
    throw new ClickClickError("INVALID_INPUT", `${label} must contain at least one row.`);
  }
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new ClickClickError("INVALID_INPUT", `${label} rows must be objects.`);
    }
  }
  return rows as BatchDataRow[];
}

function parseCsvData(raw: string): BatchDataRow[] {
  const records = parseCsvRecords(raw).filter((record) => record.some((cell) => cell.trim() !== ""));
  if (records.length < 2) {
    throw new ClickClickError("INVALID_INPUT", "CSV data must include a header row and at least one data row.");
  }
  const [headers = [], ...rows] = records;
  if (headers.some((header) => header.trim() === "")) {
    throw new ClickClickError("INVALID_INPUT", "CSV headers must not be empty.");
  }
  return rows.map((row, index) => {
    if (row.length !== headers.length) {
      throw new ClickClickError("INVALID_INPUT", `CSV row ${index + 2} has ${row.length} fields, expected ${headers.length}.`);
    }
    return Object.fromEntries(headers.map((header, column) => [header.trim(), parseScalar((row[column] ?? "").trim())]));
  });
}

function parseCsvRecords(raw: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    const next = raw[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n") {
      record.push(field.replace(/\r$/, ""));
      records.push(record);
      record = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (quoted) {
    throw new ClickClickError("INVALID_INPUT", "CSV data contains an unterminated quoted field.");
  }
  if (field !== "" || record.length > 0) {
    record.push(field.replace(/\r$/, ""));
    records.push(record);
  }
  return records;
}

function parseYamlData(raw: string): BatchDataRow[] {
  const lines = raw.split(/\r?\n/).map((line) => line.replace(/\s+#.*$/, "")).filter((line) => line.trim() !== "");
  if (lines.length === 0) {
    throw new ClickClickError("INVALID_INPUT", "YAML data must contain at least one row.");
  }

  if (lines[0]?.trimStart().startsWith("- ") === true) {
    const rows: BatchDataRow[] = [];
    let current: BatchDataRow | undefined;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ")) {
        current = {};
        rows.push(current);
        const inline = trimmed.slice(2).trim();
        if (inline) assignYamlPair(current, inline);
      } else if (current) {
        assignYamlPair(current, trimmed);
      } else {
        throw new ClickClickError("INVALID_INPUT", "YAML list rows must start with '- '.");
      }
    }
    return rows;
  }

  const row: BatchDataRow = {};
  for (const line of lines) assignYamlPair(row, line.trim());
  return [row];
}

function assignYamlPair(row: BatchDataRow, line: string) {
  const match = /^([A-Za-z0-9_-]+):(?:\s*(.*))?$/.exec(line);
  if (!match) {
    throw new ClickClickError("INVALID_INPUT", `YAML data supports simple key: value rows only. Could not parse: ${line}`);
  }
  const key = match[1];
  if (!key) {
    throw new ClickClickError("INVALID_INPUT", `YAML data supports simple key: value rows only. Could not parse: ${line}`);
  }
  row[key] = parseScalar(match[2] ?? "");
}

function parseScalar(value: string): string | number | boolean | null {
  const unquoted = value.replace(/^(['"])(.*)\1$/, "$2");
  if (unquoted === "") return "";
  if (unquoted === "null") return null;
  if (unquoted === "true") return true;
  if (unquoted === "false") return false;
  if (/^-?\d+(?:\.\d+)?$/.test(unquoted)) return Number(unquoted);
  return unquoted;
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

function parseSafeArea(value: unknown): QualitySafeArea | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length === 0) {
    throw new ClickClickError("INVALID_INPUT", "Safe area must be a comma-separated pixel inset list.");
  }
  const parts = value.split(",").map((part) => {
    const parsed = Number(part.trim());
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new ClickClickError("INVALID_INPUT", "Safe area insets must be non-negative numbers.");
    }
    return parsed;
  });
  if (parts.length === 1) return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
  if (parts.length === 2) return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
  if (parts.length === 4) return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
  throw new ClickClickError("INVALID_INPUT", "Safe area must use one, two, or four comma-separated values.");
}

function reportError(error: unknown) {
  if (error instanceof ClickClickError) {
    console.error(`${error.code}: ${error.message}`);
    return;
  }
  console.error(error instanceof Error ? error.message : String(error));
}
