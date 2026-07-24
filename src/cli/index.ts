#!/usr/bin/env node
import { access } from "node:fs/promises";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Command } from "commander";
import { ClickClickError, barChart, checkImageQuality, checkRenderQuality, clearCache, collage, contactSheet, createContactSheet, createRenderer, dataRowToLayerModifications, generateTemplateBatch, imageGrid, interpolateOutputPattern, listConfigTemplates, loadBrandKit, presets, qrCode, renderImage, renderRecipe, renderTemplate, renderTemplateSet, screenshotUrl } from "../index.js";
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
  .command("init")
  .description("Create a starter ClickClick project")
  .option("--dir <dir>", "Target project directory", ".")
  .option("--force", "Overwrite existing starter files")
  .action(async (options) => {
    const targetDir = resolve(typeof options.dir === "string" ? options.dir : ".");
    await initProject(targetDir, Boolean(options.force));
    console.log(`Created ClickClick starter project in ${targetDir}`);
  });

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

const batch = program.command("batch").description("Render preset or template images from structured data.");

batch
  .command("preset")
  .argument("<preset-name>", "Built-in preset name")
  .requiredOption("--data <file>", "JSON, CSV, or YAML data file")
  .option("--data-format <format>", "Data format: json, csv, or yaml")
  .requiredOption("--out-dir <dir>", "Directory for generated images")
  .option("--out-pattern <pattern>", "Output filename pattern with {{field}} and {{size}} placeholders")
  .option("--map <target=field>", "Map a preset option to a data field. Repeat for multiple fields.", collectOption, [])
  .option("--size <size>", "Named size or WIDTHxHEIGHT. Repeat for multiple outputs.", collectOption, [])
  .option("--sizes <sizes>", "Comma-separated named sizes or WIDTHxHEIGHT values")
  .option("--width <px>", "Viewport width when --size/--sizes are not used", parseInteger)
  .option("--height <px>", "Viewport height when --size/--sizes are not used", parseInteger)
  .option("--format <format>", "Output format: png or jpeg")
  .option("--quality <number>", "JPEG quality from 0 to 100", parseInteger)
  .option("--json", "Print a JSON summary")
  .option("--strict", "Exit non-zero when any row fails or renderer warnings are produced")
  .action(async (presetName: string, options) => {
    const renderer = await createRenderer();
    try {
      const rows = await parseDataRows(resolve(options.data), options.dataFormat);
      const summary = await runBatchPreset(presetName, rows, options, renderer);
      reportBatchSummary(summary, Boolean(options.json), Boolean(options.strict));
    } finally {
      await renderer.close();
    }
  });

