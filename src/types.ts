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

export interface RendererOptions {
  browser?: Browser;
  launchOptions?: LaunchOptions;
}

export interface RenderImageOptions extends RendererOptions {}

export interface RenderWarning {
  code: "TEXT_FIT_OVERFLOW";
  message: string;
  selector: string;
  text: string;
  onOverflow: TextFitOverflowMode;
  minFontSize: number;
  widthOverflow: boolean;
  heightOverflow: boolean;
}

export interface RenderImageResult {
  buffer: Buffer;
  format: ImageFormat;
  width: number;
  height: number;
  path?: string;
  warnings: RenderWarning[];
}

export interface ClickClickRenderer {
  render(input: RenderImageInput): Promise<RenderImageResult>;
  close(): Promise<void>;
}
