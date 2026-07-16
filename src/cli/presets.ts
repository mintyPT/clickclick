import type { Command } from "commander";
import { ClickClickError, presets } from "../index.js";
import { presetMetadata } from "../presets/index.js";
import type { PresetLogoOptions, PresetWatermarkOptions } from "../presets/index.js";
import type { RenderImageInput, RenderOutputOptions } from "../types.js";

interface PresetCliDependencies {
  runRender: (input: RenderImageInput, strict: boolean) => Promise<void>;
  parseOutputOptions: (options: Record<string, unknown>) => RenderOutputOptions;
  parseInteger: (value: string) => number;
  parseNumber: (value: string) => number;
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
  parent.command("list").description("List built-in presets").action(() => {
    for (const item of presetMetadata) {
      console.log(`${item.name}\t${item.description}`);
    }
  });

  registerBrandPresetCommands(parent, dependencies);
  registerLegacyPresetCommands(parent, dependencies);
  registerPhotoPresetCommands(parent, dependencies);
  registerRichMediaPresetCommands(parent, dependencies);
}

function registerLegacyPresetCommands(parent: Command, dependencies: PresetCliDependencies) {
  parent
    .command("announcement")
    .requiredOption("--title <text>", "Title text")
    .option("--subtitle <text>", "Subtitle text")
    .option("--badge <text>", "Badge text")
    .option("--meta <text>", "Meta text")
    .option("--cta <text>", "Call-to-action text")
    .option("--background, --background-color <color>", "Background color")
    .option("--text-color <color>", "Text color")
    .option("--accent <color>", "Accent color")
    .option("--muted-color <color>", "Muted text color")
    .option("--font-family <value>", "CSS font-family value")
    .option("--width <px>", "Image width", dependencies.parseInteger)
    .option("--height <px>", "Image height", dependencies.parseInteger)
    .option("--out, --output <file>", "Output image path")
    .option("--format <format>", "Output format: png or jpeg")
    .option("--quality <number>", "JPEG quality from 0 to 100", dependencies.parseInteger)
    .option("--strict", "Exit non-zero when renderer warnings are produced")
    .action(async (options) => {
      await dependencies.runRender({
        ...presets.announcement({
          title: options.title,
          subtitle: options.subtitle,
          badge: options.badge,
          meta: options.meta,
          cta: options.cta,
          backgroundColor: options.background,
          textColor: options.textColor,
          accentColor: options.accent,
          mutedColor: options.mutedColor,
          fontFamily: options.fontFamily,
          width: options.width,
          height: options.height,
        }),
        output: dependencies.parseOutputOptions(options),
      }, Boolean(options.strict));
    });

  parent
    .command("checkerboard")
    .requiredOption("--title <text>", "Title text")
    .option("--subtitle <text>", "Subtitle text")
    .option("--label <text>", "Small label text")
    .option("--background, --background-color <color>", "Background color")
    .option("--checker-color <color>", "Checker pattern color")
    .option("--text-color <color>", "Text color")
    .option("--accent <color>", "Accent color")
    .option("--font-family <value>", "CSS font-family value")
    .option("--width <px>", "Image width", dependencies.parseInteger)
    .option("--height <px>", "Image height", dependencies.parseInteger)
    .option("--out, --output <file>", "Output image path")
    .option("--format <format>", "Output format: png or jpeg")
    .option("--quality <number>", "JPEG quality from 0 to 100", dependencies.parseInteger)
    .option("--strict", "Exit non-zero when renderer warnings are produced")
    .action(async (options) => {
      await dependencies.runRender({
        ...presets.checkerboard({
          title: options.title,
          subtitle: options.subtitle,
          label: options.label,
          backgroundColor: options.background,
          checkerColor: options.checkerColor,
          textColor: options.textColor,
          accentColor: options.accent,
          fontFamily: options.fontFamily,
          width: options.width,
          height: options.height,
        }),
        output: dependencies.parseOutputOptions(options),
      }, Boolean(options.strict));
    });

  parent
    .command("compare")
    .requiredOption("--before-title <text>", "Before column title")
    .requiredOption("--after-title <text>", "After column title")
    .option("--title <text>", "Main title text")
    .option("--before-text <text>", "Before column body text")
    .option("--after-text <text>", "After column body text")
    .option("--background, --background-color <color>", "Background color")
    .option("--before-color <color>", "Before panel color")
    .option("--after-color <color>", "After panel color")
    .option("--text-color <color>", "Text color")
    .option("--accent <color>", "Accent color")
    .option("--font-family <value>", "CSS font-family value")
    .option("--width <px>", "Image width", dependencies.parseInteger)
    .option("--height <px>", "Image height", dependencies.parseInteger)
    .option("--out, --output <file>", "Output image path")
    .option("--format <format>", "Output format: png or jpeg")
    .option("--quality <number>", "JPEG quality from 0 to 100", dependencies.parseInteger)
    .option("--strict", "Exit non-zero when renderer warnings are produced")
    .action(async (options) => {
      await dependencies.runRender({
        ...presets.compare({
          title: options.title,
          beforeTitle: options.beforeTitle,
          beforeText: options.beforeText,
          afterTitle: options.afterTitle,
          afterText: options.afterText,
          backgroundColor: options.background,
          beforeColor: options.beforeColor,
          afterColor: options.afterColor,
          textColor: options.textColor,
          accentColor: options.accent,
          fontFamily: options.fontFamily,
          width: options.width,
          height: options.height,
        }),
        output: dependencies.parseOutputOptions(options),
      }, Boolean(options.strict));
    });

  parent
    .command("quote")
    .requiredOption("--quote <text>", "Quote text")
    .option("--attribution <text>", "Quote attribution")
    .option("--source <text>", "Quote source")
    .option("--mark <text>", "Decorative quote mark")
    .option("--background, --background-color <color>", "Background color")
    .option("--text-color <color>", "Text color")
    .option("--accent <color>", "Accent color")
    .option("--align <align>", "Text alignment: left or center")
    .option("--font-family <value>", "CSS font-family value")
    .option("--width <px>", "Image width", dependencies.parseInteger)
    .option("--height <px>", "Image height", dependencies.parseInteger)
    .option("--out, --output <file>", "Output image path")
    .option("--format <format>", "Output format: png or jpeg")
    .option("--quality <number>", "JPEG quality from 0 to 100", dependencies.parseInteger)
    .option("--strict", "Exit non-zero when renderer warnings are produced")
    .action(async (options) => {
      await dependencies.runRender({
        ...presets.quote({
          quote: options.quote,
          attribution: options.attribution,
          source: options.source,
          mark: options.mark,
          backgroundColor: options.background,
          textColor: options.textColor,
          accentColor: options.accent,
          align: options.align,
          fontFamily: options.fontFamily,
          width: options.width,
          height: options.height,
        }),
        output: dependencies.parseOutputOptions(options),
      }, Boolean(options.strict));
    });

  parent
    .command("split")
    .requiredOption("--title <text>", "Title text")
    .option("--subtitle <text>", "Subtitle text")
    .option("--label <text>", "Small label text")
    .option("--background, --background-color <color>", "Background color")
    .option("--panel-color <color>", "Panel color")
    .option("--accent <color>", "Accent color")
    .option("--text-color <color>", "Text color")
    .option("--panel-side <side>", "Panel side: left or right")
    .option("--font-family <value>", "CSS font-family value")
    .option("--width <px>", "Image width", dependencies.parseInteger)
    .option("--height <px>", "Image height", dependencies.parseInteger)
    .option("--out, --output <file>", "Output image path")
    .option("--format <format>", "Output format: png or jpeg")
    .option("--quality <number>", "JPEG quality from 0 to 100", dependencies.parseInteger)
    .option("--strict", "Exit non-zero when renderer warnings are produced")
    .action(async (options) => {
      await dependencies.runRender({
        ...presets.split({
          title: options.title,
          subtitle: options.subtitle,
          label: options.label,
          backgroundColor: options.background,
          panelColor: options.panelColor,
          accentColor: options.accent,
          textColor: options.textColor,
          panelSide: options.panelSide,
          fontFamily: options.fontFamily,
          width: options.width,
          height: options.height,
        }),
        output: dependencies.parseOutputOptions(options),
      }, Boolean(options.strict));
    });

  parent
    .command("terminal")
    .requiredOption("--title <text>", "Title text")
    .requiredOption("--command <text>", "Command text")
    .option("--subtitle <text>", "Subtitle text")
    .option("--prompt <text>", "Prompt text")
    .option("--output-text <text>", "Terminal output text")
    .option("--background, --background-color <color>", "Background color")
    .option("--terminal-color <color>", "Terminal panel color")
    .option("--text-color <color>", "Text color")
    .option("--command-color <color>", "Command text color")
    .option("--accent <color>", "Accent color")
    .option("--font-family <value>", "CSS font-family value")
    .option("--mono-font-family <value>", "CSS monospace font-family value")
    .option("--width <px>", "Image width", dependencies.parseInteger)
    .option("--height <px>", "Image height", dependencies.parseInteger)
    .option("--out, --output <file>", "Output image path")
    .option("--format <format>", "Output format: png or jpeg")
    .option("--quality <number>", "JPEG quality from 0 to 100", dependencies.parseInteger)
    .option("--strict", "Exit non-zero when renderer warnings are produced")
    .action(async (options) => {
      await dependencies.runRender({
        ...presets.terminal({
          title: options.title,
          command: options.command,
          subtitle: options.subtitle,
          prompt: options.prompt,
          output: options.outputText,
          backgroundColor: options.background,
          terminalColor: options.terminalColor,
          textColor: options.textColor,
          commandColor: options.commandColor,
          accentColor: options.accent,
          fontFamily: options.fontFamily,
          monoFontFamily: options.monoFontFamily,
          width: options.width,
          height: options.height,
        }),
        output: dependencies.parseOutputOptions(options),
      }, Boolean(options.strict));
    });

  parent
    .command("minimal")
    .requiredOption("--title <text>", "Title text")
    .option("--subtitle <text>", "Subtitle text")
    .option("--meta <text>", "Meta text")
    .option("--background, --background-color <color>", "Background color")
    .option("--text-color <color>", "Text color")
    .option("--accent <color>", "Accent color")
    .option("--muted-color <color>", "Muted text color")
    .option("--align <align>", "Text alignment: left or center")
    .option("--font-family <value>", "CSS font-family value")
    .option("--width <px>", "Image width", dependencies.parseInteger)
    .option("--height <px>", "Image height", dependencies.parseInteger)
    .option("--out, --output <file>", "Output image path")
    .option("--format <format>", "Output format: png or jpeg")
    .option("--quality <number>", "JPEG quality from 0 to 100", dependencies.parseInteger)
    .option("--strict", "Exit non-zero when renderer warnings are produced")
    .action(async (options) => {
      await dependencies.runRender({
        ...presets.minimal({
          title: options.title,
          subtitle: options.subtitle,
          meta: options.meta,
          backgroundColor: options.background,
          textColor: options.textColor,
          accentColor: options.accent,
          mutedColor: options.mutedColor,
          align: options.align,
          fontFamily: options.fontFamily,
          width: options.width,
          height: options.height,
        }),
        output: dependencies.parseOutputOptions(options),
      }, Boolean(options.strict));
    });
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
        backgroundColor: optionalString(options.background),
        align: parseAlignment(options.align),
        ...richMediaPresetOptions(options),
      }),
    },
  ];
}

