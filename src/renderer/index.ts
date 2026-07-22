import { dirname } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import type { Page } from "playwright";
import { chromium } from "playwright";
import { createCacheKey, readCachedResult, resolveRenderCacheOptions, writeCachedResult } from "../cache/index.js";
import { ClickClickError } from "../errors.js";
import { runTextFitting } from "../fit-text/index.js";
import type {
  ClickClickRenderer,
  ImageFormat,
  RenderImageInput,
  RenderImageOptions,
  RenderImageResult,
  RenderWarning,
  RendererOptions,
  ScreenshotUrlInput,
  ScreenshotUrlOptions,
  ViewportSize,
} from "../types.js";
import { normalizeInput, normalizeScreenshotUrlInput } from "./validation.js";

export async function renderImage(input: RenderImageInput, options: RenderImageOptions = {}): Promise<RenderImageResult> {
  normalizeInput(input);
  const renderer = await createRenderer(options);
  try {
    return await renderer.render(input);
  } finally {
    await renderer.close();
  }
}

export async function screenshotUrl(input: ScreenshotUrlInput, options: ScreenshotUrlOptions = {}): Promise<RenderImageResult> {
  normalizeScreenshotUrlInput(input);
  const renderer = await createRenderer(options);
  try {
    return await renderer.screenshotUrl(input);
  } finally {
    await renderer.close();
  }
}

export async function createRenderer(options: RendererOptions = {}): Promise<ClickClickRenderer> {
  const ownsBrowser = !options.browser;
  const browser = options.browser ?? await launchBrowser(options.launchOptions);
  const cache = resolveRenderCacheOptions(options.cache);

  return {
    async render(input) {
      const normalized = normalizeInput(input);
      const cacheKey = cache && (!normalized.render?.beforeScreenshot || cache.keyParts !== undefined)
        ? createRenderCacheKey(normalized, cache.keyParts)
        : undefined;

      if (cache && cacheKey) {
        const cached = await readCachedResult(cache, cacheKey, normalized.output.path);
        if (cached) {
          if (normalized.output.path) {
            await writeOutput(normalized.output.path, cached.buffer);
          }
          return cached;
        }
      }

      const context = await browser.newContext({
        viewport: normalized.viewport,
        deviceScaleFactor: 1,
        baseURL: normalized.document.baseUrl,
      });

      try {
        const page = await context.newPage();
        const html = normalized.document.css
          ? `${normalized.document.html}<style data-clickclick-css>${normalized.document.css}</style>`
          : normalized.document.html;

        await page.setContent(html, {
          waitUntil: normalized.render?.waitUntil ?? "load",
        });
        await page.evaluate(() => document.fonts?.ready);

        if (normalized.render?.delayMs) {
          await page.waitForTimeout(normalized.render.delayMs);
        }
        if (normalized.render?.beforeScreenshot) {
          await normalized.render.beforeScreenshot(page);
        }

        const warnings = await runTextFitting(page, normalized.fitText);
        const strictOverflow = warnings.find((warning) => warning.code === "TEXT_FIT_OVERFLOW" && warning.onOverflow === "error");
        if (strictOverflow) {
          throw new ClickClickError("TEXT_FIT_OVERFLOW", strictOverflow.message, strictOverflow);
        }

        const result = await captureScreenshot(page, {
          selector: normalized.render?.selector,
          output: normalized.output,
          viewport: normalized.viewport,
          warnings,
        });
        if (cache && cacheKey) {
          await writeCachedResult(cache, cacheKey, result);
          return { ...result, cache: { hit: false, key: cacheKey, dir: cache.dir } };
        }
        if (cache && !cacheKey) {
          return { ...result, cache: { hit: false, dir: cache.dir, skippedReason: "beforeScreenshot" } };
        }
        return result;
      } catch (error) {
        if (error instanceof ClickClickError) throw error;
        throw new ClickClickError("RENDER_FAILED", error instanceof Error ? error.message : "Rendering failed.", error);
      } finally {
        await context.close();
      }
    },
    async screenshotUrl(input) {
      const normalized = normalizeScreenshotUrlInput(input);
      const context = await browser.newContext({
        viewport: normalized.viewport,
        deviceScaleFactor: 1,
        locale: normalized.locale,
      });

      try {
        const page = await context.newPage();
        await page.goto(normalized.url, {
          waitUntil: normalized.render?.waitUntil ?? "load",
        });
        await page.evaluate(() => document.fonts?.ready);

        if (normalized.render?.delayMs) {
          await page.waitForTimeout(normalized.render.delayMs);
        }
        if (normalized.render?.beforeScreenshot) {
          await normalized.render.beforeScreenshot(page);
        }

        return await captureScreenshot(page, {
          selector: normalized.render?.selector,
          fullPage: normalized.render?.fullPage,
          output: normalized.output,
          viewport: normalized.viewport,
          warnings: [],
        });
      } catch (error) {
        if (error instanceof ClickClickError) throw error;
        throw new ClickClickError("RENDER_FAILED", error instanceof Error ? error.message : "Rendering failed.", error);
      } finally {
        await context.close();
      }
    },
    async close() {
      if (ownsBrowser) {
        await browser.close();
      }
    },
  };
}

function createRenderCacheKey(normalized: ReturnType<typeof normalizeInput>, keyParts: unknown): string {
  return createCacheKey({
    document: normalized.document,
    viewport: normalized.viewport,
    output: {
      format: normalized.output.format,
      quality: normalized.output.quality,
      omitBackground: normalized.output.omitBackground,
    },
    render: {
      selector: normalized.render?.selector,
      waitUntil: normalized.render?.waitUntil,
      delayMs: normalized.render?.delayMs,
    },
    fitText: normalized.fitText,
    keyParts,
  });
}

async function captureScreenshot(page: Page, options: {
  selector?: string;
  fullPage?: boolean;
  output: {
    path?: string;
    format: ImageFormat;
    quality?: number;
    omitBackground?: boolean;
  };
  viewport: ViewportSize;
  warnings: RenderWarning[];
}): Promise<RenderImageResult> {
  const buffer = options.selector
    ? await screenshotElement(page, options.selector, options.output)
    : await page.screenshot({
      type: options.output.format,
      quality: options.output.quality,
      omitBackground: options.output.omitBackground,
      fullPage: options.fullPage,
    });

  if (options.output.path) {
    await writeOutput(options.output.path, buffer);
  }

  return {
    buffer,
    format: options.output.format,
    width: options.viewport.width,
    height: options.viewport.height,
    path: options.output.path,
    warnings: options.warnings,
  };
}

async function writeOutput(path: string, buffer: Buffer): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, buffer);
}

async function screenshotElement(page: Page, selector: string, output: {
  format: ImageFormat;
  quality?: number;
  omitBackground?: boolean;
}) {
  const element = await page.$(selector);
  if (!element) {
    throw new ClickClickError("MISSING_SELECTOR", `No element matched selector: ${selector}`, {
      selector,
    });
  }

  return await element.screenshot({
    type: output.format,
    quality: output.quality,
    omitBackground: output.omitBackground,
  });
}

async function launchBrowser(launchOptions: RendererOptions["launchOptions"]) {
  try {
    return await chromium.launch({ headless: true, ...launchOptions });
  } catch (error) {
    throw new ClickClickError(
      "BROWSER_LAUNCH_FAILED",
      "Chromium could not be launched. Run `npx playwright install chromium` and ensure required system dependencies are installed.",
      error,
    );
  }
}
