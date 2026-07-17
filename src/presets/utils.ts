import { existsSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export const defaultSansFont =
  'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export const defaultMonoFont = '"SFMono-Regular", Consolas, "Liberation Mono", monospace';

export interface PresetBackgroundMediaOptions {
  src: string;
  fit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  position?: string;
  opacity?: number;
  overlay?: string;
}

export interface PresetLogoOptions {
  src: string;
  placement?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  size?: number;
  opacity?: number;
  alt?: string;
}

export interface PresetWatermarkOptions {
  src?: string;
  text?: string;
  placement?: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  opacity?: number;
  scale?: number;
  rotation?: number;
}

export interface PresetMediaOptions {
  background?: PresetBackgroundMediaOptions;
  logo?: PresetLogoOptions;
  watermark?: PresetWatermarkOptions;
}

export function renderPresetMedia(options: PresetMediaOptions | undefined, width: number, height: number): { html: string; css: string } {
  if (!options) return { html: "", css: "" };

  const html: string[] = [];
  const css: string[] = [];

  if (options.background) {
    const background = options.background;
    const backgroundSrc = serializeMediaSource(background.src);
    html.push('<div class="preset-media-background" aria-hidden="true"></div>');
    css.push(`
.preset-media-background {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image: url("${escapeCssString(backgroundSrc)}");
  background-size: ${background.fit ?? "cover"};
  background-position: ${escapeCssIdentifier(background.position ?? "center")};
  background-repeat: no-repeat;
  opacity: ${serializeOpacity(background.opacity, 1)};
}
.preset-media-background::after {
  content: "";
  position: absolute;
  inset: 0;
  background: ${background.overlay ?? "transparent"};
}`);
  }

  if (options.watermark?.src || options.watermark?.text) {
    const watermark = options.watermark;
    const placement = watermark.placement ?? "center";
    const transform = `${placementTransform(placement)} rotate(${serializeNumber(watermark.rotation, -360, 360, 0)}deg)`;
    if (watermark.src) {
      const watermarkSrc = serializeMediaSource(watermark.src);
      html.push('<img class="preset-media-watermark" alt="" aria-hidden="true" />');
      css.push(`
.preset-media-watermark {
  position: absolute;
  ${placementInset(placement, width, height)}
  z-index: 1;
  width: ${Math.round(width * serializeNumber(watermark.scale, 0.05, 2, 0.48))}px;
  max-height: ${Math.round(height * 0.72)}px;
  object-fit: contain;
  opacity: ${serializeOpacity(watermark.opacity, 0.16)};
  transform: ${transform};
  content: url("${escapeCssString(watermarkSrc)}");
}`);
    } else if (watermark.text) {
      html.push(`<div class="preset-media-watermark-text" aria-hidden="true">${escapeHtml(watermark.text)}</div>`);
      css.push(`
.preset-media-watermark-text {
  position: absolute;
  ${placementInset(placement, width, height)}
  z-index: 1;
  max-width: ${Math.round(width * 0.86)}px;
  color: currentColor;
  font-size: ${Math.round(width * serializeNumber(watermark.scale, 0.05, 1, 0.14))}px;
  font-weight: 900;
  line-height: 1;
  opacity: ${serializeOpacity(watermark.opacity, 0.12)};
  transform: ${transform};
  white-space: nowrap;
}`);
    }
  }

  if (options.logo) {
    const logo = options.logo;
    html.push(`<img class="preset-media-logo" src="${escapeHtml(serializeMediaSource(logo.src))}" alt="${escapeHtml(logo.alt ?? "")}" />`);
    css.push(`
.preset-media-logo {
  position: absolute;
  ${cornerInset(logo.placement ?? "top-right", width, height)}
  z-index: 3;
  width: ${Math.round(logo.size ?? width * 0.1)}px;
  max-height: ${Math.round(height * 0.16)}px;
  object-fit: contain;
  opacity: ${serializeOpacity(logo.opacity, 1)};
}`);
  }

  return { html: html.join("\n      "), css: css.join("\n") };
}

export function serializeMediaSource(src: string, baseDir?: string): string {
  if (/^file:/i.test(src)) return serializeMediaFilePath(fileURLToPath(src));
  if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(src)) return src;
  const path = resolveExistingMediaPath(src, baseDir);
  return serializeMediaFilePath(path);
}

function serializeMediaFilePath(path: string): string {
  if (!existsSync(path)) return pathToFileURL(path).href;
  const mimeType = mimeTypeForPath(path);
  return `data:${mimeType};base64,${readFileSync(path).toString("base64")}`;
}

function resolveExistingMediaPath(src: string, baseDir: string | undefined): string {
  const cwdPath = resolve(src);
  if (existsSync(cwdPath)) return cwdPath;
  if (baseDir) {
    const basePath = resolve(baseDir, src);
    if (existsSync(basePath)) return basePath;
  }
  return cwdPath;
}

function mimeTypeForPath(path: string): string {
  switch (extname(path).toLowerCase()) {
    case ".apng":
      return "image/apng";
    case ".avif":
      return "image/avif";
    case ".gif":
      return "image/gif";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

function escapeCssString(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "\\a ");
}

function escapeCssIdentifier(value: string): string {
  return value.replaceAll(";", "").replaceAll("{", "").replaceAll("}", "");
}

function serializeOpacity(value: number | undefined, fallback: number): number {
  return serializeNumber(value, 0, 1, fallback);
}

function serializeNumber(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function cornerInset(placement: NonNullable<PresetLogoOptions["placement"]>, width: number, height: number): string {
  const x = Math.round(width * 0.06);
  const y = Math.round(height * 0.07);
  return placement.includes("top") ? `${placement.includes("left") ? "left" : "right"}: ${x}px; top: ${y}px;` : `${placement.includes("left") ? "left" : "right"}: ${x}px; bottom: ${y}px;`;
}

function placementInset(placement: NonNullable<PresetWatermarkOptions["placement"]>, width: number, height: number): string {
  if (placement === "center") return "left: 50%; top: 50%;";
  return cornerInset(placement, width, height);
}

function placementTransform(placement: NonNullable<PresetWatermarkOptions["placement"]>): string {
  return placement === "center" ? "translate(-50%, -50%)" : "translate(0, 0)";
}
