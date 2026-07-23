import { basename } from "node:path";
import qrcode from "qrcode-generator";
import { ClickClickError } from "../errors.js";
import { serializeMediaSource } from "../media/index.js";
import type { RenderImageInput } from "../types.js";

export interface CompositionImage {
  src: string;
  caption?: string;
}

export interface ImageGridOptions {
  images: CompositionImage[];
  columns?: number;
  width?: number;
  gap?: number;
  padding?: number;
  tileAspectRatio?: number;
  captionHeight?: number;
  background?: string;
  textColor?: string;
  baseDir?: string;
}

export interface QrCodeOptions {
  text: string;
  width?: number;
  padding?: number;
  caption?: string;
  background?: string;
  foreground?: string;
  textColor?: string;
}

export interface BarChartDatum {
  label: string;
  value: number;
}

export interface BarChartOptions {
  data: BarChartDatum[];
  title?: string;
  width?: number;
  height?: number;
  padding?: number;
  background?: string;
  barColor?: string;
  textColor?: string;
}

export function imageGrid(options: ImageGridOptions): RenderImageInput {
  const images = requireImages(options.images);
  const width = positiveInteger(options.width ?? 1200, "width");
  const columns = Math.min(positiveInteger(options.columns ?? Math.min(3, images.length), "columns"), images.length);
  const gap = nonNegativeInteger(options.gap ?? 24, "gap");
  const padding = nonNegativeInteger(options.padding ?? 48, "padding");
  const captionHeight = nonNegativeInteger(options.captionHeight ?? 48, "captionHeight");
  const tileWidth = Math.floor((width - padding * 2 - gap * (columns - 1)) / columns);
  if (tileWidth <= 0) throw new ClickClickError("INVALID_INPUT", "Image grid width is too small for the requested columns, gap, and padding.");
  const tileHeight = Math.round(tileWidth / positiveNumber(options.tileAspectRatio ?? 1, "tileAspectRatio"));
  const rows = Math.ceil(images.length / columns);
  const height = padding * 2 + rows * (tileHeight + captionHeight) + (rows - 1) * gap;
  const serialized = images.map((image) => ({
    src: serializeMediaSource(image.src, options.baseDir),
    caption: image.caption ?? basename(image.src).replace(/\.[^.]+$/, ""),
  }));

  return {
    document: {
      html: `<main class="image-grid">${serialized.map((image) => `
        <figure>
          <img src="${escapeAttribute(image.src)}" alt="${escapeAttribute(image.caption)}" />
          <figcaption>${escapeHtml(image.caption)}</figcaption>
        </figure>`).join("")}
      </main>`,
      css: `
        html, body { margin: 0; width: 100%; min-height: 100%; background: ${options.background ?? "#f6f4ef"}; }
        body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: ${options.textColor ?? "#1f2933"}; }
        .image-grid {
          box-sizing: border-box;
          width: ${width}px;
          min-height: ${height}px;
          display: grid;
          grid-template-columns: repeat(${columns}, ${tileWidth}px);
          gap: ${gap}px;
          padding: ${padding}px;
          background: ${options.background ?? "#f6f4ef"};
        }
        figure { margin: 0; width: ${tileWidth}px; }
        img {
          display: block;
          width: ${tileWidth}px;
          height: ${tileHeight}px;
          object-fit: cover;
          background: rgba(0, 0, 0, 0.08);
        }
        figcaption {
          box-sizing: border-box;
          height: ${captionHeight}px;
          padding-top: 10px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 16px;
          line-height: 22px;
          font-weight: 650;
        }
      `,
    },
    viewport: { width, height },
  };
}

export function collage(options: ImageGridOptions): RenderImageInput {
  const input = imageGrid(options);
  input.document.html = input.document.html.replace('class="image-grid"', 'class="image-grid collage"');
  return input;
}

