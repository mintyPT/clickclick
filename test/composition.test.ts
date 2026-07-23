import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { barChart, collage, contactSheet, imageGrid, qrCode } from "../src/index.js";

describe("composition library helpers", () => {
  it("builds an image grid document with deterministic layout, captions, spacing, and background", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "clickclick-composition-"));
    const imagePath = join(tempDir, "tile.png");
    await writeSolidPng(imagePath, [255, 0, 0, 255]);

    const input = imageGrid({
      images: [{ src: imagePath, caption: "Launch" }],
      columns: 1,
      width: 120,
      gap: 12,
      padding: 16,
      background: "#102030",
    });

    expect(input.viewport).toEqual({ width: 120, height: 168 });
    expect(input.document.css).toContain("gap: 12px");
    expect(input.document.css).toContain("background: #102030");
    expect(input.document.html).toContain("Launch");
    expect(input.document.html).toContain("data:image/png;base64,");
    expect(contactSheet({
      images: [{ src: imagePath, caption: "Launch" }],
      columns: 1,
      width: 120,
    }).document.html).toContain("Launch");
  });

  it("exposes collages as a named image-grid workflow", async () => {
    const input = collage({
      images: [
        { src: "data:image/svg+xml,%3Csvg%3E%3C/svg%3E", caption: "A" },
        { src: "data:image/svg+xml,%3Csvg%3E%3C/svg%3E", caption: "B" },
      ],
      columns: 2,
      width: 240,
    });

    expect(input.document.html).toContain("image-grid collage");
    expect(input.viewport?.width).toBe(240);
  });

  it("creates deterministic QR documents for short text and URLs", () => {
    const first = qrCode({ text: "https://github.com/mintyPT/clickclick", width: 160, caption: "Docs" });
    const second = qrCode({ text: "https://github.com/mintyPT/clickclick", width: 160, caption: "Docs" });

    expect(first).toEqual(second);
    expect(first.viewport).toEqual({ width: 160, height: 198 });
    expect(first.document.html).toContain("qr-cell dark");
    expect(first.document.html).toContain("Docs");
  });

  it("creates static bar chart documents from numeric data", () => {
    const input = barChart({
      title: "Campaign results",
      data: [
        { label: "A", value: 8 },
        { label: "B", value: 12 },
      ],
      width: 320,
      height: 220,
      background: "#ffffff",
    });

    expect(input.viewport).toEqual({ width: 320, height: 220 });
    expect(input.document.html).toContain("Campaign results");
    expect(input.document.html).toContain("height: 67%");
    expect(input.document.html).toContain("height: 100%");
  });
});

async function writeSolidPng(path: string, rgba: [number, number, number, number]) {
  const png = new PNG({ width: 8, height: 8 });
  for (let offset = 0; offset < png.data.length; offset += 4) {
    png.data[offset] = rgba[0];
    png.data[offset + 1] = rgba[1];
    png.data[offset + 2] = rgba[2];
    png.data[offset + 3] = rgba[3];
  }
  await writeFile(path, PNG.sync.write(png));
  await expect(readFile(path)).resolves.toHaveProperty("length");
}
