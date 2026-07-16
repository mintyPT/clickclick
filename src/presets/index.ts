import { gradient } from "./gradient.js";
import { quote } from "./quote.js";
import { solid } from "./solid.js";
import { split } from "./split.js";
import { terminal } from "./terminal.js";
export type { GradientPresetOptions } from "./gradient.js";
export type { QuotePresetOptions } from "./quote.js";
export type { SolidPresetOptions } from "./solid.js";
export type { SplitPresetOptions } from "./split.js";
export type { TerminalPresetOptions } from "./terminal.js";

export const presets = {
  gradient,
  quote,
  solid,
  split,
  terminal,
};

export const presetMetadata = [
  {
    name: "gradient",
    description: "Gradient social image with title, optional subtitle, and accent glow.",
  },
  {
    name: "quote",
    description: "Editorial quote image with attribution and optional source.",
  },
  {
    name: "solid",
    description: "Solid-background social image with title and optional subtitle.",
  },
  {
    name: "split",
    description: "Split-layout social image with text and a bold graphic panel.",
  },
  {
    name: "terminal",
    description: "Developer-focused social image with title and command block.",
  },
] as const;