export function qrCode(options: QrCodeOptions): RenderImageInput {
  if (!options.text) throw new ClickClickError("INVALID_INPUT", "QR code text is required.");
  const width = positiveInteger(options.width ?? 512, "width");
  const padding = nonNegativeInteger(options.padding ?? 24, "padding");
  const captionHeight = options.caption ? 38 : 0;
  const qr = qrcode(0, "M");
  qr.addData(options.text);
  qr.make();
  const moduleCount = qr.getModuleCount();
  const cellSize = Math.floor((width - padding * 2) / moduleCount);
  if (cellSize <= 0) throw new ClickClickError("INVALID_INPUT", "QR code width is too small for the encoded text.");
  const codeSize = cellSize * moduleCount;
  const height = width + captionHeight;
  const cells: string[] = [];
  for (let row = 0; row < moduleCount; row += 1) {
    for (let column = 0; column < moduleCount; column += 1) {
      cells.push(`<span class="qr-cell ${qr.isDark(row, column) ? "dark" : "light"}"></span>`);
    }
  }

  return {
    document: {
      html: `<main class="qr-code">
        <section class="qr-matrix" aria-label="${escapeAttribute(options.text)}">${cells.join("")}</section>
        ${options.caption ? `<p>${escapeHtml(options.caption)}</p>` : ""}
      </main>`,
      css: `
        html, body { margin: 0; width: 100%; min-height: 100%; background: ${options.background ?? "#ffffff"}; }
        body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: ${options.textColor ?? "#111827"}; }
        .qr-code {
          box-sizing: border-box;
          width: ${width}px;
          min-height: ${height}px;
          padding: ${padding}px;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: ${options.background ?? "#ffffff"};
        }
        .qr-matrix {
          display: grid;
          grid-template-columns: repeat(${moduleCount}, ${cellSize}px);
          width: ${codeSize}px;
          height: ${codeSize}px;
        }
        .qr-cell { width: ${cellSize}px; height: ${cellSize}px; }
        .qr-cell.dark { background: ${options.foreground ?? "#111827"}; }
        .qr-cell.light { background: ${options.background ?? "#ffffff"}; }
        p { margin: 14px 0 0; height: 24px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 18px; line-height: 24px; font-weight: 650; }
      `,
    },
    viewport: { width, height },
  };
}

export function barChart(options: BarChartOptions): RenderImageInput {
  const data = requireChartData(options.data);
  const width = positiveInteger(options.width ?? 1200, "width");
  const height = positiveInteger(options.height ?? 630, "height");
  const padding = nonNegativeInteger(options.padding ?? 48, "padding");
  const max = Math.max(...data.map((datum) => datum.value));

  return {
    document: {
      html: `<main class="bar-chart">
        ${options.title ? `<h1>${escapeHtml(options.title)}</h1>` : ""}
        <section class="bars">${data.map((datum) => {
          const percent = max === 0 ? 0 : Math.round((datum.value / max) * 100);
          return `<article class="bar-item">
            <div class="bar-track"><div class="bar-fill" style="height: ${percent}%"></div></div>
            <strong>${escapeHtml(String(datum.value))}</strong>
            <span>${escapeHtml(datum.label)}</span>
          </article>`;
        }).join("")}</section>
      </main>`,
      css: `
        html, body { margin: 0; width: 100%; height: 100%; background: ${options.background ?? "#ffffff"}; }
        body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: ${options.textColor ?? "#172033"}; }
        .bar-chart {
          box-sizing: border-box;
          width: ${width}px;
          height: ${height}px;
          padding: ${padding}px;
          display: flex;
          flex-direction: column;
          gap: 28px;
          background: ${options.background ?? "#ffffff"};
        }
        h1 { margin: 0; font-size: 34px; line-height: 1.15; letter-spacing: 0; }
        .bars { flex: 1; display: grid; grid-template-columns: repeat(${data.length}, minmax(0, 1fr)); gap: 22px; align-items: end; }
        .bar-item { min-width: 0; height: 100%; display: grid; grid-template-rows: 1fr 24px 24px; gap: 8px; text-align: center; }
        .bar-track { height: 100%; display: flex; align-items: end; background: rgba(23, 32, 51, 0.08); }
        .bar-fill { width: 100%; min-height: 2px; background: ${options.barColor ?? "#2563eb"}; }
        strong, span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        strong { font-size: 18px; line-height: 24px; }
        span { font-size: 15px; line-height: 24px; }
      `,
    },
    viewport: { width, height },
  };
}

function requireImages(images: CompositionImage[] | undefined): CompositionImage[] {
  if (!Array.isArray(images) || images.length === 0) throw new ClickClickError("INVALID_INPUT", "At least one image is required.");
  for (const image of images) {
    if (!image || typeof image.src !== "string" || image.src.length === 0) throw new ClickClickError("INVALID_INPUT", "Each image requires a src.");
  }
  return images;
}

function requireChartData(data: BarChartDatum[] | undefined): BarChartDatum[] {
  if (!Array.isArray(data) || data.length === 0) throw new ClickClickError("INVALID_INPUT", "At least one chart datum is required.");
  for (const datum of data) {
    if (!datum || typeof datum.label !== "string" || !Number.isFinite(datum.value) || datum.value < 0) {
      throw new ClickClickError("INVALID_INPUT", "Chart data must contain labels and non-negative numeric values.");
    }
  }
  return data;
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0) throw new ClickClickError("INVALID_INPUT", `${name} must be a positive integer.`);
  return value;
}

function nonNegativeInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0) throw new ClickClickError("INVALID_INPUT", `${name} must be a non-negative integer.`);
  return value;
}

function positiveNumber(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) throw new ClickClickError("INVALID_INPUT", `${name} must be a positive number.`);
  return value;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll("`", "&#96;");
}
