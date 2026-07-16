import { announcement } from "./announcement.js";
import { checkerboard } from "./checkerboard.js";
import { compare } from "./compare.js";
import { gradient } from "./gradient.js";
import { minimal } from "./minimal.js";
import { quote } from "./quote.js";
import { solid } from "./solid.js";
import { split } from "./split.js";
import { terminal } from "./terminal.js";
export type { AnnouncementPresetOptions } from "./announcement.js";
export type { CheckerboardPresetOptions } from "./checkerboard.js";
export type { ComparePresetOptions } from "./compare.js";
export type { GradientPresetOptions } from "./gradient.js";
export type { MinimalPresetOptions } from "./minimal.js";
export type { QuotePresetOptions } from "./quote.js";
export type { SolidPresetOptions } from "./solid.js";
export type { SplitPresetOptions } from "./split.js";
export type { TerminalPresetOptions } from "./terminal.js";

export const presets = {
  announcement,
  checkerboard,
  compare,
  gradient,
  minimal,
  quote,
  solid,
  split,
  terminal,
};

export const presetMetadata = [
  {
    name: "announcement",
    description: "Launch or event announcement image with badge, meta, subtitle, and CTA.",
  },
  {
    name: "checkerboard",
    description: "Bold checkerboard-pattern image with title, optional label, and subtitle.",
  },
  {
    name: "compare",
    description: "Two-column before-and-after image for comparisons and migrations.",
  },
  {
    name: "gradient",
    description: "Gradient social image with title, optional subtitle, and accent glow.",
  },
  {
    name: "minimal",
    description: "Minimal editorial image with restrained typography and optional metadata.",
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