batch
  .command("template")
  .argument("<html-file>", "HTML template file to render for every data row")
  .requiredOption("--data <file>", "JSON, CSV, or YAML data file")
  .option("--data-format <format>", "Data format: json, csv, or yaml")
  .option("--css <file>", "Optional CSS file to inject")
  .option("--map <layer=field>", "Map a template layer name to a data field. Repeat for multiple fields.", collectOption, [])
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
  .option("--json", "Print a JSON summary")
  .option("--strict", "Exit non-zero when any row fails or renderer warnings are produced")
  .action(async (htmlFile: string, options) => {
    const renderer = await createRenderer();
    try {
      const htmlPath = resolve(htmlFile);
      const cssPath = options.css ? resolve(options.css) : undefined;
      const rows = await parseDataRows(resolve(options.data), options.dataFormat);
      const summary = await runBatchTemplate({
        htmlPath,
        cssPath,
        rows,
        options,
        renderer,
      });
      reportBatchSummary(summary, Boolean(options.json), Boolean(options.strict));
    } finally {
      await renderer.close();
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

const composition = program.command("composition").description("Render deterministic composition utilities.");

composition
  .command("contact-sheet")
  .description("Render a captioned image grid for gallery review")
  .requiredOption("--image <file-or-url>", "Image source. Repeat for multiple images.", collectOption, [])
  .option("--caption <text>", "Caption for the matching --image. Repeat to label multiple images.", collectOption, [])
  .option("--columns <count>", "Grid column count", parseInteger)
  .option("--gap <px>", "Gap between tiles", parseInteger)
  .option("--padding <px>", "Outer padding", parseInteger)
  .option("--background <color>", "Canvas background color")
  .option("--text-color <color>", "Caption text color")
  .option("--out, --output <file>", "Output image path")
  .option("--width <px>", "Output width", parseInteger)
  .option("--format <format>", "Output format: png or jpeg")
  .option("--quality <number>", "JPEG quality from 0 to 100", parseInteger)
  .option("--cache", "Reuse cached output for identical deterministic input")
  .option("--cache-dir <dir>", "Cache directory", ".clickclick-cache")
  .option("--cache-info", "Print cache hit/miss information")
  .option("--strict", "Exit non-zero when renderer warnings are produced")
  .action(async (options) => {
    await runRender({
      ...contactSheet({
        images: compositionImages(options),
        columns: options.columns,
        width: options.width,
        gap: options.gap,
        padding: options.padding,
        background: stringOption(options.background),
        textColor: stringOption(options.textColor),
      }),
      output: parseOutputOptions(options),
    }, Boolean(options.strict), parseCacheOptions(options));
  });

composition
  .command("grid")
  .description("Render a captioned image grid")
  .requiredOption("--image <file-or-url>", "Image source. Repeat for multiple images.", collectOption, [])
  .option("--caption <text>", "Caption for the matching --image. Repeat to label multiple images.", collectOption, [])
  .option("--columns <count>", "Grid column count", parseInteger)
  .option("--gap <px>", "Gap between tiles", parseInteger)
  .option("--padding <px>", "Outer padding", parseInteger)
  .option("--background <color>", "Canvas background color")
  .option("--text-color <color>", "Caption text color")
  .option("--out, --output <file>", "Output image path")
  .option("--width <px>", "Output width", parseInteger)
  .option("--format <format>", "Output format: png or jpeg")
  .option("--quality <number>", "JPEG quality from 0 to 100", parseInteger)
  .option("--cache", "Reuse cached output for identical deterministic input")
  .option("--cache-dir <dir>", "Cache directory", ".clickclick-cache")
  .option("--cache-info", "Print cache hit/miss information")
  .option("--strict", "Exit non-zero when renderer warnings are produced")
  .action(async (options) => {
    await runRender({
      ...imageGrid({
        images: compositionImages(options),
        columns: options.columns,
        width: options.width,
        gap: options.gap,
        padding: options.padding,
        background: stringOption(options.background),
        textColor: stringOption(options.textColor),
      }),
      output: parseOutputOptions(options),
    }, Boolean(options.strict), parseCacheOptions(options));
  });

composition
  .command("collage")
  .description("Render a compact image collage")
  .requiredOption("--image <file-or-url>", "Image source. Repeat for multiple images.", collectOption, [])
  .option("--caption <text>", "Caption for the matching --image. Repeat to label multiple images.", collectOption, [])
  .option("--columns <count>", "Grid column count", parseInteger)
  .option("--gap <px>", "Gap between tiles", parseInteger)
  .option("--padding <px>", "Outer padding", parseInteger)
  .option("--background <color>", "Canvas background color")
  .option("--text-color <color>", "Caption text color")
  .option("--out, --output <file>", "Output image path")
  .option("--width <px>", "Output width", parseInteger)
  .option("--format <format>", "Output format: png or jpeg")
  .option("--quality <number>", "JPEG quality from 0 to 100", parseInteger)
  .option("--cache", "Reuse cached output for identical deterministic input")
  .option("--cache-dir <dir>", "Cache directory", ".clickclick-cache")
  .option("--cache-info", "Print cache hit/miss information")
  .option("--strict", "Exit non-zero when renderer warnings are produced")
  .action(async (options) => {
    await runRender({
      ...collage({
        images: compositionImages(options),
        columns: options.columns,
        width: options.width,
        gap: options.gap,
        padding: options.padding,
        background: stringOption(options.background),
        textColor: stringOption(options.textColor),
      }),
      output: parseOutputOptions(options),
    }, Boolean(options.strict), parseCacheOptions(options));
  });

composition
  .command("qr")
  .description("Render a deterministic QR code for a URL or short text")
  .argument("<text>", "URL or short text to encode")
  .option("--caption <text>", "Caption below the QR code")
  .option("--background <color>", "Canvas and light module color")
  .option("--foreground <color>", "Dark module color")
  .option("--text-color <color>", "Caption text color")
  .option("--out, --output <file>", "Output image path")
  .option("--width <px>", "Output width", parseInteger)
  .option("--format <format>", "Output format: png or jpeg")
  .option("--quality <number>", "JPEG quality from 0 to 100", parseInteger)
  .option("--cache", "Reuse cached output for identical deterministic input")
  .option("--cache-dir <dir>", "Cache directory", ".clickclick-cache")
  .option("--cache-info", "Print cache hit/miss information")
  .option("--strict", "Exit non-zero when renderer warnings are produced")
  .action(async (text: string, options) => {
    await runRender({
      ...qrCode({
        text,
        width: options.width,
        caption: stringOption(options.caption),
        background: stringOption(options.background),
        foreground: stringOption(options.foreground),
        textColor: stringOption(options.textColor),
      }),
      output: parseOutputOptions(options),
    }, Boolean(options.strict), parseCacheOptions(options));
  });

composition
  .command("bar-chart")
  .description("Render a simple static bar chart from JSON data")
  .requiredOption("--data <json>", "JSON array, object with rows, or path to a JSON file")
  .option("--title <text>", "Chart title")
  .option("--background <color>", "Canvas background color")
  .option("--bar-color <color>", "Bar fill color")
  .option("--text-color <color>", "Text color")
  .option("--out, --output <file>", "Output image path")
  .option("--width <px>", "Output width", parseInteger)
  .option("--height <px>", "Output height", parseInteger)
  .option("--format <format>", "Output format: png or jpeg")
  .option("--quality <number>", "JPEG quality from 0 to 100", parseInteger)
  .option("--cache", "Reuse cached output for identical deterministic input")
  .option("--cache-dir <dir>", "Cache directory", ".clickclick-cache")
  .option("--cache-info", "Print cache hit/miss information")
  .option("--strict", "Exit non-zero when renderer warnings are produced")
  .action(async (options) => {
    await runRender({
      ...barChart({
        data: await parseChartData(options.data),
        title: stringOption(options.title),
        width: options.width,
        height: options.height,
        background: stringOption(options.background),
        barColor: stringOption(options.barColor),
        textColor: stringOption(options.textColor),
      }),
      output: parseOutputOptions(options),
    }, Boolean(options.strict), parseCacheOptions(options));
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

interface BatchItemSummary {
  index: number;
  path?: string;
  warnings: RenderWarning[];
  error?: string;
}

interface BatchSummary {
  ok: boolean;
  outputs: BatchItemSummary[];
  errors: BatchItemSummary[];
}

async function runBatchPreset(presetName: string, rows: BatchDataRow[], options: Record<string, unknown>, renderer: Awaited<ReturnType<typeof createRenderer>>): Promise<BatchSummary> {
  const preset = presetByName(presetName);
  const outputDir = resolveRequiredDir(options.outDir);
  const sizes = batchSizes(options);
  const pattern = typeof options.outPattern === "string" ? options.outPattern : sizes.length > 1 ? "{{slug}}-{{size}}.png" : "{{slug}}.png";
  const maps = parseFieldMappings(options.map);
  await mkdir(outputDir, { recursive: true });

  const outputs: BatchItemSummary[] = [];
  const errors: BatchItemSummary[] = [];
  for (const [index, row] of rows.entries()) {
    for (const size of sizes) {
      try {
        const presetOptions = rowToOptions(row, maps);
        const result = await renderer.render({
          ...preset(presetOptions),
          viewport: { width: size.width ?? numberOption(presetOptions.width), height: size.height ?? numberOption(presetOptions.height) },
          output: { ...parseOutputOptions(options), path: join(outputDir, interpolateOutputPattern(pattern, row, index, size)) },
        });
        outputs.push({ index, path: result.path, warnings: result.warnings });
      } catch (error) {
        errors.push({ index, warnings: [], error: errorMessage(error) });
      }
    }
  }
  return { ok: errors.length === 0, outputs, errors };
}

async function runBatchTemplate(input: { htmlPath: string; cssPath?: string; rows: BatchDataRow[]; options: Record<string, unknown>; renderer: Awaited<ReturnType<typeof createRenderer>> }): Promise<BatchSummary> {
  const outputDir = resolveRequiredDir(input.options.outDir);
  const sizes = batchSizes(input.options);
  const pattern = typeof input.options.outPattern === "string" ? input.options.outPattern : sizes.length > 1 ? "{{slug}}-{{size}}.png" : "{{slug}}.png";
  const maps = parseFieldMappings(input.options.map);
  await mkdir(outputDir, { recursive: true });

  const outputs: BatchItemSummary[] = [];
  const errors: BatchItemSummary[] = [];
  for (const [index, row] of input.rows.entries()) {
    for (const size of sizes) {
      try {
        const result = await renderTemplate({
          htmlPath: input.htmlPath,
          cssPath: input.cssPath,
          modifications: mappedRowToLayerModifications(row, maps),
          viewport: { width: size.width ?? numberValue(row.width) ?? numberValue(input.options.width), height: size.height ?? numberValue(row.height) ?? numberValue(input.options.height) },
          output: { ...parseOutputOptions(input.options), path: join(outputDir, interpolateOutputPattern(pattern, row, index, size)) },
          render: parseRenderOptions(input.options),
        }, { renderer: input.renderer });
        outputs.push({ index, path: result.path, warnings: result.warnings });
      } catch (error) {
        errors.push({ index, warnings: [], error: errorMessage(error) });
      }
    }
  }
  return { ok: errors.length === 0, outputs, errors };
}

function reportBatchSummary(summary: BatchSummary, asJson: boolean, strict: boolean) {
  if (asJson) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    for (const output of summary.outputs) {
      if (output.path) console.log(output.path);
      for (const warning of output.warnings) console.error(`warning ${warning.code}: ${warning.message}`);
    }
    for (const error of summary.errors) console.error(`row ${error.index + 1}: ${error.error}`);
  }
  if (strict && (!summary.ok || summary.outputs.some((output) => output.warnings.length > 0))) {
    process.exitCode = 1;
  }
}

function batchSizes(options: Record<string, unknown>) {
  const sizes = parseSizeOptions(options);
  return sizes.length > 0 ? sizes : [{ label: "default", width: numberValue(options.width), height: numberValue(options.height) }];
}

function resolveRequiredDir(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new ClickClickError("INVALID_INPUT", "--out-dir is required.");
  }
  return resolve(value);
}

function parseFieldMappings(value: unknown): Map<string, string> {
  const result = new Map<string, string>();
  for (const item of stringArrayOption(value)) {
    const [target, source] = item.split("=");
    if (!target || !source) {
      throw new ClickClickError("INVALID_INPUT", "--map entries must use target=field.");
    }
    result.set(target, source);
  }
  return result;
}

function rowToOptions(row: BatchDataRow, maps: Map<string, string>): Record<string, unknown> {
  if (maps.size === 0) return { ...row };
  return Object.fromEntries([...maps.entries()].map(([target, source]) => [target, row[source]]));
}

function mappedRowToLayerModifications(row: BatchDataRow, maps: Map<string, string>) {
  if (maps.size === 0) return dataRowToLayerModifications(row);
  return [...maps.entries()].map(([layer, source]) => {
    const value = row[source];
    if (value === undefined || value === null || typeof value === "object") {
      throw new ClickClickError("INVALID_INPUT", `Data row is missing scalar field for layer ${layer}: ${source}`);
    }
    return { name: layer, text: String(value) };
  });
}

function presetByName(name: string): (options: Record<string, unknown>) => RenderImageInput {
  const preset = (presets as Record<string, unknown>)[name];
  if (typeof preset !== "function") {
    throw new ClickClickError("INVALID_INPUT", `Unknown preset: ${name}`);
  }
  return preset as (options: Record<string, unknown>) => RenderImageInput;
}

function numberOption(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function compositionImages(options: Record<string, unknown>) {
  const images = stringArrayOption(options.image);
  const captions = stringArrayOption(options.caption);
  return images.map((src, index) => ({ src, caption: captions[index] }));
}

function stringOption(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

interface StarterFile {
  path: string;
  contents: string;
}

async function initProject(targetDir: string, force: boolean) {
  const files = starterFiles(targetDir);
  const existing = await existingFiles(files);
  if (existing.length > 0 && !force) {
    const confirmed = await confirmOverwrite(existing);
    if (!confirmed) {
      throw new ClickClickError("INVALID_INPUT", `Refusing to overwrite existing files: ${existing.map((file) => file.path).join(", ")}`);
    }
  }

  await Promise.all([...new Set(files.map((file) => dirname(file.path)))].map((dir) => mkdir(dir, { recursive: true })));
  for (const file of files) {
    await writeFile(file.path, file.contents);
  }
}

function starterFiles(targetDir: string): StarterFile[] {
  const config = {
    templates: {
      social: {
        htmlPath: "templates/social-card.html",
        cssPath: "templates/social-card.css",
        onMissingLayer: "warn",
      },
    },
    recipes: {
      launch: {
        template: "social",
        output: {
          path: "dist/launch-og.png",
          width: 1200,
          height: 630,
        },
        modifications: [
          { name: "eyebrow", text: "Launch Kit" },
          { name: "title", text: "Your next announcement" },
          { name: "subtitle", text: "Edit clickclick.config.json to generate production social images." },
          { name: "logo", src: "../assets/logo.svg" },
        ],
      },
    },
    templateSets: {
      social: [
        {
          name: "og",
          template: "social",
          output: { width: 1200, height: 630 },
          modifications: [
            { name: "eyebrow", text: "Open Graph" },
            { name: "title", text: "A wide social card" },
            { name: "subtitle", text: "Generated from the starter template set." },
            { name: "logo", src: "../assets/logo.svg" },
          ],
        },
        {
          name: "square",
          template: "social",
          output: { width: 1080, height: 1080 },
          modifications: [
            { name: "eyebrow", text: "Square" },
            { name: "title", text: "A reusable image workflow" },
            { name: "subtitle", text: "Swap text and asset paths in config or CLI options." },
            { name: "logo", src: "../assets/logo.svg" },
          ],
        },
      ],
    },
  };

  return [
    {
      path: join(targetDir, "clickclick.config.json"),
      contents: `${JSON.stringify(config, null, 2)}\n`,
    },
    {
      path: join(targetDir, "templates", "social-card.html"),
      contents: `<main class="card">
  <img data-layer="logo" class="logo" alt="" />
  <p data-layer="eyebrow" class="eyebrow">Launch Kit</p>
  <h1 data-layer="title">Your next announcement</h1>
  <p data-layer="subtitle" class="subtitle">Edit clickclick.config.json to generate production social images.</p>
</main>
`,
    },
    {
      path: join(targetDir, "templates", "social-card.css"),
      contents: `html,
body,
.card {
  margin: 0;
  width: 100%;
  height: 100%;
}

.card {
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 28px;
  padding: 86px 92px;
  background: #111827;
  color: #f9fafb;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.card::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(135deg, rgba(34, 197, 94, 0.28), transparent 42%),
    linear-gradient(315deg, rgba(59, 130, 246, 0.24), transparent 45%);
}

.logo,
.eyebrow,
h1,
.subtitle {
  position: relative;
  z-index: 1;
}

.logo {
  position: absolute;
  top: 72px;
  left: 92px;
  width: 92px;
  height: 92px;
  object-fit: contain;
}

.eyebrow {
  margin: 0;
  color: #86efac;
  font-size: 28px;
  font-weight: 800;
  text-transform: uppercase;
}

h1 {
  max-width: 860px;
  margin: 0;
  font-size: 86px;
  line-height: 0.98;
}

.subtitle {
  max-width: 760px;
  margin: 0;
  color: #d1d5db;
  font-size: 34px;
  line-height: 1.22;
}
`,
    },
    {
      path: join(targetDir, "assets", "logo.svg"),
      contents: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="Starter logo">
  <rect width="96" height="96" rx="18" fill="#22c55e"/>
  <path d="M24 58 43 28h14L38 58h34v10H24z" fill="#052e16"/>
</svg>
`,
    },
  ];
}

async function existingFiles(files: StarterFile[]): Promise<StarterFile[]> {
  const result: StarterFile[] = [];
  for (const file of files) {
    try {
      await access(file.path);
      result.push(file);
    } catch {
      // Missing files are safe to create.
    }
  }
  return result;
}

async function confirmOverwrite(files: StarterFile[]): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return false;
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(`Overwrite ${files.length} existing ClickClick starter file${files.length === 1 ? "" : "s"}? [y/N] `);
    return answer.trim().toLowerCase() === "y" || answer.trim().toLowerCase() === "yes";
  } finally {
    rl.close();
  }
}

async function parseChartData(value: unknown) {
  if (typeof value !== "string") {
    throw new ClickClickError("INVALID_INPUT", "--data must be a JSON string or JSON file path.");
  }
  const trimmed = value.trim();
  const raw = trimmed.startsWith("[") || trimmed.startsWith("{")
    ? value
    : await readFileChecked(resolve(value), "Chart data");
  const rows = normalizeDataRows(parseJsonData(raw), "Chart data");
  return rows.map((row) => {
    const label = row.label;
    const datumValue = row.value;
    if (typeof label !== "string" || typeof datumValue !== "number") {
      throw new ClickClickError("INVALID_INPUT", "Chart data rows must include string label and numeric value fields.");
    }
    return { label, value: datumValue };
  });
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