function registerBrandPresetCommands(parent: Command, dependencies: PresetCliDependencies) {
  for (const definition of brandPresetCommandDefinitions()) {
    let command = addCommandOptions(parent.command(definition.command), definition.options);
    command = addLogoWatermarkOptions(command, dependencies);
    command = addPresetColorOptions(command);
    command = addPresetRenderOptions(command, dependencies);
    command.action(async (options) => {
      await dependencies.runRender({
        ...definition.render(options),
        output: dependencies.parseOutputOptions(options),
      }, Boolean(options.strict));
    });
  }
}

function registerPhotoPresetCommands(parent: Command, dependencies: PresetCliDependencies) {
  for (const definition of photoPresetCommandDefinitions()) {
    let command = addCommandOptions(parent.command(definition.command), definition.options);
    command = addPhotoMediaOptions(command);
    command = addLogoWatermarkOptions(command, dependencies);
    command = addPhotoStyleOptions(command);
    command = addPresetRenderOptions(command, dependencies);
    command.action(async (options) => {
      await dependencies.runRender({
        ...definition.render(options),
        output: dependencies.parseOutputOptions(options),
      }, Boolean(options.strict));
    });
  }
}

function registerRichMediaPresetCommands(parent: Command, dependencies: PresetCliDependencies) {
  for (const definition of richMediaPresetCommandDefinitions()) {
    let command = addCommandOptions(parent.command(definition.command), definition.options);
    command = addRichMediaOptions(command, dependencies);
    command = addPresetRenderOptions(command, dependencies);
    command.action(async (options) => {
      await dependencies.runRender({
        ...definition.render(options),
        output: dependencies.parseOutputOptions(options),
      }, Boolean(options.strict));
    });
  }
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

function addLogoWatermarkOptions(command: Command, dependencies: PresetCliDependencies): Command {
  return command
    .option("--logo <src>", "Logo image URL, path, or data URI")
    .option("--logo-placement <placement>", "Logo placement corner")
    .option("--watermark <src>", "Watermark image URL, path, or data URI")
    .option("--watermark-text <text>", "Watermark text")
    .option("--watermark-opacity <number>", "Watermark opacity from 0 to 1", dependencies.parseNumber);
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

function addRichMediaOptions(command: Command, dependencies: PresetCliDependencies): Command {
  return command
    .option("--text-color <color>", "Text color")
    .option("--accent <color>", "Accent color")
    .option("--background-image <src>", "Background image URL, path, or data URI")
    .option("--background-fit <fit>", "Background image fit: cover, contain, fill, none, or scale-down")
    .option("--background-position <position>", "Background image CSS position")
    .option("--background-opacity <number>", "Background image opacity from 0 to 1", dependencies.parseNumber)
    .option("--overlay <color>", "Background image overlay color")
    .option("--logo <src>", "Logo image URL, path, or data URI")
    .option("--logo-placement <placement>", "Logo placement corner")
    .option("--logo-size <px>", "Logo width in pixels", dependencies.parseInteger)
    .option("--logo-opacity <number>", "Logo opacity from 0 to 1", dependencies.parseNumber)
    .option("--logo-alt <text>", "Logo alt text")
    .option("--watermark <src>", "Watermark image URL, path, or data URI")
    .option("--watermark-text <text>", "Watermark text")
    .option("--watermark-placement <placement>", "Watermark placement")
    .option("--watermark-opacity <number>", "Watermark opacity from 0 to 1", dependencies.parseNumber)
    .option("--watermark-scale <number>", "Watermark scale ratio", dependencies.parseNumber)
    .option("--watermark-rotation <degrees>", "Watermark rotation in degrees", dependencies.parseNumber)
    .option("--font-family <value>", "CSS font-family value");
}

function addPresetRenderOptions(command: Command, dependencies: PresetCliDependencies): Command {
  return command
    .option("--width <px>", "Image width", dependencies.parseInteger)
    .option("--height <px>", "Image height", dependencies.parseInteger)
    .option("--out, --output <file>", "Output image path")
    .option("--format <format>", "Output format: png or jpeg")
    .option("--quality <number>", "JPEG quality from 0 to 100", dependencies.parseInteger)
    .option("--strict", "Exit non-zero when renderer warnings are produced");
}

function brandMediaOptions(options: Record<string, unknown>) {
  return {
    logo: parseLogoOption(options),
    watermark: parseWatermarkOption(options),
    backgroundColor: optionalString(options.background),
    textColor: optionalString(options.textColor),
    accentColor: optionalString(options.accent),
    fontFamily: optionalString(options.fontFamily),
    width: optionalNumber(options.width),
    height: optionalNumber(options.height),
  };
}

function photoMediaOptions(options: Record<string, unknown>) {
  return {
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
