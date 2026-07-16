import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ClickClickError, renderImage } from "../src/index.js";

let tempDir: string;

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "clickclick-"));
});

afterAll(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("browser rendering", () => {
  it("renders a PNG buffer and verifies a stable background pixel", async () => {
    const result = await renderImage({
      document: {
        html: "<main></main>",
        css: "html,body,main{margin:0;width:100%;height:100%;background:#ff0000;}",
      },
      viewport: { width: 64, height: 64 },
    });

    expect(result.buffer.subarray(1, 4).toString()).toBe("PNG");
    const png = PNG.sync.read(result.buffer);
    expect([...png.data.subarray(0, 3)]).toEqual([255, 0, 0]);
  });

  it("writes a JPEG file", async () => {
    const path = join(tempDir, "card.jpeg");
    const result = await renderImage({
      document: {
        html: "<main>JPEG</main>",
        css: "html,body{margin:0;background:#fff;color:#111;}",
      },
      viewport: { width: 80, height: 40 },
      output: { path, quality: 80 },
    });

    expect(result.format).toBe("jpeg");
    await expect(readFile(path)).resolves.toHaveLength(result.buffer.length);
  });

  it("reports missing selectors with a stable code", async () => {
    await expect(
      renderImage({
        document: { html: "<main>Hello</main>" },
        render: { selector: ".missing" },
      }),
    ).rejects.toMatchObject({ code: "MISSING_SELECTOR" satisfies ClickClickError["code"] });
  });

  it("shrinks marked text", async () => {
    const result = await renderImage({
      document: {
        html: '<div id="title" data-clickclick-fit data-clickclick-min-font-size="8">A very long headline that needs to shrink</div>',
        css: "#title{width:160px;height:30px;overflow:hidden;font-size:40px;white-space:nowrap;}",
      },
      viewport: { width: 240, height: 80 },
      render: {
        beforeScreenshot: async (page) => {
          await page.exposeFunction("captureFontSize", () => undefined).catch(() => undefined);
        },
      },
    });

    expect(result.warnings).toEqual([]);
  });

  it("warns or errors when fitted text still overflows", async () => {
    const warningResult = await renderImage({
      document: {
        html: '<div data-clickclick-fit data-clickclick-min-font-size="24">This text cannot fit in the box</div>',
        css: "div{width:30px;height:10px;overflow:hidden;font-size:48px;white-space:nowrap;}",
      },
      viewport: { width: 80, height: 40 },
    });

    expect(warningResult.warnings).toMatchObject([{ code: "TEXT_FIT_OVERFLOW", onOverflow: "warn" }]);

    await expect(
      renderImage({
        document: {
          html: '<div data-clickclick-fit data-clickclick-min-font-size="24" data-clickclick-on-overflow="error">This text cannot fit in the box</div>',
          css: "div{width:30px;height:10px;overflow:hidden;font-size:48px;white-space:nowrap;}",
        },
        viewport: { width: 80, height: 40 },
      }),
    ).rejects.toMatchObject({ code: "TEXT_FIT_OVERFLOW" satisfies ClickClickError["code"] });
  });
});
