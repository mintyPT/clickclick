import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ClickClickError, presets, renderImage, screenshotUrl } from "../src/index.js";

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

  it("screenshots a URL selector", async () => {
    const url = toDataUrl(`
      <main>URL</main>
      <style>
        html,body{margin:0;background:#ffffff;}
        main{width:50px;height:40px;background:#0000ff;}
      </style>
    `);

    const result = await screenshotUrl({
      url,
      viewport: { width: 80, height: 60 },
      render: { selector: "main", waitUntil: "load" },
      output: { omitBackground: true },
      locale: "en-US",
    });

    expect(result.buffer.subarray(1, 4).toString()).toBe("PNG");
    const png = PNG.sync.read(result.buffer);
    expect(png.width).toBe(50);
    expect(png.height).toBe(40);
    expect([...png.data.subarray(0, 3)]).toEqual([0, 0, 255]);
  });

  it("screenshots the full URL page", async () => {
    const result = await screenshotUrl({
      url: toDataUrl("<main></main><style>html,body{margin:0;}main{height:140px;background:#00ff00;}</style>"),
      viewport: { width: 40, height: 50 },
      render: { fullPage: true },
    });

    const png = PNG.sync.read(result.buffer);
    expect(png.width).toBe(40);
    expect(png.height).toBe(140);
  });

  it("rejects URL full-page screenshots with a selector", async () => {
    await expect(
      screenshotUrl({
        url: toDataUrl("<main>Hello</main>"),
        render: { selector: "main", fullPage: true },
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" satisfies ClickClickError["code"] });
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

  it("renders local preset media assets passed by path", async () => {
    const assetPath = join(tempDir, "red.svg");
    await writeFile(assetPath, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#ff0000"/></svg>');

    const editorial = await renderImage({
      ...presets.editorialFeature({
        title: "Media",
        image: assetPath,
        width: 240,
        height: 126,
      }),
    });
    const editorialPng = PNG.sync.read(editorial.buffer);
    expect(rgbAt(editorialPng, 190, 40)).toEqual([255, 0, 0]);

    const badgeGrid = await renderImage({
      ...presets.badgeGrid({
        title: "Media",
        badgeLogo: assetPath,
        width: 600,
        height: 315,
      }),
    });
    const badgeGridPng = PNG.sync.read(badgeGrid.buffer);
    expect(rgbAt(badgeGridPng, 550, 50)[0]).toBeGreaterThan(40);
  });
});

function toDataUrl(html: string): string {
  return `data:text/html,${encodeURIComponent(html)}`;
}

function rgbAt(png: PNG, x: number, y: number): [number, number, number] {
  const index = (y * png.width + x) * 4;
  return [png.data[index]!, png.data[index + 1]!, png.data[index + 2]!];
}
