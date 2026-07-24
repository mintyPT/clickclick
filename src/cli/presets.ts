import { join, resolve } from "node:path";
import type { Command } from "commander";
import { ClickClickError, loadBrandKit, presets, renderImage, renderTemplate } from "../index.js";
import { presetMetadata } from "../presets/index.js";
import { coercePresetOption, loadLocalPresetConfig, loadLocalPresetModule, renderLocalPreset, resolvePresetValues, validatePresetSchema } from "../presets/schema.js";
import type { LocalPresetSchema, PresetModuleDefinition, PresetOptionSchema, PresetSchema } from "../presets/schema.js";
import type { PresetLogoOptions, PresetWatermarkOptions } from "../presets/index.js";
import type { RenderImageInput, RenderImageResult } from "../types.js";
import { collectOption, parseCacheOptions, parseInteger, parseNumber, parseOutputOptions, parseSizeOptions } from "./options.js";
import type { ParsedRenderSize } from "./options.js";

interface PresetCliDependencies {
  runRender: (input: RenderImageInput, options: RenderReportOptions | boolean, cache?: ReturnType<typeof parseCacheOptions>) => Promise<void>;
}

interface RenderReportOptions {
  strict: boolean;
  cacheInfo: boolean;
  json: boolean;
}

interface PresetCommandOption {
  flags: string;
  description: string;
  parser?: (value: string) => unknown;
  required?: boolean;
}

interface PresetCommandDefinition {
  command: string;
  options: PresetCommandOption[];
  render: (options: Record<string, unknown>) => RenderImageInput;
}

export function registerPresetCommands(parent: Command, dependencies: PresetCliDependencies) {
  parent.command("list")
    .description("List built-in presets")
    .option("--local", "Include local presets from a config file")
    .option("--preset-config <file>", "Local preset config JSON file", "clickclick.presets.json")
    .option("--preset-file <file>", "Local preset module file")
    .action(async (options) => {
    for (const item of presetMetadata) {
      console.log(`${item.name}\t${item.description}`);
    }
    if (options.local && (options.presetConfig !== "clickclick.presets.json" || typeof options.presetFile !== "string")) {
      const config = await loadLocalPresetConfig(options.presetConfig);
      for (const item of config.presets) {
        console.log(`${item.name}\t${item.description} (local)`);
      }
    }
    if (typeof options.presetFile === "string") {
      for (const item of await loadLocalPresetModule(options.presetFile)) {
        console.log(`${item.name}\t${item.description} (local module)`);
      }
    }
  });

  registerLocalPresetCommand(parent, dependencies);
  registerLocalPresetModuleCommand(parent, dependencies);
  registerBrandPresetCommands(parent, dependencies);
  registerLegacyPresetCommands(parent, dependencies);
  registerPhotoPresetCommands(parent, dependencies);
  registerRichMediaPresetCommands(parent, dependencies);
}

export const builtinPresetDefinitions = builtInPresetSchemas;

export function builtInPresetSchemas(): PresetSchema[] {
  return [
    ...brandPresetCommandDefinitions(),
    ...legacyPresetCommandDefinitions(),
    ...photoPresetCommandDefinitions(),
    ...richMediaPresetCommandDefinitions(),
  ].map(commandDefinitionSchema);
}

