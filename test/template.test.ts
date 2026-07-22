import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { renderRecipe, renderTemplate, renderTemplateSet } from "../src/index.js";

let tempDir: string;

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "clickclick-template-"));
});

afterAll(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("template rendering", () => {
  it("renders named layers and applies common modifications", async () => {
    const result = await renderTemplate({
      html: '<main data-layer="card"><h1 data-layer="title">Old</h1><img data-layer="logo"></main>',
      css: "html,body,main{margin:0;width:100%;height:100%;background:#fff}h1{color:#000}",
      viewport: { width: 80, height: 40 },
      modifications: [
        { name: "card", background: "#00ff00" },
        { name: "title", text: "New", color: "#111", alignment: "center", x: 2, y: 3, effect: "grayscale" },
        { name: "logo", src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E", fit: "contain", anchor: "center" },
      ],
    });

    const png = PNG.sync.read(result.buffer);
    expect([...png.data.subarray(0, 3)]).toEqual([0, 255, 0]);
    expect(result.warnings).toEqual([]);
  });

  it("renders local image layer sources passed by path", async () => {
    const assetPath = join(tempDir, "template-red.svg");
    await writeFile(assetPath, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#ff0000"/></svg>');

    const result = await renderTemplate({
      html: '<main><img data-layer="hero" alt=""></main>',
      css: "html,body,main{margin:0;width:100%;height:100%;background:#000}img{width:100%;height:100%;object-fit:cover}",
      viewport: { width: 80, height: 40 },
      modifications: [{ name: "hero", src: assetPath }],
    });

    const png = PNG.sync.read(result.buffer);
    expect([...png.data.subarray(0, 3)]).toEqual([255, 0, 0]);
  });

  it("reports duplicate layers and can warn for missing layers", async () => {
    const result = await renderTemplate({
      html: '<div data-layer="title">A</div><div data-layer="title">B</div>',
      viewport: { width: 80, height: 40 },
      modifications: [{ name: "title", text: "Changed" }, { name: "missing", text: "Nope" }],
      onMissingLayer: "warn",
    });

    expect(result.warnings).toMatchObject([
      { code: "DUPLICATE_LAYER", layer: "title" },
      { code: "MISSING_LAYER", layer: "missing" },
    ]);
  });

  it("preserves template warnings on cache hits", async () => {
    const cacheDir = join(tempDir, "template-cache");
    const input = {
      html: '<div data-layer="title">A</div><div data-layer="title">B</div>',
      viewport: { width: 80, height: 40 },
      modifications: [{ name: "title", text: "Changed" }, { name: "missing", text: "Nope" }],
      onMissingLayer: "warn" as const,
      cache: { dir: cacheDir },
    };

    const first = await renderTemplate(input);
    const second = await renderTemplate(input);

    expect(first.cache).toMatchObject({ hit: false });
    expect(second.cache).toMatchObject({ hit: true });
    expect(second.warnings).toMatchObject([
      { code: "DUPLICATE_LAYER", layer: "title" },
      { code: "MISSING_LAYER", layer: "missing" },
    ]);
  });

  it("renders recipes and template sets from a config file", async () => {
    const htmlPath = join(tempDir, "recipe.html");
    const configPath = join(tempDir, "clickclick.config.json");
    const recipeOut = join(tempDir, "recipe.png");
    await writeFile(htmlPath, '<main data-layer="card"><h1 data-layer="title">Old</h1></main>');
    await writeFile(configPath, JSON.stringify({
      templates: {
        card: {
          htmlPath,
          css: "html,body,main{margin:0;width:100%;height:100%;background:#ffffff}",
        },
      },
      recipes: {
        hero: {
          template: "card",
          output: { path: recipeOut, width: 64, height: 64 },
          modifications: [{ name: "card", background: "#0000ff" }, { name: "title", text: "Hero" }],
        },
      },
      templateSets: {
        social: [
          { name: "square", template: "card", output: { width: 32, height: 32 }, modifications: [{ name: "card", background: "#ff0000" }] },
          { name: "wide", template: "card", output: { width: 64, height: 32 }, modifications: [{ name: "card", background: "#00ff00" }] },
        ],
      },
    }));

    const recipe = await renderRecipe(configPath, "hero");
    expect(recipe.path).toBe(recipeOut);
    await expect(readFile(recipeOut)).resolves.toHaveLength(recipe.buffer.length);

    const results = await renderTemplateSet(configPath, "social", tempDir);
    expect(results.map((result) => result.path)).toEqual([join(tempDir, "square.png"), join(tempDir, "wide.png")]);
  });

  it("writes a debug bundle", async () => {
    const debugDir = join(tempDir, "debug");
    await renderTemplate({
      html: '<main data-layer="title">Debug</main>',
      css: "main{color:red}",
      debugDir,
      viewport: { width: 40, height: 40 },
    });

    await expect(readFile(join(debugDir, "source.html"), "utf8")).resolves.toContain("Debug");
    await expect(readFile(join(debugDir, "manifest.json"), "utf8")).resolves.toContain("warnings");
  });
});
