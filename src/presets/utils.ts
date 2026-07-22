import { serializeMediaSource } from "../media/index.js";
import { escapeHtml } from "../preset-document/index.js";

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