function legacyPresetCommandDefinitions(): PresetCommandDefinition[] {
  return [
    {
      command: "announcement",
      options: [
        { flags: "--title <text>", description: "Title text", required: true },
        { flags: "--subtitle <text>", description: "Subtitle text" },
        { flags: "--badge <text>", description: "Badge text" },
        { flags: "--meta <text>", description: "Meta text" },
        { flags: "--cta <text>", description: "Call-to-action text" },
        ...baseLegacyPresetOptions(),
        { flags: "--muted-color <color>", description: "Muted text color" },
      ],
      render: (options) => presets.announcement({
        brand: optionalBrand(options),
        title: requiredString(options.title, "title"),
        subtitle: optionalString(options.subtitle),
        badge: optionalString(options.badge),
        meta: optionalString(options.meta),
        cta: optionalString(options.cta),
        backgroundColor: optionalBackgroundColor(options),
        textColor: optionalString(options.textColor),
        accentColor: optionalString(options.accent),
        mutedColor: optionalString(options.mutedColor),
        fontFamily: optionalString(options.fontFamily),
        width: optionalNumber(options.width),
        height: optionalNumber(options.height),
      }),
    },
    {
      command: "checkerboard",
      options: [
        { flags: "--title <text>", description: "Title text", required: true },
        { flags: "--subtitle <text>", description: "Subtitle text" },
        { flags: "--label <text>", description: "Small label text" },
        ...baseLegacyPresetOptions(),
        { flags: "--checker-color <color>", description: "Checker pattern color" },
      ],
      render: (options) => presets.checkerboard({
        brand: optionalBrand(options),
        title: requiredString(options.title, "title"),
        subtitle: optionalString(options.subtitle),
        label: optionalString(options.label),
        backgroundColor: optionalBackgroundColor(options),
        checkerColor: optionalString(options.checkerColor),
        textColor: optionalString(options.textColor),
        accentColor: optionalString(options.accent),
        fontFamily: optionalString(options.fontFamily),
        width: optionalNumber(options.width),
        height: optionalNumber(options.height),
      }),
    },
    {
      command: "compare",
      options: [
        { flags: "--before-title <text>", description: "Before column title", required: true },
        { flags: "--after-title <text>", description: "After column title", required: true },
        { flags: "--title <text>", description: "Main title text" },
        { flags: "--before-text <text>", description: "Before column body text" },
        { flags: "--after-text <text>", description: "After column body text" },
        ...baseLegacyPresetOptions(),
        { flags: "--before-color <color>", description: "Before panel color" },
        { flags: "--after-color <color>", description: "After panel color" },
      ],
      render: (options) => presets.compare({
        brand: optionalBrand(options),
        title: optionalString(options.title),
        beforeTitle: requiredString(options.beforeTitle, "before-title"),
        beforeText: optionalString(options.beforeText),
        afterTitle: requiredString(options.afterTitle, "after-title"),
        afterText: optionalString(options.afterText),
        backgroundColor: optionalBackgroundColor(options),
        beforeColor: optionalString(options.beforeColor),
        afterColor: optionalString(options.afterColor),
        textColor: optionalString(options.textColor),
        accentColor: optionalString(options.accent),
        fontFamily: optionalString(options.fontFamily),
        width: optionalNumber(options.width),
        height: optionalNumber(options.height),
      }),
    },
    {
      command: "quote",
      options: [
        { flags: "--quote <text>", description: "Quote text", required: true },
        { flags: "--attribution <text>", description: "Quote attribution" },
        { flags: "--source <text>", description: "Quote source" },
        { flags: "--mark <text>", description: "Decorative quote mark" },
        ...baseLegacyPresetOptions(),
        { flags: "--align <align>", description: "Text alignment: left or center" },
      ],
      render: (options) => presets.quote({
        brand: optionalBrand(options),
        quote: requiredString(options.quote, "quote"),
        attribution: optionalString(options.attribution),
        source: optionalString(options.source),
        mark: optionalString(options.mark),
        backgroundColor: optionalBackgroundColor(options),
        textColor: optionalString(options.textColor),
        accentColor: optionalString(options.accent),
        align: parseAlignment(options.align),
        fontFamily: optionalString(options.fontFamily),
        width: optionalNumber(options.width),
        height: optionalNumber(options.height),
      }),
    },
    {
      command: "split",
      options: [
        { flags: "--title <text>", description: "Title text", required: true },
        { flags: "--subtitle <text>", description: "Subtitle text" },
        { flags: "--label <text>", description: "Small label text" },
        ...baseLegacyPresetOptions(),
        { flags: "--panel-color <color>", description: "Panel color" },
        { flags: "--panel-side <side>", description: "Panel side: left or right" },
      ],
      render: (options) => presets.split({
        brand: optionalBrand(options),
        title: requiredString(options.title, "title"),
        subtitle: optionalString(options.subtitle),
        label: optionalString(options.label),
        backgroundColor: optionalBackgroundColor(options),
        panelColor: optionalString(options.panelColor),
        accentColor: optionalString(options.accent),
        textColor: optionalString(options.textColor),
        panelSide: optionalString(options.panelSide) as "left" | "right" | undefined,
        fontFamily: optionalString(options.fontFamily),
        width: optionalNumber(options.width),
        height: optionalNumber(options.height),
      }),
    },
    {
      command: "terminal",
      options: [
        { flags: "--title <text>", description: "Title text", required: true },
        { flags: "--command <text>", description: "Command text", required: true },
        { flags: "--subtitle <text>", description: "Subtitle text" },
        { flags: "--prompt <text>", description: "Prompt text" },
        { flags: "--output-text <text>", description: "Terminal output text" },
        ...baseLegacyPresetOptions(),
        { flags: "--terminal-color <color>", description: "Terminal panel color" },
        { flags: "--command-color <color>", description: "Command text color" },
        { flags: "--mono-font-family <value>", description: "CSS monospace font-family value" },
      ],
      render: (options) => presets.terminal({
        brand: optionalBrand(options),
        title: requiredString(options.title, "title"),
        command: requiredString(options.command, "command"),
        subtitle: optionalString(options.subtitle),
        prompt: optionalString(options.prompt),
        output: optionalString(options.outputText),
        backgroundColor: optionalBackgroundColor(options),
        terminalColor: optionalString(options.terminalColor),
        textColor: optionalString(options.textColor),
        commandColor: optionalString(options.commandColor),
        accentColor: optionalString(options.accent),
        fontFamily: optionalString(options.fontFamily),
        monoFontFamily: optionalString(options.monoFontFamily),
        width: optionalNumber(options.width),
        height: optionalNumber(options.height),
      }),
    },
    {
      command: "minimal",
      options: [
        { flags: "--title <text>", description: "Title text", required: true },
        { flags: "--subtitle <text>", description: "Subtitle text" },
        { flags: "--meta <text>", description: "Meta text" },
        ...baseLegacyPresetOptions(),
        { flags: "--muted-color <color>", description: "Muted text color" },
        { flags: "--align <align>", description: "Text alignment: left or center" },
      ],
      render: (options) => presets.minimal({
        brand: optionalBrand(options),
        title: requiredString(options.title, "title"),
        subtitle: optionalString(options.subtitle),
        meta: optionalString(options.meta),
        backgroundColor: optionalBackgroundColor(options),
        textColor: optionalString(options.textColor),
        accentColor: optionalString(options.accent),
        mutedColor: optionalString(options.mutedColor),
        align: parseAlignment(options.align),
        fontFamily: optionalString(options.fontFamily),
        width: optionalNumber(options.width),
        height: optionalNumber(options.height),
      }),
    },
  ];
}

