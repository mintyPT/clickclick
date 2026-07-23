import { mkdir, readFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { PNG } from "pngjs";
import { ClickClickError } from "../errors.js";
import { renderImage } from "../renderer/index.js";
import type { ImageFormat, RenderImageResult, RenderOutputOptions } from "../types.js";

export interface ContactSheetImageInput {
  path: string;
  label?: string;
}

export interface ContactSheetInput {
  images: ContactSheetImageInput[];
  output?: RenderOutputOptions;
  columns?: number;
  spacing?: number;
  padding?: number;
  background?: string;
  textColor?: string;
  tileWidth?: number;
  tileHeight?: number;
}

interface PreparedContactSheetImage {
  src: string;
  label?: string;
  width: number;
  height: number;
}

export async function createContactSheet(input: ContactSheetInput): Promise<RenderImageResult> {
  if (!input.images.length) {
    throw new ClickClickError("INVALID_INPUT", "At least one image is required for a contact sheet.");
  }

  const spacing = positiveInteger(input.spacing, "spacing") ?? 4;
  const padding = positiveInteger(input.padding, "padding") ?? 4;
  const columns = positiveInteger(input.columns, "columns") ?? Math.min(3, input.images.length);
  const prepared = await Promise.all(input.images.map(prepareImage));
  const tileWidth = positiveInteger(input.tileWidth, "tileWidth") ?? Math.max(...prepared.map((image) => image.width));
  const tileHeight = positiveInteger(input.tileHeight, "tileHeight") ?? Math.max(...prepared.map((image) => image.height));
  const hasLabels = prepared.some((image) => image.label);
  const labelHeight = hasLabels ? 24 : 0;
  const rows = Math.ceil(prepared.length / columns);
  const width = padding * 2 + columns * tileWidth + Math.max(0, columns - 1) * spacing;
  const height = padding * 2 + rows * (tileHeight + labelHeight) + Math.max(0, rows - 1) * spacing;

  if (input.output?.path) {
    await mkdir(dirname(resolve(input.output.path)), { recursive: true });
  }

  return renderImage({
    document: {
      html: contactSheetHtml(prepared, { columns, spacing, padding, tileWidth, tileHeight, labelHeight, background: input.background ?? "#222222", textColor: input.textColor ?? "#f8fafc" }),
    },
    viewport: { width, height },
    output: input.output,
  });
}

async function prepareImage(input: ContactSheetImageInput): Promise<PreparedContactSheetImage> {
  const path = resolve(input.path);
  const buffer = await readFile(path).catch((error) => {
    throw new ClickClickError("INVALID_INPUT", `Contact sheet image could not be read: ${path}`, error);
  });
  const format = imageFormat(path, buffer);
  const dimensions = imageDimensions(buffer, format);
  return {
    src: `data:image/${format};base64,${buffer.toString("base64")}`,
    label: input.label,
    width: dimensions.width,
    height: dimensions.height,
  };
}

function contactSheetHtml(images: PreparedContactSheetImage[], layout: {
  columns: number;
  spacing: number;
  padding: number;
  tileWidth: number;
  tileHeight: number;
  labelHeight: number;
  background: string;
  textColor: string;
}) {
  return `<!doctype html>
<html>
  <head>
    <style>
      html, body { margin: 0; width: 100%; height: 100%; background: ${cssString(layout.background)}; }
      .sheet {
        box-sizing: border-box;
        display: grid;
        grid-template-columns: repeat(${layout.columns}, ${layout.tileWidth}px);
        gap: ${layout.spacing}px;
        padding: ${layout.padding}px;
        width: 100%;
        min-height: 100%;
        background: ${cssString(layout.background)};
      }
      figure { margin: 0; width: ${layout.tileWidth}px; }
      .frame {
        width: ${layout.tileWidth}px;
        height: ${layout.tileHeight}px;
        display: grid;
        place-items: center;
        overflow: hidden;
        background: rgba(255,255,255,0.08);
      }
      img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
      figcaption {
        box-sizing: border-box;
        height: ${layout.labelHeight}px;
        padding-top: 5px;
        color: ${cssString(layout.textColor)};
        font: 11px/1.2 ui-sans-serif, system-ui, sans-serif;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      ${images.map((image) => `<figure><div class="frame"><img src="${image.src}" alt=""></div>${layout.labelHeight ? `<figcaption>${escapeHtml(image.label ?? "")}</figcaption>` : ""}</figure>`).join("")}
    </main>
  </body>
</html>`;
}

function imageFormat(path: string, buffer: Buffer): "png" | "jpeg" {
  const extension = extname(path).toLowerCase();
  if (extension === ".png") return "png";
  if (extension === ".jpg" || extension === ".jpeg") return "jpeg";
  if (buffer.subarray(1, 4).toString() === "PNG") return "png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "jpeg";
  throw new ClickClickError("INVALID_INPUT", "Contact sheet images must be PNG or JPEG files.");
}

function imageDimensions(buffer: Buffer, format: ImageFormat): { width: number; height: number } {
  if (format === "png") {
    const png = PNG.sync.read(buffer);
    return { width: png.width, height: png.height };
  }
  return jpegDimensions(buffer);
}

function jpegDimensions(buffer: Buffer): { width: number; height: number } {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) break;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (marker !== undefined && marker >= 0xc0 && marker <= 0xc3) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  throw new ClickClickError("INVALID_INPUT", "JPEG dimensions could not be read.");
}

function positiveInteger(value: number | undefined, label: string): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || value <= 0) {
    throw new ClickClickError("INVALID_INPUT", `${label} must be a positive integer.`);
  }
  return value;
}

function cssString(value: string): string {
  return value.replace(/[<>"']/g, "");
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
