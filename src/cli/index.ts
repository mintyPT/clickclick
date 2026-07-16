#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import { ClickClickError, presets, renderImage } from "../index.js";
import { presetMetadata } from "../presets/index.js";
import type { ImageFormat, RenderImageInput, WaitUntil } from "../types.js";

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

const preset = program.command("preset").description("Render built-in presets.");

preset.command("list").description("List built-in presets").action(() => {
  for (const item of presetMetadata) {
    console.log(`${item.name}\t${item.description}`);
  }
});

preset
  .command("solid")
  .requiredOption("--title <text>", "Title text")
  .option("--subtitle <text>", "Subtitle text")
  .option("--background, --background-color <color>", "Background color")
  .option("--text-color <color>", "Text color")
  .option("--width <px>", "Image width", parseInteger)
  .option("--height <px>", "Image height", parseInteger)
  .option("--align <align>", "Text alignment: left or center")
  .option("--out, --output <file>", "Output image path")
  .option("--format <format>", "Output format: png or jpeg")
  .option("--quality <number>", "JPEG quality from 0 to 100", parseInteger)
  .option("--strict", "Exit non-zero when renderer warnings are produced")
  .action(async (options) => {
    await runRender({
      ...presets.solid({
        title: options.title,
        subtitle: options.subtitle,
        backgroundColor: options.background,
        textColor: options.textColor,
        width: options.width,
        height: options.height,
        align: options.align,
      }),
      output: parseOutputOptions(options),
    }, Boolean(options.strict));
  });

program.parseAsync().catch((error: unknown) => {
  reportError(error);
  process.exitCode = 1;
});

async function runRender(input: RenderImageInput, strict: boolean) {
  const result = await renderImage(input);
  for (const warning of result.warnings) {
    console.error(`warning ${warning.code}: ${warning.selector} ${warning.message}`);
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

function parseOutputOptions(options: Record<string, unknown>) {
  return {
    path: typeof options.output === "string" ? options.output : undefined,
    format: parseFormat(options.format),
    quality: typeof options.quality === "number" ? options.quality : undefined,
  };
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