function registerLegacyPresetCommands(parent: Command, dependencies: PresetCliDependencies) {
  for (const definition of legacyPresetCommandDefinitions()) {
    let command = addCommandOptions(parent.command(definition.command), definition.options);
    command = addPresetRenderOptions(command);
    command.action(async (options) => {
      await runPresetCommand(definition, options, dependencies);
    });
  }
}

function baseLegacyPresetOptions(): PresetCommandOption[] {
  return [
    { flags: "--background, --background-color <color>", description: "Background color" },
    { flags: "--text-color <color>", description: "Text color" },
    { flags: "--accent <color>", description: "Accent color" },
    { flags: "--font-family <value>", description: "CSS font-family value" },
  ];
}

function brandPresetCommandDefinitions(): PresetCommandDefinition[] {
  return [
    {
      command: "brand-announcement",
      options: [
        { flags: "--title <text>", description: "Title text", required: true },
        { flags: "--subtitle <text>", description: "Subtitle text" },
        { flags: "--cta <text>", description: "Call-to-action text" },
      ],
      render: (options) => presets.brandAnnouncement({
        title: requiredString(options.title, "title"),
        subtitle: optionalString(options.subtitle),
        cta: optionalString(options.cta),
        ...brandMediaOptions(options),
      }),
    },
    {
      command: "logo-backdrop",
      options: [
        { flags: "--title <text>", description: "Title text", required: true },
        { flags: "--subtitle <text>", description: "Subtitle text" },
        { flags: "--meta <text>", description: "Meta text" },
      ],
      render: (options) => presets.logoBackdrop({
        title: requiredString(options.title, "title"),
        subtitle: optionalString(options.subtitle),
        meta: optionalString(options.meta),
        ...brandMediaOptions(options),
      }),
    },
    {
      command: "partner-card",
      options: [
        { flags: "--title <text>", description: "Title text", required: true },
        { flags: "--subtitle <text>", description: "Subtitle text" },
        { flags: "--partner-name <text>", description: "Partner name" },
        { flags: "--partner-logo <src>", description: "Partner logo image URL, path, or data URI" },
      ],
      render: (options) => presets.partnerCard({
        title: requiredString(options.title, "title"),
        subtitle: optionalString(options.subtitle),
        partnerName: optionalString(options.partnerName),
        partnerLogo: optionalString(options.partnerLogo),
        ...brandMediaOptions(options),
      }),
    },
    {
      command: "watermark-quote",
      options: [
        { flags: "--quote <text>", description: "Quote text", required: true },
        { flags: "--attribution <text>", description: "Attribution text" },
      ],
      render: (options) => presets.watermarkQuote({
        quote: requiredString(options.quote, "quote"),
        attribution: optionalString(options.attribution),
        ...brandMediaOptions(options),
      }),
    },
    {
      command: "badge-grid",
      options: [
        { flags: "--title <text>", description: "Title text", required: true },
        { flags: "--subtitle <text>", description: "Subtitle text" },
        { flags: "--badge <text>", description: "Badge text" },
        { flags: "--badge-logo <src>", description: "Repeated badge/logo image URL, path, or data URI" },
      ],
      render: (options) => presets.badgeGrid({
        title: requiredString(options.title, "title"),
        subtitle: optionalString(options.subtitle),
        badge: optionalString(options.badge),
        badgeLogo: optionalString(options.badgeLogo),
        ...brandMediaOptions(options),
      }),
    },
  ];
}

