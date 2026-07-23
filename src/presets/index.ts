import { adaptive } from "./adaptive.js";
import { announcement } from "./announcement.js";
import { badgeGrid, brandAnnouncement, logoBackdrop, partnerCard, watermarkQuote } from "./brand.js";
import { checkerboard } from "./checkerboard.js";
import { compare } from "./compare.js";
import { gradient } from "./gradient.js";
import { minimal } from "./minimal.js";
import { caseStudy, editorialFeature, eventPoster, photoHero } from "./photo.js";
import { quote } from "./quote.js";
import { solid } from "./solid.js";
import { split } from "./split.js";
import { terminal } from "./terminal.js";
export type { AdaptivePresetOptions } from "./adaptive.js";
export type { AnnouncementPresetOptions } from "./announcement.js";
export type { BadgeGridPresetOptions, BrandAnnouncementPresetOptions, LogoBackdropPresetOptions, PartnerCardPresetOptions, WatermarkQuotePresetOptions } from "./brand.js";
export type { CheckerboardPresetOptions } from "./checkerboard.js";
export type { ComparePresetOptions } from "./compare.js";
export type { GradientPresetOptions } from "./gradient.js";
export type { MinimalPresetOptions } from "./minimal.js";
export type { CaseStudyPresetOptions, EditorialFeaturePresetOptions, EventPosterPresetOptions, PhotoHeroPresetOptions } from "./photo.js";
export type { QuotePresetOptions } from "./quote.js";
export type { SolidPresetOptions } from "./solid.js";
export type { SplitPresetOptions } from "./split.js";
export type { TerminalPresetOptions } from "./terminal.js";
export type { PresetBackgroundMediaOptions, PresetLogoOptions, PresetMediaOptions, PresetWatermarkOptions } from "./utils.js";
export type {
  LocalPresetConfig,
  LocalPresetOptionTarget,
  LocalPresetSchema,
  PresetOptionSchema,
  PresetOptionType,
  PresetSchema,
} from "./schema.js";

export const presets = {
  adaptive,
  announcement,
  brandAnnouncement,
  logoBackdrop,
  partnerCard,
  watermarkQuote,
  badgeGrid,
  checkerboard,
  compare,
  gradient,
  minimal,
  photoHero,
  editorialFeature,
  eventPoster,
  caseStudy,
  quote,
  solid,
  split,
  terminal,
};

export const presetMetadata = [
  {
    name: "adaptive",
    description: "Single adaptive template that rearranges typography and visual blocks for any output size.",
  },
  {
    name: "announcement",
    description: "Launch or event announcement image with badge, meta, subtitle, and CTA.",
  },
  {
    name: "brandAnnouncement",
    description: "Branded announcement image with logo corner and faint watermark mark.",
  },
  {
    name: "logoBackdrop",
    description: "Centered headline over a large logo watermark backdrop.",
  },
  {
    name: "partnerCard",
    description: "Two-logo partnership or integration announcement card.",
  },
  {
    name: "watermarkQuote",
    description: "Quote card with logo or text watermark treatment.",
  },
  {
    name: "badgeGrid",
    description: "Announcement card with repeated logo or badge pattern background.",
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
    name: "photoHero",
    description: "Photo-forward hero image with title, subtitle, label, and optional logo.",
  },
  {
    name: "editorialFeature",
    description: "Magazine-style feature image with cropped media panel and byline.",
  },
  {
    name: "eventPoster",
    description: "Event or launch poster with image backdrop, date block, and CTA.",
  },
  {
    name: "caseStudy",
    description: "Image-backed customer story card with quote, logo, and metric.",
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
