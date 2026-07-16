import type { RenderImageInput } from "../types.js";
import { sizes } from "../shared/sizes.js";
import { defaultSansFont, escapeHtml, serializeMediaSource } from "./utils.js";

export interface PresetSizeOptions {
  width?: number;
  height?: number;
}

export interface ResolvedPresetSize {
  width: number;
  height: number;
}

export interface PresetDocumentOptions {
  size: ResolvedPresetSize;
  html: string;
  css: string;
  fontFamily?: string;
  textColor?: string;
  bodyCss?: string;
}

export interface PresetTextLayerOptions {
  tag?: "h1" | "p" | "div" | "span" | "strong" | "blockquote";
  className?: string;
  fit?: boolean;
  minFontSize?: number;
  attributes?: Record<string, string | number | boolean>;
}

export function resolvePresetSize(options: PresetSizeOptions): ResolvedPresetSize {
  return { width: options.width ?? sizes.og.width, height: options.height ?? sizes.og.height };
}

export function renderPresetDocument(options: PresetDocumentOptions): RenderImageInput {
  const { size } = options;
  return {
    document: {
      html: `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>${options.html}
  </body>
</html>`,
      css: `
* { box-sizing: border-box; }
html, body { margin: 0; width: 100%; height: 100%; }
body {
  width: ${size.width}px;
  height: ${size.height}px;
  color: ${options.textColor ?? "#fff"};
  font-family: ${options.fontFamily ?? defaultSansFont};
  ${options.bodyCss ?? ""}
}
${options.css}
`,
    },
    viewport: size,
  };
}

export function textLayer(value: string | undefined, options: PresetTextLayerOptions = {}): string {
  if (!value) return "";
  const tag = options.tag ?? "div";
  const attrs = [
    options.className ? `class="${escapeHtml(options.className)}"` : "",
    options.fit ? "data-clickclick-fit" : "",
    options.minFontSize ? `data-clickclick-min-font-size="${options.minFontSize}"` : "",
    ...Object.entries(options.attributes ?? {}).map(([key, rawValue]) => {
      if (rawValue === false) return "";
      if (rawValue === true) return escapeHtml(key);
      return `${escapeHtml(key)}="${escapeHtml(String(rawValue))}"`;
    }),
  ].filter(Boolean).join(" ");
  return `<${tag}${attrs ? ` ${attrs}` : ""}>${escapeHtml(value)}</${tag}>`;
}

export function imageLayer(src: string | undefined, options: { className?: string; alt?: string; ariaHidden?: boolean } = {}): string {
  if (!src) return "";
  const attrs = [
    options.className ? `class="${escapeHtml(options.className)}"` : "",
    `src="${escapeHtml(serializeMediaSource(src))}"`,
    `alt="${escapeHtml(options.alt ?? "")}"`,
    options.ariaHidden ? 'aria-hidden="true"' : "",
  ].filter(Boolean).join(" ");
  return `<img ${attrs} />`;
}