function photoPresetCommandDefinitions(): PresetCommandDefinition[] {
  return [
    {
      command: "photo-hero",
      options: [
        { flags: "--title <text>", description: "Title text", required: true },
        { flags: "--subtitle <text>", description: "Subtitle text" },
        { flags: "--label <text>", description: "Small label text" },
      ],
      render: (options) => presets.photoHero({
        title: requiredString(options.title, "title"),
        subtitle: optionalString(options.subtitle),
        label: optionalString(options.label),
        ...photoMediaOptions(options),
      }),
    },
    {
      command: "editorial-feature",
      options: [
        { flags: "--title <text>", description: "Title text", required: true },
        { flags: "--kicker <text>", description: "Kicker text" },
        { flags: "--byline <text>", description: "Byline or metadata text" },
        { flags: "--image-position <position>", description: "Feature image CSS position" },
      ],
      render: (options) => presets.editorialFeature({
        title: requiredString(options.title, "title"),
        kicker: optionalString(options.kicker),
        byline: optionalString(options.byline),
        imagePosition: optionalString(options.imagePosition),
        ...photoMediaOptions(options),
      }),
    },
    {
      command: "event-poster",
      options: [
        { flags: "--title <text>", description: "Title text", required: true },
        { flags: "--date <text>", description: "Date text" },
        { flags: "--meta <text>", description: "Meta text" },
        { flags: "--cta <text>", description: "Call-to-action text" },
      ],
      render: (options) => presets.eventPoster({
        title: requiredString(options.title, "title"),
        date: optionalString(options.date),
        meta: optionalString(options.meta),
        cta: optionalString(options.cta),
        ...photoMediaOptions(options),
      }),
    },
    {
      command: "case-study",
      options: [
        { flags: "--title <text>", description: "Title text", required: true },
        { flags: "--customer <text>", description: "Customer or brand text" },
        { flags: "--quote <text>", description: "Quote text" },
        { flags: "--metric <text>", description: "Result metric text" },
      ],
      render: (options) => presets.caseStudy({
        title: requiredString(options.title, "title"),
        customer: optionalString(options.customer),
        quote: optionalString(options.quote),
        metric: optionalString(options.metric),
        ...photoMediaOptions(options),
      }),
    },
  ];
}

function richMediaPresetCommandDefinitions(): PresetCommandDefinition[] {
  return [
    {
      command: "adaptive",
      options: [
        { flags: "--title <text>", description: "Title text", required: true },
        { flags: "--subtitle <text>", description: "Subtitle text" },
        { flags: "--eyebrow <text>", description: "Small eyebrow text" },
        { flags: "--meta <text>", description: "Footer metadata text" },
        { flags: "--background, --background-color <color>", description: "Background color" },
        { flags: "--panel-color <color>", description: "Visual panel color" },
      ],
      render: (options) => presets.adaptive({
        title: requiredString(options.title, "title"),
        subtitle: optionalString(options.subtitle),
        eyebrow: optionalString(options.eyebrow),
        meta: optionalString(options.meta),
        backgroundColor: optionalBackgroundColor(options),
        panelColor: optionalString(options.panelColor),
        ...richMediaPresetOptions(options),
      }),
    },
    {
      command: "gradient",
      options: [
        { flags: "--title <text>", description: "Title text", required: true },
        { flags: "--subtitle <text>", description: "Subtitle text" },
        { flags: "--label <text>", description: "Small label text" },
        { flags: "--from <color>", description: "Gradient start color" },
        { flags: "--to <color>", description: "Gradient end color" },
        { flags: "--align <align>", description: "Text alignment: left or center" },
      ],
      render: (options) => presets.gradient({
        title: requiredString(options.title, "title"),
        subtitle: optionalString(options.subtitle),
        label: optionalString(options.label),
        fromColor: optionalString(options.from),
        toColor: optionalString(options.to),
        align: parseAlignment(options.align),
        ...richMediaPresetOptions(options),
      }),
    },
    {
      command: "solid",
      options: [
        { flags: "--title <text>", description: "Title text", required: true },
        { flags: "--subtitle <text>", description: "Subtitle text" },
        { flags: "--label <text>", description: "Small label text" },
        { flags: "--background, --background-color <color>", description: "Background color" },
        { flags: "--align <align>", description: "Text alignment: left or center" },
      ],
      render: (options) => presets.solid({
        title: requiredString(options.title, "title"),
        subtitle: optionalString(options.subtitle),
        label: optionalString(options.label),
        backgroundColor: optionalBackgroundColor(options),
        align: parseAlignment(options.align),
        ...richMediaPresetOptions(options),
      }),
    },
  ];
}

function registerBrandPresetCommands(parent: Command, dependencies: PresetCliDependencies) {
  for (const definition of brandPresetCommandDefinitions()) {
    let command = addCommandOptions(parent.command(definition.command), definition.options);
    command = addLogoWatermarkOptions(command);
    command = addPresetColorOptions(command);
    command = addPresetRenderOptions(command);
    command.action(async (options) => {
      await runPresetCommand(definition, options, dependencies);
    });
  }
}

function registerPhotoPresetCommands(parent: Command, dependencies: PresetCliDependencies) {
  for (const definition of photoPresetCommandDefinitions()) {
    let command = addCommandOptions(parent.command(definition.command), definition.options);
    command = addPhotoMediaOptions(command);
    command = addLogoWatermarkOptions(command);
    command = addPhotoStyleOptions(command);
    command = addPresetRenderOptions(command);
    command.action(async (options) => {
      await runPresetCommand(definition, options, dependencies);
    });
  }
}

