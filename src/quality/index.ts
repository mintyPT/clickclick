import { readFile } from "node:fs/promises";
import { PNG } from "pngjs";
import type { Page } from "playwright";
import { chromium } from "playwright";
import { ClickClickError } from "../errors.js";
import type {
  ImageQualityInput,
  QualityDiagnostic,
  QualityResult,
  RenderQualityInput,
  ViewportSize,
  VisualDiffOptions,
} from "../types.js";
import { normalizeInput } from "../renderer/validation.js";

const DEFAULT_MAX_PIXEL_DELTA = 12;

export async function checkImageQuality(input: ImageQualityInput): Promise<QualityResult> {
  const diagnostics = input.baselinePath ? await compareImageFiles(input.actualPath, input.baselinePath, input) : [];
  return toResult(diagnostics);
}

export async function checkRenderQuality(input: RenderQualityInput): Promise<QualityResult> {
  const normalized = normalizeInput(input);
  const browser = await chromium.launch({ headless: true });
  const diagnostics: QualityDiagnostic[] = [];

  try {
    const context = await browser.newContext({
      viewport: normalized.viewport,
      deviceScaleFactor: 1,
      baseURL: normalized.document.baseUrl,
    });
    try {
      const page = await context.newPage();
      await setRenderContent(page, normalized);

      diagnostics.push(...await inspectPageQuality(page, {
        viewport: normalized.viewport,
        safeArea: input.safeArea,
        textSelector: input.textSelector,
        minContrastRatio: input.minContrastRatio,
      }));

      const first = await page.screenshot({ type: "png", omitBackground: normalized.output.omitBackground });
      if (input.baselinePath) {
        diagnostics.push(...comparePngBuffers(first, await readFile(input.baselinePath), input));
      }
      if (input.deterministic) {
        const second = await page.screenshot({ type: "png", omitBackground: normalized.output.omitBackground });
        diagnostics.push(...comparePngBuffers(first, second, {
          ...input,
          maxDiffRatio: 0,
          maxPixelDelta: 0,
        }, "NON_DETERMINISTIC_RENDER"));
      }
    } finally {
      await context.close();
    }
  } catch (error) {
    if (error instanceof ClickClickError) throw error;
    throw new ClickClickError("RENDER_FAILED", error instanceof Error ? error.message : "Quality render failed.", error);
  } finally {
    await browser.close();
  }

  return toResult(diagnostics);
}

async function compareImageFiles(actualPath: string, baselinePath: string, options: VisualDiffOptions): Promise<QualityDiagnostic[]> {
  return comparePngBuffers(await readFile(actualPath), await readFile(baselinePath), options);
}

