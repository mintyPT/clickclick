import type { Browser, LaunchOptions, Page } from "playwright";

export type ImageFormat = "png" | "jpeg";
export type WaitUntil = "load" | "domcontentloaded" | "networkidle" | "commit";
export type TextFitOverflowMode = "warn" | "error";

export interface ViewportSize {
  width: number;
  height: number;
}

export interface RenderDocumentInput {
  html: string;
  css?: string;
  baseUrl?: string;
}

export interface RenderOutputOptions {
  path?: string;
  format?: ImageFormat;
  quality?: number;
  omitBackground?: boolean;
}

export interface RenderLifecycleOptions {
  selector?: string;
  waitUntil?: WaitUntil;
  delayMs?: number;
  beforeScreenshot?: (page: Page) => Promise<void> | void;
}

export interface FitTextTarget {
  selector: string;
  minFontSize?: number;
  maxFontSize?: number;
  onOverflow?: TextFitOverflowMode;
}

export interface RenderImageInput {
  document: RenderDocumentInput;
  viewport?: Partial<ViewportSize>;
  output?: RenderOutputOptions;
  render?: RenderLifecycleOptions;
  fitText?: FitTextTarget[];
}

export interface ScreenshotUrlLifecycleOptions extends RenderLifecycleOptions {
  fullPage?: boolean;
}

export interface ScreenshotUrlInput {
  url: string;
  viewport?: Partial<ViewportSize>;
  output?: RenderOutputOptions;
  render?: ScreenshotUrlLifecycleOptions;
  locale?: string;
}

export interface RendererOptions {
  browser?: Browser;
  launchOptions?: LaunchOptions;
  fonts?: FontRegistryEntry[];
  cache?: RenderCacheOptions;
}

export interface RenderImageOptions extends RendererOptions {}

export interface ScreenshotUrlOptions extends RendererOptions {}

export interface TextFitWarning {
  code: "TEXT_FIT_OVERFLOW";
  message: string;
  selector: string;
  text: string;
  onOverflow: TextFitOverflowMode;
  minFontSize: number;
  widthOverflow: boolean;
  heightOverflow: boolean;
}

export interface TemplateWarning {
  code: "MISSING_LAYER" | "DUPLICATE_LAYER";
  message: string;
  layer: string;
}

export type RenderWarning = TextFitWarning | TemplateWarning;

export interface RenderImageResult {
  buffer: Buffer;
  format: ImageFormat;
  width: number;
  height: number;
  path?: string;
  warnings: RenderWarning[];
  cache?: RenderCacheInfo;
}

export interface ClickClickRenderer {
  render(input: RenderImageInput): Promise<RenderImageResult>;
  screenshotUrl(input: ScreenshotUrlInput): Promise<RenderImageResult>;
  close(): Promise<void>;
}

export type RenderCacheOptions = boolean | {
  dir?: string;
  info?: boolean;
  keyParts?: unknown;
};

export interface RenderCacheInfo {
  hit: boolean;
  key?: string;
  dir?: string;
  skippedReason?: "disabled" | "beforeScreenshot";
}

export interface FontRegistryEntry {
  family: string;
  source: string | string[];
  weight?: string | number;
  style?: string;
  display?: "auto" | "block" | "swap" | "fallback" | "optional";
}

export type LayerEffect =
  | "grayscale"
  | "sepia"
  | "blur"
  | "grayscale-blur"
  | "flip-horizontal"
  | "flip-vertical"
  | "invert"
  | "negate";

export interface LayerModification {
  name: string;
  text?: string;
  html?: string;
  src?: string;
  image_url?: string;
  color?: string;
  background?: string;
  font_family?: string;
  alignment?: "left" | "center" | "right" | "justify";
  hide?: boolean;
  show?: boolean;
  style?: Record<string, string | number>;
  className?: string;
  attributes?: Record<string, string | number | boolean | null>;
  x?: number;
  y?: number;
  border?: string;
  shadow?: string;
  effect?: LayerEffect;
  fit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  anchor?: string;
}

export interface TemplateInput {
  html?: string;
  css?: string;
  htmlPath?: string;
  cssPath?: string;
  baseUrl?: string;
  modifications?: LayerModification[];
  fonts?: FontRegistryEntry[];
  onMissingLayer?: "warn" | "error" | "ignore";
  onDuplicateLayer?: "warn" | "error" | "ignore";
  debugDir?: string;
  viewport?: Partial<ViewportSize>;
  output?: RenderOutputOptions;
  render?: RenderLifecycleOptions;
  fitText?: FitTextTarget[];
  cache?: RenderCacheOptions;
}

export interface TemplateRecipe {
  template: string;
  output?: RenderOutputOptions & { width?: number; height?: number };
  modifications?: LayerModification[];
}

export interface TemplateSetItem extends TemplateRecipe {
  name: string;
}

export interface ClickClickConfig {
  templates?: Record<string, Omit<TemplateInput, "output" | "viewport">>;
  recipes?: Record<string, TemplateRecipe>;
  templateSets?: Record<string, TemplateSetItem[]>;
  fonts?: FontRegistryEntry[];
}