function registerRichMediaPresetCommands(parent: Command, dependencies: PresetCliDependencies) {
  for (const definition of richMediaPresetCommandDefinitions()) {
    let command = addCommandOptions(parent.command(definition.command), definition.options);
    command = addRichMediaOptions(command);
    command = addPresetRenderOptions(command);
    command.action(async (options) => {
      await runPresetCommand(definition, options, dependencies);
    });
  }
}

async function runPresetCommand(definition: PresetCommandDefinition, options: Record<string, unknown>, dependencies: PresetCliDependencies) {
  const brand = typeof options.brand === "string" ? await loadBrandKit(resolve(options.brand)) : undefined;
  const brandedOptions = { ...options, brand };
  const requestedSizes = parseSizeOptions(options);
  if (requestedSizes.length === 0) {
    await dependencies.runRender({
      ...definition.render(brandedOptions),
      output: parseOutputOptions(options),
    }, renderReportOptions(options), parseCacheOptions(options));
    return;
  }

  const outDir = multiSizeOutDir(options);
  if (options.json) {
    const startedAt = performance.now();
    const results: RenderImageResult[] = [];
    for (const size of requestedSizes) {
      const renderOptions = { ...brandedOptions, width: size.width, height: size.height, output: multiSizeOutputPath(outDir, definition.command, size, options) };
      results.push(await renderImage({
        ...definition.render(renderOptions),
        output: parseOutputOptions(renderOptions),
      }, { cache: parseCacheOptions(options) }));
    }
    reportJsonResults(results, startedAt, Boolean(options.strict));
    return;
  }

  for (const size of requestedSizes) {
    const renderOptions = { ...brandedOptions, width: size.width, height: size.height, output: multiSizeOutputPath(outDir, definition.command, size, options) };
    await dependencies.runRender({
      ...definition.render(renderOptions),
      output: parseOutputOptions(renderOptions),
    }, renderReportOptions(options), parseCacheOptions(options));
    if (!options.json) console.log(renderOptions.output);
  }
}

function registerLocalPresetCommand(parent: Command, dependencies: PresetCliDependencies) {
  let command = parent.command("local <name>")
    .description("Render a local preset from a preset config file")
    .allowUnknownOption(true)
    .option("--preset-config <file>", "Local preset config JSON file", "clickclick.presets.json");
  command = addPresetRenderOptions(command);
  command.action(async (name: string, options: Record<string, unknown>, actionCommand: Command) => {
    const config = await loadLocalPresetConfig(typeof options.presetConfig === "string" ? options.presetConfig : undefined);
    const schema = config.presets.find((preset) => preset.name === name);
    if (!schema) {
      throw new ClickClickError("INVALID_INPUT", `Local preset not found: ${name}`);
    }
    const values = resolvePresetValues(schema, parseLocalPresetArgs(schema, actionCommand.args));
    const requestedSizes = parseSizeOptions(options);
    if (requestedSizes.length === 0) {
      const input = renderLocalPreset(schemaWithViewportOverrides(schema, options), values, parseOutputOptions(options));
      await runLocalPreset(input, options, dependencies);
      return;
    }

    const outDir = multiSizeOutDir(options);
    if (options.json) {
      const startedAt = performance.now();
      const results: RenderImageResult[] = [];
      for (const size of requestedSizes) {
        const output = multiSizeOutputPath(outDir, name, size, options);
        const input = renderLocalPreset({
          ...schema,
          viewport: { ...schema.viewport, width: size.width, height: size.height },
        }, values, parseOutputOptions({ ...options, output }));
        results.push(await renderTemplate({
          ...input,
          cache: parseCacheOptions(options),
        }));
      }
      reportJsonResults(results, startedAt, Boolean(options.strict));
      return;
    }

    for (const size of requestedSizes) {
      const output = multiSizeOutputPath(outDir, name, size, options);
      const input = renderLocalPreset({
        ...schema,
        viewport: { ...schema.viewport, width: size.width, height: size.height },
      }, values, parseOutputOptions({ ...options, output }));
      await runLocalPreset(input, options, dependencies);
      if (!options.json) console.log(output);
    }
  });
}

function registerLocalPresetModuleCommand(parent: Command, dependencies: PresetCliDependencies) {
  let command = parent.command("run <name>")
    .description("Render a local preset module")
    .allowUnknownOption(true)
    .requiredOption("--preset-file <file>", "Local preset module file");
  command = addPresetRenderOptions(command);
  command.action(async (name: string, options: Record<string, unknown>, actionCommand: Command) => {
    const definitions = await loadLocalPresetModule(requiredString(options.presetFile, "preset-file"));
    const definition = definitions.find((preset) => preset.name === name || preset.command === name);
    if (!definition) {
      throw new ClickClickError("INVALID_INPUT", `Local preset module not found: ${name}`);
    }
    const values = {
      ...resolvePresetValues(definition, parseModulePresetArgs(definition, actionCommand.args)),
      width: optionalNumber(options.width),
      height: optionalNumber(options.height),
    } as Record<string, string | number | boolean | undefined>;
    await runModulePreset(definition, values, options, dependencies);
  });
}

