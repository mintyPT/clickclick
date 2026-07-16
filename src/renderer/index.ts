import { dirname } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { ClickClickError } from "../errors.js";
import { runTextFitting } from "../fit-text/index.js";
import type { ClickClickRenderer, RenderImageInput, RenderImageOptions, RenderImageResult, RendererOptions } from "../types.js";
import { normalizeInput } from "./validation.js";

export async function renderImage(input: RenderImageInput, options: RenderImageOptions = {}): Promise<RenderImageResult> {
  normalizeInput(input);
  const renderer = await createRenderer(options);
  try {
    return await renderer.render(input);
  } finally {
    await renderer.close();
  }
}

export async function createRenderer(options: RendererOptions = {}): Promise<ClickClickRenderer> {
  const ownsBrowser = !options.browser;
  const browser = options.browser ?? await launchBrowser(options.launchOptions);

  return {
    async render(input) {
      const normalized = normalizeInput(input);
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
        const strictOverflow = warnings.find((warning) => warning.onOverflow === "error");
        if (strictOverflow) {
          throw new ClickClickError("TEXT_FIT_OVERFLOW", strictOverflow.message, strictOverflow);
        }

        const screenshotTarget = normalized.render?.selector
          ? await page.$(normalized.render.selector)
          : page;
        if (!screenshotTarget) {
          throw new ClickClickError("MISSING_SELECTOR", `No element matched selector: ${normalized.render?.selector}`, {
            selector: normalized.render?.selector,
          });
        }

        const buffer = await screenshotTarget.screenshot({
          type: normalized.output.format,
          quality: normalized.output.quality,
          omitBackground: normalized.output.omitBackground,
        });

        if (normalized.output.path) {
          await mkdir(dirname(normalized.output.path), { recursive: true });
          await writeFile(normalized.output.path, buffer);
        }

        return {
          buffer,
          format: normalized.output.format,
          width: normalized.viewport.width,
          height: normalized.viewport.height,
          path: normalized.output.path,
          warnings,
        };
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