function comparePngBuffers(actualBuffer: Buffer, baselineBuffer: Buffer, options: VisualDiffOptions, code: "VISUAL_DIFF" | "NON_DETERMINISTIC_RENDER" = "VISUAL_DIFF"): QualityDiagnostic[] {
  const actual = PNG.sync.read(actualBuffer);
  const baseline = PNG.sync.read(baselineBuffer);
  if (actual.width !== baseline.width || actual.height !== baseline.height) {
    return [{
      code: "DIMENSION_MISMATCH",
      severity: "error",
      message: `Image dimensions differ: actual ${actual.width}x${actual.height}, baseline ${baseline.width}x${baseline.height}.`,
      details: {
        actual: { width: actual.width, height: actual.height },
        baseline: { width: baseline.width, height: baseline.height },
      },
    }];
  }

  const maxPixelDelta = options.maxPixelDelta ?? DEFAULT_MAX_PIXEL_DELTA;
  let changedPixels = 0;
  const totalPixels = actual.width * actual.height;
  for (let offset = 0; offset < actual.data.length; offset += 4) {
    const actualRed = actual.data[offset] ?? 0;
    const actualGreen = actual.data[offset + 1] ?? 0;
    const actualBlue = actual.data[offset + 2] ?? 0;
    const actualAlpha = actual.data[offset + 3] ?? 0;
    const baselineRed = baseline.data[offset] ?? 0;
    const baselineGreen = baseline.data[offset + 1] ?? 0;
    const baselineBlue = baseline.data[offset + 2] ?? 0;
    const baselineAlpha = baseline.data[offset + 3] ?? 0;
    const delta = Math.max(
      Math.abs(actualRed - baselineRed),
      Math.abs(actualGreen - baselineGreen),
      Math.abs(actualBlue - baselineBlue),
      Math.abs(actualAlpha - baselineAlpha),
    );
    if (delta > maxPixelDelta) changedPixels += 1;
  }

  const diffRatio = totalPixels === 0 ? 0 : changedPixels / totalPixels;
  const maxDiffRatio = options.maxDiffRatio ?? 0;
  if (diffRatio <= maxDiffRatio) return [];

  return [{
    code,
    severity: "error",
    message: code === "NON_DETERMINISTIC_RENDER"
      ? `Render is not deterministic: ${(diffRatio * 100).toFixed(3)}% of pixels changed between captures.`
      : `Visual diff exceeded threshold: ${(diffRatio * 100).toFixed(3)}% changed, allowed ${(maxDiffRatio * 100).toFixed(3)}%.`,
    details: { changedPixels, totalPixels, diffRatio, maxDiffRatio, maxPixelDelta },
  }];
}

async function setRenderContent(page: Page, input: ReturnType<typeof normalizeInput>) {
  const html = input.document.css
    ? `${input.document.html}<style data-clickclick-css>${input.document.css}</style>`
    : input.document.html;
  await page.setContent(html, { waitUntil: input.render?.waitUntil ?? "load" });
  await page.evaluate(() => document.fonts?.ready);
  if (input.render?.delayMs) await page.waitForTimeout(input.render.delayMs);
  if (input.render?.beforeScreenshot) await input.render.beforeScreenshot(page);
}

