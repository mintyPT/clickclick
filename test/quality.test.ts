import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkImageQuality, checkRenderQuality } from "../src/index.js";

let tempDir: string;

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "clickclick-quality-"));
});

afterAll(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("quality gates", () => {
  it("passes identical baseline images and fails changed pixels", async () => {
    const baseline = join(tempDir, "baseline.png");
    const same = join(tempDir, "same.png");
    const changed = join(tempDir, "changed.png");

    await writePng(baseline, [0, 128, 255, 255]);
    await writePng(same, [0, 128, 255, 255]);
    await writePng(changed, [255, 128, 0, 255]);

    await expect(checkImageQuality({ actualPath: same, baselinePath: baseline })).resolves.toMatchObject({
      passed: true,
      diagnostics: [],
    });
    await expect(checkImageQuality({ actualPath: changed, baselinePath: baseline })).resolves.toMatchObject({
      passed: false,
      diagnostics: [{ code: "VISUAL_DIFF" }],
    });
  });

  it("checks rendered text overflow, contrast, safe area, and determinism", async () => {
    const result = await checkRenderQuality({
      document: {
        html: '<main><h1 id="title">Long headline that cannot fit</h1></main>',
        css: `
          html, body { margin: 0; }
          main { width: 120px; height: 80px; background: #fff; }
          h1 { margin: 0; width: 40px; height: 20px; overflow: hidden; color: #aaa; background: #fff; font: 16px sans-serif; }
        `,
      },
      viewport: { width: 120, height: 80 },
      textSelector: "h1",
      safeArea: { left: 48, top: 12, right: 12, bottom: 12 },
      deterministic: true,
    });

    expect(result.passed).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "TEXT_OVERFLOW",
      "LOW_CONTRAST",
      "SAFE_AREA_VIOLATION",
    ]);
  }, 90000);
});

async function writePng(path: string, rgba: [number, number, number, number]) {
  const png = new PNG({ width: 4, height: 4 });
  for (let offset = 0; offset < png.data.length; offset += 4) {
    png.data[offset] = rgba[0];
    png.data[offset + 1] = rgba[1];
    png.data[offset + 2] = rgba[2];
    png.data[offset + 3] = rgba[3];
  }
  await writeFile(path, PNG.sync.write(png));
  await expect(readFile(path)).resolves.toHaveProperty("length");
}