function schemaWithViewportOverrides(schema: LocalPresetSchema, options: Record<string, unknown>): LocalPresetSchema {
  return {
    ...schema,
    viewport: {
      ...schema.viewport,
      width: optionalNumber(options.width) ?? schema.viewport?.width,
      height: optionalNumber(options.height) ?? schema.viewport?.height,
    },
  };
}

async function runLocalPreset(input: ReturnType<typeof renderLocalPreset>, options: Record<string, unknown>, dependencies: PresetCliDependencies) {
  const startedAt = performance.now();
  const result = await renderTemplate({
    ...input,
    cache: parseCacheOptions(options),
  });
  if (options.json) {
    console.log(JSON.stringify(renderJsonSummary(result, startedAt), null, 2));
    return;
  }
  for (const warning of result.warnings) {
    console.warn(warning.message);
  }
  if (options.strict && result.warnings.length > 0) {
    process.exitCode = 1;
  }
}

async function runModulePreset(definition: PresetModuleDefinition, values: Record<string, string | number | boolean | undefined>, options: Record<string, unknown>, dependencies: PresetCliDependencies) {
  await dependencies.runRender({
    ...definition.render(values),
    output: parseOutputOptions(options),
  }, renderReportOptions(options), parseCacheOptions(options));
}

function parseModulePresetArgs(schema: PresetModuleDefinition, args: string[]): Record<string, string | number | boolean> {
  return parseLocalPresetArgs(schema as LocalPresetSchema, args);
}

function parseLocalPresetArgs(schema: LocalPresetSchema, args: string[]): Record<string, string | number | boolean> {
  validatePresetSchema(schema);
  const values: Record<string, string | number | boolean> = {};
  const byFlag = new Map(schema.options.map((option) => [`--${option.flag ?? option.name}`, option]));
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === undefined) continue;
    if (!token.startsWith("--")) continue;
    const [flag, inlineValue] = token.split("=", 2) as [string, string?];
    const option = byFlag.get(flag);
    if (!option) {
      throw new ClickClickError("INVALID_INPUT", `Unknown local preset option: ${flag}`);
    }
    if (option.type === "boolean") {
      values[option.name] = inlineValue === undefined ? true : coercePresetOption(option, inlineValue);
      continue;
    }
    const rawValue = inlineValue ?? args[index + 1];
    if (rawValue === undefined || rawValue.startsWith("--")) {
      throw new ClickClickError("INVALID_INPUT", `Missing value for local preset option: ${flag}`);
    }
    values[option.name] = coercePresetOption(option, rawValue);
    if (inlineValue === undefined) index += 1;
  }
  return values;
}

function commandDefinitionSchema(definition: PresetCommandDefinition): PresetSchema {
  return {
    name: definition.command,
    command: definition.command,
    description: presetMetadata.find((item) => item.name === definition.command)?.description ?? definition.command,
    options: definition.options.map(commandOptionSchema),
  };
}

