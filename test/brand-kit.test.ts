import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyBrandToPresetOptions, loadBrandKit, presets, renderRecipe, renderTemplate } from "../src/index.js";
import type { BrandKit } from "../src/index.js";

let tempDir: string;

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "clickclick-brand-"));
});

afterAll(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("brand kits", () => {
  it("applies brand defaults while preserving explicit preset options", () => {
    const brand: BrandKit = {
      colors: {
        background: "#101820",
        text: "#fefefe",
        accent: "#ffcc00",
        gradientFrom: "#111111",
        gradientTo: "#222222",
      },
      typography: { fontFamily: "Inter, sans-serif", monoFontFamily: "JetBrains Mono, monospace" },
      logos: { primary: { src: "data:image/svg+xml,%3Csvg%3E%3C/svg%3E", placement: "bottom-left" } },
      defaults: { align: "left" },
    };

    expect(applyBrandToPresetOptions({ title: "Launch", brand })).toMatchObject({
      backgroundColor: "#101820",
      textColor: "#fefefe",
      accentColor: "#ffcc00",
      fontFamily: "Inter, sans-serif",
      align: "left",
      logo: { placement: "bottom-left" },
    });
    expect(applyBrandToPresetOptions({ title: "Launch", brand, backgroundColor: "#ffffff", accentColor: "#000000" })).toMatchObject({
      backgroundColor: "#ffffff",
      accentColor: "#000000",
    });
  });

  it("lets presets consume brand objects from library calls", () => {
    const input = presets.solid({
      title: "Brand",
      brand: {
        colors: { background: "#123456", text: "#ffffff", accent: "#abcdef" },
        typography: { fontFamily: "Inter, sans-serif" },
      },
    });

    expect(input.document.css).toContain("background: #123456");
    expect(input.document.css).toContain("#abcdef");
    expect(input.document.css).toContain("Inter, sans-serif");
  });

  it("validates missing local logo and font sources", async () => {
    const brandPath = join(tempDir, "missing-assets.brand.json");
    await writeFile(brandPath, JSON.stringify({
      fonts: { body: { family: "Missing", source: "./missing.woff2" } },
      logos: { primary: { src: "./missing.svg" } },
    }));

    await expect(loadBrandKit(brandPath)).rejects.toMatchObject({
      code: "INVALID_INPUT",
      message: expect.stringContaining("Font source could not be read"),
    });
  });

  it("injects brand CSS variables, fonts, and template layer defaults before recipe overrides", async () => {
    const fontPath = join(tempDir, "brand.woff2");
    const configPath = join(tempDir, "clickclick.config.json");
    const out = join(tempDir, "brand-recipe.png");
    await writeFile(fontPath, "font-bytes");
    await writeFile(configPath, JSON.stringify({
      brand: {
        colors: { background: "#ff0000", text: "#ffffff", accent: "#00ff00" },
        fonts: { body: { family: "Brand Sans", source: fontPath } },
        templateLayers: { card: { background: "var(--clickclick-color-background)" } },
      },
      templates: {
        card: {
          html: '<main data-layer="card">Brand</main>',
          css: "html,body,main{margin:0;width:100%;height:100%;background:#000}",
        },
      },
      recipes: {
        card: {
          template: "card",
          output: { path: out, width: 32, height: 32 },
          modifications: [{ name: "card", background: "#0000ff" }],
        },
      },
    }));

    const result = await renderRecipe(configPath, "card");

    expect(result.path).toBe(out);
    expect([...PNG.sync.read(await readFile(out)).data.subarray(0, 3)]).toEqual([0, 0, 255]);

    const template = await renderTemplate({
      brand: {
        colors: { background: "#00ff00" },
        fonts: { body: { family: "Brand Sans", source: fontPath } },
        templateLayers: { card: { background: "var(--clickclick-color-background)" } },
      },
      html: '<main data-layer="card">Brand</main>',
      css: "html,body,main{margin:0;width:100%;height:100%;background:#000}",
      viewport: { width: 32, height: 32 },
    });
    expect([...PNG.sync.read(template.buffer).data.subarray(0, 3)]).toEqual([0, 255, 0]);
  });
});
