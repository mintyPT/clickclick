import { extname } from "node:path";
import { ClickClickError } from "../errors.js";
import { DEFAULT_VIEWPORT } from "../shared/sizes.js";
import type { ImageFormat, RenderImageInput, ViewportSize } from "../types.js";

export interface NormalizedRenderInput extends RenderImageInput {
  viewport: ViewportSize;
  output: {
    path?: string;
    format: ImageFormat;
    quality?: number;
    omitBackground?: boolean;
  };
}

export function normalizeInput(input: RenderImageInput): NormalizedRenderInput {
  if (!input || typeof input !== "object") {
    throw new ClickClickError("INVALID_INPUT", "Render input must be an object.");
  }
  if (!input.document || typeof input.document.html !== "string" || input.document.html.length === 0) {
    throw new ClickClickError("INVALID_INPUT", "document.html is required.");
  }

  const width = input.viewport?.width ?? DEFAULT_VIEWPORT.width;
  const height = input.viewport?.height ?? DEFAULT_VIEWPORT.height;
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new ClickClickError("INVALID_INPUT", "viewport.width and viewport.height must be positive integers.");
  }

  const format = input.output?.format ?? inferFormat(input.output?.path);
  const quality = input.output?.quality;
  if (quality !== undefined && (format !== "jpeg" || !Number.isInteger(quality) || quality < 0 || quality > 100)) {
    throw new ClickClickError("INVALID_INPUT", "output.quality is only valid for JPEG and must be an integer from 0 to 100.");
  }
  if (format === "jpeg" && input.output?.omitBackground) {
    throw new ClickClickError("INVALID_INPUT", "output.omitBackground is only supported for PNG.");
  }

  return {
    ...input,
    viewport: { width, height },
    output: {
      path: input.output?.path,
      format,
      quality,
      omitBackground: input.output?.omitBackground,
    },
  };
}

function inferFormat(path?: string): ImageFormat {
  const extension = path ? extname(path).toLowerCase() : "";
  if (extension === ".jpg" || extension === ".jpeg") return "jpeg";
  return "png";
}