function commandOptionSchema(option: PresetCommandOption): PresetOptionSchema {
  const name = optionName(option.flags);
  return {
    name,
    flag: name.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`),
    description: option.description,
    type: option.parser === parseInteger ? "integer" : option.parser === parseNumber ? "number" : "string",
    required: option.required,
  };
}

function optionName(flags: string): string {
  const long = flags.split(/[ ,|]+/).find((part) => part.startsWith("--") && !part.includes(","));
  const normalized = (long ?? flags).replace(/^--/, "").replace(/[ <[].*$/, "");
  return normalized.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}

function addCommandOptions(command: Command, options: PresetCommandOption[]): Command {
  let next = command;
  for (const option of options) {
    next = addCommandOption(next, option);
  }
  return next;
}

function addCommandOption(command: Command, option: PresetCommandOption): Command {
  if (option.parser) {
    return option.required
      ? command.requiredOption(option.flags, option.description, option.parser)
      : command.option(option.flags, option.description, option.parser);
  }
  return option.required
    ? command.requiredOption(option.flags, option.description)
    : command.option(option.flags, option.description);
}

function addLogoWatermarkOptions(command: Command): Command {
  return command
    .option("--logo <src>", "Logo image URL, path, or data URI")
    .option("--logo-placement <placement>", "Logo placement corner")
    .option("--watermark <src>", "Watermark image URL, path, or data URI")
    .option("--watermark-text <text>", "Watermark text")
    .option("--watermark-opacity <number>", "Watermark opacity from 0 to 1", parseNumber);
}

function addPresetColorOptions(command: Command): Command {
  return command
    .option("--background, --background-color <color>", "Background color")
    .option("--text-color <color>", "Text color")
    .option("--accent <color>", "Accent color")
    .option("--font-family <value>", "CSS font-family value");
}

function addPhotoMediaOptions(command: Command): Command {
  return command
    .option("--image <src>", "Image URL, path, or data URI")
    .option("--overlay <color>", "Background overlay CSS color or gradient");
}

function addPhotoStyleOptions(command: Command): Command {
  return command
    .option("--text-color <color>", "Text color")
    .option("--accent <color>", "Accent color")
    .option("--font-family <value>", "CSS font-family value");
}

function addRichMediaOptions(command: Command): Command {
  return command
    .option("--text-color <color>", "Text color")
    .option("--accent <color>", "Accent color")
    .option("--background-image <src>", "Background image URL, path, or data URI")
    .option("--background-fit <fit>", "Background image fit: cover, contain, fill, none, or scale-down")
    .option("--background-position <position>", "Background image CSS position")
    .option("--background-opacity <number>", "Background image opacity from 0 to 1", parseNumber)
    .option("--overlay <color>", "Background image overlay color")
    .option("--logo <src>", "Logo image URL, path, or data URI")
    .option("--logo-placement <placement>", "Logo placement corner")
    .option("--logo-size <px>", "Logo width in pixels", parseInteger)
    .option("--logo-opacity <number>", "Logo opacity from 0 to 1", parseNumber)
    .option("--logo-alt <text>", "Logo alt text")
    .option("--watermark <src>", "Watermark image URL, path, or data URI")
    .option("--watermark-text <text>", "Watermark text")
    .option("--watermark-placement <placement>", "Watermark placement")
    .option("--watermark-opacity <number>", "Watermark opacity from 0 to 1", parseNumber)
    .option("--watermark-scale <number>", "Watermark scale ratio", parseNumber)
    .option("--watermark-rotation <degrees>", "Watermark rotation in degrees", parseNumber)
    .option("--font-family <value>", "CSS font-family value");
}

function addPresetRenderOptions(command: Command): Command {
  return command
    .option("--brand <file>", "Brand kit JSON file")
    .option("--width <px>", "Image width", parseInteger)
    .option("--height <px>", "Image height", parseInteger)
    .option("--out, --output <file>", "Output image path")
    .option("--out-dir <dir>", "Directory for multi-size output images")
    .option("--size <size>", "Named size or WIDTHxHEIGHT. Repeat for multiple outputs.", collectOption, [])
    .option("--sizes <sizes>", "Comma-separated named sizes or WIDTHxHEIGHT values")
    .option("--format <format>", "Output format: png or jpeg")
    .option("--quality <number>", "JPEG quality from 0 to 100", parseInteger)
    .option("--cache", "Reuse cached output for identical deterministic input")
    .option("--cache-dir <dir>", "Cache directory", ".clickclick-cache")
    .option("--cache-info", "Print cache hit/miss information")
    .option("--json", "Print a JSON summary")
    .option("--strict", "Exit non-zero when renderer warnings are produced");
}

function renderReportOptions(options: Record<string, unknown>): RenderReportOptions {
  return {
    strict: Boolean(options.strict),
    cacheInfo: Boolean(options.cacheInfo),
    json: Boolean(options.json),
  };
}

function renderJsonSummary(result: RenderImageResult, startedAt: number) {
  return {
    path: result.path,
    format: result.format,
    width: result.width,
    height: result.height,
    warnings: result.warnings,
    cache: result.cache
      ? {
        hit: result.cache.hit,
        status: result.cache.hit ? "hit" : "miss",
        key: result.cache.key,
        dir: result.cache.dir,
        skippedReason: result.cache.skippedReason,
      }
      : undefined,
    durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
  };
}

function reportJsonResults(results: RenderImageResult[], startedAt: number, strict: boolean) {
  console.log(JSON.stringify({
    ok: results.every((result) => result.warnings.length === 0),
    outputs: results.map((result) => renderJsonSummary(result, startedAt)),
    durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
  }, null, 2));
  if (strict && results.some((result) => result.warnings.length > 0)) {
    process.exitCode = 1;
  }
}

function multiSizeOutDir(options: Record<string, unknown>): string {
  if (typeof options.output === "string") {
    throw new ClickClickError("INVALID_INPUT", "--out cannot be combined with --size or --sizes. Use --out-dir for multi-size output.");
  }
  if (typeof options.outDir !== "string") {
    throw new ClickClickError("INVALID_INPUT", "--out-dir is required when --size or --sizes is used.");
  }
  if (options.format !== undefined && options.format !== "png" && options.format !== "jpeg") {
    throw new ClickClickError("INVALID_INPUT", "Format must be png or jpeg.");
  }
  return resolve(options.outDir);
}

function multiSizeOutputPath(outDir: string, commandName: string, size: ParsedRenderSize, options: Record<string, unknown>): string {
  const extension = options.format === "jpeg" ? "jpg" : "png";
  return join(outDir, `${commandName}-${size.label}.${extension}`);
}

function brandMediaOptions(options: Record<string, unknown>) {
  return {
    brand: optionalBrand(options),
    logo: parseLogoOption(options),
    watermark: parseWatermarkOption(options),
    backgroundColor: optionalBackgroundColor(options),
    textColor: optionalString(options.textColor),
    accentColor: optionalString(options.accent),
    fontFamily: optionalString(options.fontFamily),
    width: optionalNumber(options.width),
    height: optionalNumber(options.height),
  };
}

function photoMediaOptions(options: Record<string, unknown>) {
  return {
    brand: optionalBrand(options),
    image: optionalString(options.image),
    overlay: optionalString(options.overlay),
    logo: parseLogoOption(options),
    watermark: parseWatermarkOption(options),
    textColor: optionalString(options.textColor),
    accentColor: optionalString(options.accent),
    fontFamily: optionalString(options.fontFamily),
    width: optionalNumber(options.width),
    height: optionalNumber(options.height),
  };
}

function richMediaPresetOptions(options: Record<string, unknown>) {
  return {
    brand: optionalBrand(options),
    textColor: optionalString(options.textColor),
    accentColor: optionalString(options.accent),
    ...parsePresetMediaOptions(options),
    fontFamily: optionalString(options.fontFamily),
    width: optionalNumber(options.width),
    height: optionalNumber(options.height),
  };
}

function parseAlignment(value: unknown): "left" | "center" | undefined {
  if (value === undefined) return undefined;
  if (value === "left" || value === "center") return value;
  throw new ClickClickError("INVALID_INPUT", "align must be left or center.");
}

function requiredString(value: unknown, name: string): string {
  if (typeof value === "string") return value;
  throw new ClickClickError("INVALID_INPUT", `Missing required preset option: ${name}`);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function optionalBrand(options: Record<string, unknown>) {
  return options.brand && typeof options.brand === "object" ? options.brand : undefined;
}

function optionalBackgroundColor(options: Record<string, unknown>): string | undefined {
  return optionalString(options.background) ?? optionalString(options.backgroundColor);
}

function parsePresetMediaOptions(options: Record<string, unknown>) {
  const media: Record<string, unknown> = {};
  if (typeof options.backgroundImage === "string") {
    media.background = {
      src: options.backgroundImage,
      fit: parseMediaFit(options.backgroundFit),
      position: typeof options.backgroundPosition === "string" ? options.backgroundPosition : undefined,
      opacity: typeof options.backgroundOpacity === "number" ? options.backgroundOpacity : undefined,
      overlay: typeof options.overlay === "string" ? options.overlay : undefined,
    };
  }
  if (typeof options.logo === "string") {
    media.logo = {
      src: options.logo,
      placement: parseMediaPlacement(options.logoPlacement, "logo-placement"),
      size: typeof options.logoSize === "number" ? options.logoSize : undefined,
      opacity: typeof options.logoOpacity === "number" ? options.logoOpacity : undefined,
      alt: typeof options.logoAlt === "string" ? options.logoAlt : undefined,
    };
  }
  if (typeof options.watermark === "string" || typeof options.watermarkText === "string") {
    media.watermark = {
      src: typeof options.watermark === "string" ? options.watermark : undefined,
      text: typeof options.watermarkText === "string" ? options.watermarkText : undefined,
      placement: parseMediaPlacement(options.watermarkPlacement, "watermark-placement"),
      opacity: typeof options.watermarkOpacity === "number" ? options.watermarkOpacity : undefined,
      scale: typeof options.watermarkScale === "number" ? options.watermarkScale : undefined,
      rotation: typeof options.watermarkRotation === "number" ? options.watermarkRotation : undefined,
    };
  }
  return media;
}

function parseLogoOption(options: Record<string, unknown>): PresetLogoOptions | undefined {
  if (typeof options.logo !== "string") return undefined;
  const placement = parseMediaPlacement(options.logoPlacement, "logo-placement");
  if (placement === "center") {
    throw new ClickClickError("INVALID_INPUT", "logo-placement must be top-left, top-right, bottom-left, or bottom-right.");
  }
  return {
    src: options.logo,
    placement,
  };
}

function parseWatermarkOption(options: Record<string, unknown>): PresetWatermarkOptions | undefined {
  if (typeof options.watermark !== "string" && typeof options.watermarkText !== "string") return undefined;
  return {
    src: typeof options.watermark === "string" ? options.watermark : undefined,
    text: typeof options.watermarkText === "string" ? options.watermarkText : undefined,
    opacity: typeof options.watermarkOpacity === "number" ? options.watermarkOpacity : undefined,
  };
}

function parseMediaFit(value: unknown) {
  if (value === undefined) return undefined;
  if (value === "cover" || value === "contain" || value === "fill" || value === "none" || value === "scale-down") return value;
  throw new ClickClickError("INVALID_INPUT", "background-fit must be cover, contain, fill, none, or scale-down.");
}

function parseMediaPlacement(value: unknown, label: string): PresetWatermarkOptions["placement"] | undefined {
  if (value === undefined) return undefined;
  if (value === "top-left" || value === "top-right" || value === "bottom-left" || value === "bottom-right" || value === "center") return value;
  throw new ClickClickError("INVALID_INPUT", `${label} must be top-left, top-right, bottom-left, bottom-right, or center.`);
}
