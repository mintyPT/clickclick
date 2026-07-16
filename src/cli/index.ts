#!/usr/bin/env node
import { mkdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import { ClickClickError, listConfigTemplates, renderImage, renderRecipe, renderTemplate, renderTemplateSet, screenshotUrl } from "../index.js";
import type { ImageFormat, LayerModification, RenderImageInput, RenderOutputOptions, RenderWarning, TemplateInput, WaitUntil } from "../types.js";
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
  .option("--width <px>", "Viewport width", parseInteger)
  .option("--height <px>", "Viewport height", parseInteger)
  .option("--format <format>", "Output format: png or jpeg")
  .option("--quality <number>", "JPEG quality from 0 to 100", parseInteger)
  .option("--omit-background", "Allow transparent PNG backgrounds")
  .option("--selector <selector>", "Screenshot a specific element")
  .option("--wait-until <event>", "Playwright wait event")
  .option("--delay <ms>", "Delay before screenshot", parseInteger)
  .option("--strict", "Exit non-zero when renderer warnings are produced")
  .action(async (htmlFile: string, options) => {
    const htmlPath = resolve(htmlFile);
    const cssPath = options.css ? resolve(options.css) : undefined;
    const html = await readFileChecked(htmlPath, "HTML");
    const css = cssPath ? await readFileChecked(cssPath, "CSS") : undefined;
    await runRender({
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
    }, Boolean(options.strict));
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
  .option("--width <px>", "Viewport width", parseInteger)
  .option("--height <px>", "Viewport height", parseInteger)
  .option("--format <format>", "Output format: png or jpeg")
  .option("--quality <number>", "JPEG quality from 0 to 100", parseInteger)
  .option("--selector <selector>", "Screenshot a specific element")
  .option("--wait-until <event>", "Playwright wait event")
  .option("--delay <ms>", "Delay before screenshot", parseInteger)
  .option("--strict", "Exit non-zero when renderer warnings are produced")
  .action(async (htmlFile: string, options) => {
    const htmlPath = resolve(htmlFile);
    const cssPath = options.css ? resolve(options.css) : undefined;
    await runTemplate({
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
    }, Boolean(options.strict));
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
  .option("--width <px>", "Viewport width", parseInteger)
  .option("--height <px>", "Viewport height", parseInteger)
  .option("--format <format>", "Output format: png or jpeg")
  .option("--quality <number>", "JPEG quality from 0 to 100", parseInteger)
  .option("--strict", "Exit non-zero when renderer warnings are produced")
  .action(async (configFile: string, name: string, options) => {
    const result = await renderRecipe(resolve(configFile), name, {
      modifications: await parseModifications(options),
      debugDir: typeof options.debugDir === "string" ? options.debugDir : undefined,
      viewport: { width: options.width, height: options.height },
      output: parseOutputOptions(options),
    });
    reportWarnings(result, Boolean(options.strict));
  });

config
  .command("set")
  .argument("<config-file>", "ClickClick config JSON file")
  .argument("<name>", "Template set name")
  .option("--out-dir <dir>", "Directory for generated images")
  .option("--strict", "Exit non-zero when renderer warnings are produced")
  .action(async (configFile: string, name: string, options) => {
    const outDir = typeof options.outDir === "string" ? resolve(options.outDir) : undefined;
    if (outDir) await mkdir(outDir, { recursive: true });
    const results = await renderTemplateSet(resolve(configFile), name, outDir);
    for (const result of results) {
      reportWarnings(result, Boolean(options.strict));
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
  parseOutputOptions,
  parseInteger,
  parseNumber,
});

program.parseAsync().catch((error: unknown) => {
  reportError(error);
  process.exitCode = 1;
});

async function runRender(input: RenderImageInput, strict: boolean) {
  const result = await renderImage(input);
  reportWarnings(result, strict);
}

async function runTemplate(input: TemplateInput, strict: boolean) {
  const result = await renderTemplate(input);
  reportWarnings(result, strict);
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

async function readFileChecked(path: string, label: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch {
    throw new ClickClickError("INVALID_INPUT", `${label} file could not be read: ${path}`);
  }
}

function parseInteger(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Expected an integer, received ${value}`);
  }
  return parsed;
}

function parseNumber(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected a number, received ${value}`);
  }
  return parsed;
}

function parseOutputOptions(options: Record<string, unknown>): RenderOutputOptions {
  return {
    path: typeof options.output === "string" ? options.output : undefined,
    format: parseFormat(options.format),
    quality: typeof options.quality === "number" ? options.quality : undefined,
    omitBackground: Boolean(options.omitBackground),
  };
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

function parseRenderOptions(options: Record<string, unknown>) {
  return {
    selector: typeof options.selector === "string" ? options.selector : undefined,
    waitUntil: parseWaitUntil(options.waitUntil),
    delayMs: typeof options.delay === "number" ? options.delay : undefined,
  };
}

function parseFormat(value: unknown): ImageFormat | undefined {
  if (value === undefined) return undefined;
  if (value === "png" || value === "jpeg") return value;
  throw new ClickClickError("INVALID_INPUT", "Format must be png or jpeg.");
}

function parseWaitUntil(value: unknown): WaitUntil | undefined {
  if (value === undefined) return undefined;
  if (value === "load" || value === "domcontentloaded" || value === "networkidle" || value === "commit") return value;
  throw new ClickClickError("INVALID_INPUT", "wait-until must be load, domcontentloaded, networkidle, or commit.");
}

function reportError(error: unknown) {
  if (error instanceof ClickClickError) {
    console.error(`${error.code}: ${error.message}`);
    return;
  }
  console.error(error instanceof Error ? error.message : String(error));
}
