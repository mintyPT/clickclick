import { extname } from "node:path";
import { ClickClickError } from "../errors.js";
import { DEFAULT_VIEWPORT } from "../shared/sizes.js";
import type { ImageFormat, RenderImageInput, RenderOutputOptions, ScreenshotUrlInput, ViewportSize } from "../types.js";

interface NormalizedOutputOptions {
  path?: string;
  format: ImageFormat;
  quality?: number;
  omitBackground?: boolean;
}

export interface NormalizedRenderInput extends RenderImageInput {
  viewport: ViewportSize;
  output: NormalizedOutputOptions;
}

export interface NormalizedScreenshotUrlInput extends ScreenshotUrlInput {
  viewport: ViewportSize;
  output: NormalizedOutputOptions;
  url: string;
}

export function normalizeInput(input: RenderImageInput): NormalizedRenderInput {
  if (!input || typeof input !== "object") {
    throw new ClickClickError("INVALID_INPUT", "Render input must be an object.");
  }
  if (!input.document || typeof input.document.html !== "string" || input.document.html.length === 0) {
    throw new ClickClickError("INVALID_INPUT", "document.html is required.");
  }

  return {
    ...input,
    viewport: normalizeViewport(input.viewport),
    output: normalizeOutput(input.output),
  };
}

export function normalizeScreenshotUrlInput(input: ScreenshotUrlInput): NormalizedScreenshotUrlInput {
  if (!input || typeof input !== "object") {
    throw new ClickClickError("INVALID_INPUT", "Screenshot URL input must be an object.");
  }
  if (typeof input.url !== "string" || input.url.length === 0) {
    throw new ClickClickError("INVALID_INPUT", "url is required.");
  }
  try {
    new URL(input.url);
  } catch {
    throw new ClickClickError("INVALID_INPUT", "url must be an absolute URL.");
  }
  if (input.render?.selector && input.render.fullPage) {
    throw new ClickClickError("INVALID_INPUT", "render.fullPage cannot be combined with render.selector.");
  }
  if (input.locale !== undefined && (typeof input.locale !== "string" || input.locale.length === 0)) {
    throw new ClickClickError("INVALID_INPUT", "locale must be a non-empty string.");
  }

  return {
    ...input,
    viewport: normalizeViewport(input.viewport),
    output: normalizeOutput(input.output),
  };
}

function normalizeViewport(viewport?: Partial<ViewportSize>): ViewportSize {
  const width = viewport?.width ?? DEFAULT_VIEWPORT.width;
  const height = viewport?.height ?? DEFAULT_VIEWPORT.height;
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new ClickClickError("INVALID_INPUT", "viewport.width and viewport.height must be positive integers.");
  }
  return { width, height };
}

function normalizeOutput(output?: RenderOutputOptions): NormalizedOutputOptions {
  const format = output?.format ?? inferFormat(output?.path);
  const quality = output?.quality;
  if (quality !== undefined && (format !== "jpeg" || !Number.isInteger(quality) || quality < 0 || quality > 100)) {
    throw new ClickClickError("INVALID_INPUT", "output.quality is only valid for JPEG and must be an integer from 0 to 100.");
  }
  if (format === "jpeg" && output?.omitBackground) {
    throw new ClickClickError("INVALID_INPUT", "output.omitBackground is only supported for PNG.");
  }

  return {
    path: output?.path,
    format,
    quality,
    omitBackground: output?.omitBackground,
  };
}

function inferFormat(path?: string): ImageFormat {
  const extension = path ? extname(path).toLowerCase() : "";
  if (extension === ".jpg" || extension === ".jpeg") return "jpeg";
  return "png";
}