async function inspectPageQuality(page: Page, options: {
  viewport: ViewportSize;
  safeArea?: RenderQualityInput["safeArea"];
  textSelector?: string;
  minContrastRatio?: number;
}): Promise<QualityDiagnostic[]> {
  return await page.evaluate((serialized) => {
    type Color = { red: number; green: number; blue: number; alpha: number };
    type Item = {
      selector: string;
      text: string;
      rect: { x: number; y: number; width: number; height: number };
      overflowX: number;
      overflowY: number;
      contrastRatio: number | null;
      requiredContrastRatio: number;
    };

    const selector = serialized.textSelector || "body *";
    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
    const items: Item[] = [];

    for (const element of elements) {
      const text = (element.innerText || element.textContent || "").trim();
      if (!text || element.offsetParent === null) continue;
      const style = getComputedStyle(element);
      if (style.visibility === "hidden" || style.display === "none") continue;
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;

      const fontSize = Number.parseFloat(style.fontSize) || 16;
      const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;
      const isLargeText = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
      const foreground = parseColor(style.color);
      const background = findBackgroundColor(element);
      const contrastRatio = foreground && background ? contrast(foreground, background) : null;

      items.push({
        selector: describeElement(element),
        text,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        overflowX: Math.max(0, element.scrollWidth - element.clientWidth),
        overflowY: Math.max(0, element.scrollHeight - element.clientHeight),
        contrastRatio,
        requiredContrastRatio: serialized.minContrastRatio ?? (isLargeText ? 3 : 4.5),
      });
    }

    return items.flatMap((item) => {
      const diagnostics: QualityDiagnostic[] = [];
      if (item.overflowX > 1 || item.overflowY > 1) {
        diagnostics.push({
          code: "TEXT_OVERFLOW",
          severity: "error",
          selector: item.selector,
          message: `Text overflows ${item.selector}.`,
          details: { text: item.text, overflowX: item.overflowX, overflowY: item.overflowY, rect: item.rect },
        });
      }

      if (item.contrastRatio !== null && item.contrastRatio < item.requiredContrastRatio) {
        diagnostics.push({
          code: "LOW_CONTRAST",
          severity: "error",
          selector: item.selector,
          message: `Text contrast is ${item.contrastRatio.toFixed(2)}:1 for ${item.selector}; required ${item.requiredContrastRatio}:1.`,
          details: { text: item.text, contrastRatio: item.contrastRatio, requiredContrastRatio: item.requiredContrastRatio },
        });
      }

      const safe = serialized.safeArea;
      if (safe) {
        const left = safe.left ?? 0;
        const top = safe.top ?? 0;
        const right = serialized.viewport.width - (safe.right ?? 0);
        const bottom = serialized.viewport.height - (safe.bottom ?? 0);
        const violates = item.rect.x < left
          || item.rect.y < top
          || item.rect.x + item.rect.width > right
          || item.rect.y + item.rect.height > bottom;
        if (violates) {
          diagnostics.push({
            code: "SAFE_AREA_VIOLATION",
            severity: "error",
            selector: item.selector,
            message: `Text bounds for ${item.selector} exceed the configured safe area.`,
            details: { text: item.text, rect: item.rect, safeArea: safe },
          });
        }
      }
      return diagnostics;
    });

    function describeElement(element: HTMLElement): string {
      if (element.id) return `#${CSS.escape(element.id)}`;
      const layer = element.getAttribute("data-layer");
      if (layer) return `[data-layer="${cssString(layer)}"]`;
      if (element.getAttribute("data-clickclick-fit") !== null) return "[data-clickclick-fit]";
      const tag = element.tagName.toLowerCase();
      const className = Array.from(element.classList).slice(0, 2).map((part) => `.${CSS.escape(part)}`).join("");
      return `${tag}${className}`;
    }

    function cssString(value: string): string {
      return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    }

    function findBackgroundColor(element: HTMLElement): Color | null {
      let node: HTMLElement | null = element;
      while (node) {
        const parsed = parseColor(getComputedStyle(node).backgroundColor);
        if (parsed && parsed.alpha > 0.01) return blendOverWhite(parsed);
        node = node.parentElement;
      }
      return { red: 255, green: 255, blue: 255, alpha: 1 };
    }

    function parseColor(value: string): Color | null {
      const match = /^rgba?\(([^)]+)\)$/.exec(value);
      if (!match) return null;
      const parts = (match[1] ?? "").split(",").map((part) => part.trim());
      if (parts[0] === undefined || parts[1] === undefined || parts[2] === undefined) return null;
      const red = Number(parts[0]);
      const green = Number(parts[1]);
      const blue = Number(parts[2]);
      const alpha = parts[3] === undefined ? 1 : Number(parts[3]);
      if (![red, green, blue, alpha].every(Number.isFinite)) return null;
      return { red, green, blue, alpha };
    }

    function blendOverWhite(color: Color): Color {
      if (color.alpha >= 1) return color;
      return {
        red: color.red * color.alpha + 255 * (1 - color.alpha),
        green: color.green * color.alpha + 255 * (1 - color.alpha),
        blue: color.blue * color.alpha + 255 * (1 - color.alpha),
        alpha: 1,
      };
    }

    function contrast(first: Color, second: Color): number {
      const lighter = Math.max(luminance(first), luminance(second));
      const darker = Math.min(luminance(first), luminance(second));
      return (lighter + 0.05) / (darker + 0.05);
    }

    function luminance(color: Color): number {
      const [red = 0, green = 0, blue = 0] = [color.red, color.green, color.blue].map((channel) => {
        const value = channel / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    }
  }, options);
}

function toResult(diagnostics: QualityDiagnostic[]): QualityResult {
  return {
    passed: !diagnostics.some((diagnostic) => diagnostic.severity === "error"),
    diagnostics,
  };
}
