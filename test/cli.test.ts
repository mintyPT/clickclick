import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execa } from "execa";
import { PNG } from "pngjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseSizeOptions } from "../src/cli/options.js";

let tempDir: string;

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "clickclick-cli-"));
});

afterAll(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("CLI", () => {
  it("lists presets", async () => {
    const result = await runCli(["preset", "list"]);

    expect(result.stdout).toContain("announcement");
    expect(result.stdout).toContain("brandAnnouncement");
    expect(result.stdout).toContain("logoBackdrop");
    expect(result.stdout).toContain("partnerCard");
    expect(result.stdout).toContain("watermarkQuote");
    expect(result.stdout).toContain("badgeGrid");
    expect(result.stdout).toContain("checkerboard");
    expect(result.stdout).toContain("compare");
    expect(result.stdout).toContain("gradient");
    expect(result.stdout).toContain("photoHero");
    expect(result.stdout).toContain("editorialFeature");
    expect(result.stdout).toContain("eventPoster");
    expect(result.stdout).toContain("caseStudy");
    expect(result.stdout).toContain("minimal");
    expect(result.stdout).toContain("quote");
    expect(result.stdout).toContain("solid");
    expect(result.stdout).toContain("split");
    expect(result.stdout).toContain("terminal");
  });

  it("renders raw HTML and the solid preset", async () => {
    const htmlPath = join(tempDir, "card.html");
    const cssPath = join(tempDir, "card.css");
    const rawOut = join(tempDir, "raw.png");
    const presetOut = join(tempDir, "preset.png");

    await writeFile(htmlPath, "<main>Hello</main>");
    await writeFile(cssPath, "html,body,main{margin:0;width:100%;height:100%;background:#00ff00;}");

    await runCli(["render", htmlPath, "--css", cssPath, "--out", rawOut, "--width", "64", "--height", "64"]);
    await runCli(["preset", "solid", "--title", "Hello", "--out", presetOut, "--width", "64", "--height", "64"]);

    await expect(readFile(rawOut)).resolves.toHaveProperty("length");
    await expect(readFile(presetOut)).resolves.toHaveProperty("length");
  });

  it("renders raw HTML to multiple deterministic output sizes", async () => {
    const htmlPath = join(tempDir, "multi-card.html");
    const outDir = join(tempDir, "multi-raw");

    await writeFile(htmlPath, "<main>Multi</main><style>html,body,main{margin:0;width:100%;height:100%;background:#00ff00;}</style>");

    const result = await runCli(["render", htmlPath, "--sizes", "64x64,96x48", "--out-dir", outDir]);

    const firstPath = join(outDir, "multi-card-64x64.png");
    const secondPath = join(outDir, "multi-card-96x48.png");
    expect(result.stdout).toContain(firstPath);
    expect(result.stdout).toContain(secondPath);
    expect(PNG.sync.read(await readFile(firstPath))).toMatchObject({ width: 64, height: 64 });
    expect(PNG.sync.read(await readFile(secondPath))).toMatchObject({ width: 96, height: 48 });
  });

  it("renders presets to named multi-size outputs", async () => {
    const outDir = join(tempDir, "multi-preset");

    const result = await runCli(["preset", "solid", "--title", "Hello", "--size", "og", "--size", "instagram-square", "--size", "linkedin", "--out-dir", outDir]);

    const ogPath = join(outDir, "solid-og.png");
    const squarePath = join(outDir, "solid-instagram-square.png");
    const linkedinPath = join(outDir, "solid-linkedin.png");
    expect(result.stdout).toContain(ogPath);
    expect(result.stdout).toContain(squarePath);
    expect(result.stdout).toContain(linkedinPath);
    expect(PNG.sync.read(await readFile(ogPath))).toMatchObject({ width: 1200, height: 630 });
    expect(PNG.sync.read(await readFile(squarePath))).toMatchObject({ width: 1080, height: 1080 });
    expect(PNG.sync.read(await readFile(linkedinPath))).toMatchObject({ width: 1200, height: 627 });
  });

  it("parses every built-in platform size name", () => {
    expect(parseSizeOptions({ sizes: "og,twitter-card,instagram-square,instagram-story,linkedin,youtube-thumb" })).toEqual([
      { label: "og", width: 1200, height: 630 },
      { label: "twitter-card", width: 1200, height: 675 },
      { label: "instagram-square", width: 1080, height: 1080 },
      { label: "instagram-story", width: 1080, height: 1920 },
      { label: "linkedin", width: 1200, height: 627 },
      { label: "youtube-thumb", width: 1280, height: 720 },
    ]);
  });

  it("rejects invalid named sizes with the built-in names in the error", () => {
    expect(() => parseSizeOptions({ size: ["facebook-post"] })).toThrow(
      "og, twitter-card, instagram-square, instagram-story, linkedin, youtube-thumb",
    );
  });

  it("renders templates to multiple sizes and reuses the cache per size", async () => {
    const htmlPath = join(tempDir, "multi-template.html");
    const outDir = join(tempDir, "multi-template-out");
    const cacheDir = join(tempDir, "multi-template-cache");

    await writeFile(htmlPath, '<main data-layer="card">Template</main><style>html,body,main{margin:0;width:100%;height:100%;background:#ff0000;}</style>');

    const args = [
      "template",
      htmlPath,
      "--modify-json",
      JSON.stringify({ name: "card", text: "Changed" }),
      "--size",
      "64x64",
      "--size",
      "96x48",
      "--out-dir",
      outDir,
      "--cache",
      "--cache-dir",
      cacheDir,
      "--cache-info",
    ];
    const miss = await runCli(args);
    const hit = await runCli(args);

    expect(miss.stderr).toContain("cache miss");
    expect(hit.stderr).toContain("cache hit");
    expect(PNG.sync.read(await readFile(join(outDir, "multi-template-64x64.png")))).toMatchObject({ width: 64, height: 64 });
    expect(PNG.sync.read(await readFile(join(outDir, "multi-template-96x48.png")))).toMatchObject({ width: 96, height: 48 });
  });

  it("generates one template output per JSON data object and named size", async () => {
    const htmlPath = join(tempDir, "generate-json.html");
    const dataPath = join(tempDir, "generate-json.json");
    const outDir = join(tempDir, "generate-json-out");

    await writeFile(htmlPath, '<main data-layer="title">Old</main><style>html,body,main{margin:0;width:100%;height:100%;background:#00ff00}</style>');
    await writeFile(dataPath, JSON.stringify([
      { slug: "launch", modifications: [{ name: "title", text: "Launch" }] },
      { slug: "docs", modifications: [{ name: "title", text: "Docs" }] },
    ]));

    const result = await runCli([
      "generate",
      htmlPath,
      "--data",
      dataPath,
      "--size",
      "64x64",
      "--size",
      "96x48",
      "--out-dir",
      outDir,
      "--out-pattern",
      "{{slug}}-{{size}}.png",
    ]);

    expect(result.stdout).toContain(join(outDir, "launch-64x64.png"));
    expect(result.stdout).toContain(join(outDir, "docs-96x48.png"));
    expect(PNG.sync.read(await readFile(join(outDir, "launch-64x64.png")))).toMatchObject({ width: 64, height: 64 });
    expect(PNG.sync.read(await readFile(join(outDir, "docs-96x48.png")))).toMatchObject({ width: 96, height: 48 });
  }, 60000);

  it("generates template outputs from CSV and selected layer fields", async () => {
    const htmlPath = join(tempDir, "generate-csv.html");
    const dataPath = join(tempDir, "generate-csv.csv");
    const outDir = join(tempDir, "generate-csv-out");

    await writeFile(htmlPath, '<main data-layer="title">Old</main><style>html,body,main{margin:0;width:100%;height:100%;background:#ff0000}</style>');
    await writeFile(dataPath, "slug,title\nfirst,First card\nsecond,Second card\n");

    const result = await runCli([
      "generate",
      htmlPath,
      "--data",
      dataPath,
      "--layer-field",
      "title",
      "--width",
      "64",
      "--height",
      "64",
      "--out-dir",
      outDir,
      "--out-pattern",
      "{{slug}}.png",
    ]);

    expect(result.stdout).toContain(join(outDir, "first.png"));
    expect(result.stdout).toContain(join(outDir, "second.png"));
    expect(PNG.sync.read(await readFile(join(outDir, "second.png")))).toMatchObject({ width: 64, height: 64 });
  }, 60000);

  it("generates template outputs from simple YAML data", async () => {
    const htmlPath = join(tempDir, "generate-yaml.html");
    const dataPath = join(tempDir, "generate-yaml.yaml");
    const outDir = join(tempDir, "generate-yaml-out");

    await writeFile(htmlPath, '<main data-layer="title">Old</main><style>html,body,main{margin:0;width:100%;height:100%;background:#0000ff}</style>');
    await writeFile(dataPath, "- slug: yaml-one\n  title: YAML One\n- slug: yaml-two\n  title: YAML Two\n");

    const result = await runCli([
      "generate",
      htmlPath,
      "--data",
      dataPath,
      "--layer-field",
      "title",
      "--width",
      "64",
      "--height",
      "64",
      "--out-dir",
      outDir,
      "--out-pattern",
      "{{slug}}.png",
    ]);

    expect(result.stdout).toContain(join(outDir, "yaml-one.png"));
    expect(PNG.sync.read(await readFile(join(outDir, "yaml-two.png")))).toMatchObject({ width: 64, height: 64 });
  }, 60000);

  it("reports missing output pattern fields for batch generation", async () => {
    const htmlPath = join(tempDir, "generate-missing-field.html");
    const dataPath = join(tempDir, "generate-missing-field.json");
    const outDir = join(tempDir, "generate-missing-field-out");

    await writeFile(htmlPath, '<main data-layer="title">Old</main>');
    await writeFile(dataPath, JSON.stringify({ slug: "ok", title: "Title" }));

    await expect(runCli([
      "generate",
      htmlPath,
      "--data",
      dataPath,
      "--layer-field",
      "title",
      "--out-dir",
      outDir,
      "--out-pattern",
      "{{missing}}.png",
    ])).rejects.toMatchObject({
      stderr: expect.stringContaining("Output pattern references missing scalar field: missing"),
    });
  });

  it("batch renders preset outputs from JSON data with a JSON summary", async () => {
    const dataPath = join(tempDir, "batch-preset.json");
    const outDir = join(tempDir, "batch-preset-out");
    await writeFile(dataPath, JSON.stringify([
      { slug: "launch", title: "Launch", subtitle: "First" },
      { slug: "docs", title: "Docs", subtitle: "Second" },
    ]));

    const result = await runCli([
      "batch",
      "preset",
      "solid",
      "--data",
      dataPath,
      "--out-dir",
      outDir,
      "--out-pattern",
      "{{slug}}.png",
      "--width",
      "64",
      "--height",
      "64",
      "--json",
    ]);

    const summary = JSON.parse(result.stdout);
    expect(summary).toMatchObject({ ok: true, errors: [] });
    expect(summary.outputs).toHaveLength(2);
    expect(PNG.sync.read(await readFile(join(outDir, "launch.png")))).toMatchObject({ width: 64, height: 64 });
    expect(PNG.sync.read(await readFile(join(outDir, "docs.png")))).toMatchObject({ width: 64, height: 64 });
  }, 60000);

  it("batch renders template outputs from CSV data and mapped fields", async () => {
    const htmlPath = join(tempDir, "batch-template.html");
    const dataPath = join(tempDir, "batch-template.csv");
    const outDir = join(tempDir, "batch-template-out");

    await writeFile(htmlPath, '<main data-layer="title">Old</main><style>html,body,main{margin:0;width:100%;height:100%;background:#123456;color:white}</style>');
    await writeFile(dataPath, "slug,headline\nfirst,First headline\nsecond,Second headline\n");

    const result = await runCli([
      "batch",
      "template",
      htmlPath,
      "--data",
      dataPath,
      "--map",
      "title=headline",
      "--out-dir",
      outDir,
      "--out-pattern",
      "{{slug}}-{{size}}.png",
      "--sizes",
      "64x64,96x48",
    ]);

    expect(result.stdout).toContain(join(outDir, "first-64x64.png"));
    expect(result.stdout).toContain(join(outDir, "second-96x48.png"));
    expect(PNG.sync.read(await readFile(join(outDir, "first-64x64.png")))).toMatchObject({ width: 64, height: 64 });
    expect(PNG.sync.read(await readFile(join(outDir, "second-96x48.png")))).toMatchObject({ width: 96, height: 48 });
  }, 60000);

  it("requires an output directory for multi-size renders", async () => {
    const htmlPath = join(tempDir, "multi-missing-dir.html");
    await writeFile(htmlPath, "<main>Missing dir</main>");

    await expect(runCli(["render", htmlPath, "--size", "64x64"])).rejects.toMatchObject({
      stderr: expect.stringContaining("--out-dir is required"),
    });
  });

  it("reports cache misses and hits, recreates output paths, and clears cache", async () => {
    const htmlPath = join(tempDir, "cached-card.html");
    const cacheDir = join(tempDir, "cli-cache");
    const firstOut = join(tempDir, "cached-first.png");
    const secondOut = join(tempDir, "cached-second.png");

    await writeFile(htmlPath, "<main>Cached</main><style>html,body,main{margin:0;width:100%;height:100%;background:#00ff00;}</style>");

    const miss = await runCli(["render", htmlPath, "--out", firstOut, "--width", "64", "--height", "64", "--cache", "--cache-dir", cacheDir, "--cache-info"]);
    await rm(firstOut);
    const hit = await runCli(["render", htmlPath, "--out", secondOut, "--width", "64", "--height", "64", "--cache", "--cache-dir", cacheDir, "--cache-info"]);

    expect(miss.stderr).toContain("cache miss");
    expect(hit.stderr).toContain("cache hit");
    await expect(readFile(secondOut)).resolves.toHaveProperty("length");

    await runCli(["cache", "clear", "--cache-dir", cacheDir]);
    const afterClear = await runCli(["render", htmlPath, "--out", firstOut, "--width", "64", "--height", "64", "--cache", "--cache-dir", cacheDir, "--cache-info"]);
    expect(afterClear.stderr).toContain("cache miss");
  });

  it("does not expose cache flags on screenshot-url or preview", async () => {
    const screenshotHelp = await runCli(["screenshot-url", "--help"]);
    const previewHelp = await runCli(["preview", "--help"]);

    expect(screenshotHelp.stdout).not.toContain("--cache");
    expect(previewHelp.stdout).not.toContain("--cache");
  });

  it("renders transparent PNG output", async () => {
    const htmlPath = join(tempDir, "transparent.html");
    const out = join(tempDir, "transparent.png");

    await writeFile(htmlPath, "<main>Transparent</main><style>html,body{margin:0;background:transparent}main{width:32px;height:32px;background:rgba(255,0,0,.5)}</style>");

    await runCli(["render", htmlPath, "--out", out, "--width", "64", "--height", "64", "--omit-background"]);

    await expect(readFile(out)).resolves.toHaveProperty("length");
  });

  it("renders a template with layer modifications", async () => {
    const htmlPath = join(tempDir, "template.html");
    const out = join(tempDir, "template.png");

    await writeFile(htmlPath, '<main data-layer="card"><h1 data-layer="title">Old</h1></main>');

    await runCli([
      "template",
      htmlPath,
      "--modify-json",
      JSON.stringify([{ name: "card", background: "#00ff00" }, { name: "title", text: "New" }]),
      "--out",
      out,
      "--width",
      "64",
      "--height",
      "64",
    ]);

    await expect(readFile(out)).resolves.toHaveProperty("length");
  });

  it("lists config templates and renders a config recipe", async () => {
    const htmlPath = join(tempDir, "config-template.html");
    const configPath = join(tempDir, "clickclick.config.json");
    const out = join(tempDir, "config-recipe.png");
    const multiOutDir = join(tempDir, "config-recipe-multi");

    await writeFile(htmlPath, '<main data-layer="card">Recipe</main>');
    await writeFile(configPath, JSON.stringify({
      templates: {
        card: {
          htmlPath,
          css: "html,body,main{margin:0;width:100%;height:100%;background:#ff0000}",
        },
      },
      recipes: {
        card: {
          template: "card",
          output: { path: out },
          modifications: [{ name: "card", text: "Changed" }],
        },
      },
    }));

    const list = await runCli(["config", "templates", configPath]);
    expect(list.stdout).toContain("card");
    await runCli(["config", "recipe", configPath, "card", "--width", "64", "--height", "64"]);
    const multi = await runCli(["config", "recipe", configPath, "card", "--sizes", "64x64,96x48", "--out-dir", multiOutDir]);

    await expect(readFile(out)).resolves.toHaveProperty("length");
    expect(multi.stdout).toContain(join(multiOutDir, "card-64x64.png"));
    expect(PNG.sync.read(await readFile(join(multiOutDir, "card-96x48.png")))).toMatchObject({ width: 96, height: 48 });
  }, 60000);

  it("screenshots a URL", async () => {
    const out = join(tempDir, "url.png");
    const url = `data:text/html,${encodeURIComponent("<main>URL</main><style>html,body{margin:0;}main{width:32px;height:24px;background:#ff0000;}</style>")}`;

    await runCli([
      "screenshot-url",
      url,
      "--out",
      out,
      "--width",
      "64",
      "--height",
      "48",
      "--selector",
      "main",
      "--wait-until",
      "load",
      "--delay",
      "0",
      "--format",
      "png",
      "--omit-background",
      "--locale",
      "en-US",
    ]);

    await expect(readFile(out)).resolves.toHaveProperty("length");
  });

  it("runs image quality gates with structured diagnostics and strict exits", async () => {
    const baseline = join(tempDir, "quality-baseline.png");
    const changed = join(tempDir, "quality-changed.png");
    await writeSolidPng(baseline, [0, 0, 0, 255]);
    await writeSolidPng(changed, [255, 255, 255, 255]);

    const pass = await runCli(["quality", "image", changed, "--baseline", changed, "--strict"]);
    expect(JSON.parse(pass.stdout)).toMatchObject({ passed: true, diagnostics: [] });

    await expect(runCli(["quality", "image", changed, "--baseline", baseline, "--strict"])).rejects.toMatchObject({
      stdout: expect.stringContaining("VISUAL_DIFF"),
    });
  });

  it("runs render quality gates for CI", async () => {
    const htmlPath = join(tempDir, "quality-render.html");
    await writeFile(htmlPath, `
      <main><h1 id="title">Long headline that cannot fit</h1></main>
      <style>
        html, body { margin: 0; }
        main { width: 120px; height: 80px; background: #fff; }
        h1 { margin: 0; width: 40px; height: 20px; overflow: hidden; color: #aaa; background: #fff; font: 16px sans-serif; }
      </style>
    `);

    const pass = await runCli([
      "quality",
      "render",
      htmlPath,
      "--text-selector",
      "h1",
      "--deterministic",
      "--width",
      "120",
      "--height",
      "80",
    ]);
    expect(JSON.parse(pass.stdout)).toMatchObject({ passed: false });
    expect(pass.stdout).toContain("TEXT_OVERFLOW");

    await expect(runCli([
      "quality",
      "render",
      htmlPath,
      "--text-selector",
      "h1",
      "--safe-area",
      "48,12,12,12",
      "--width",
      "120",
      "--height",
      "80",
      "--strict",
    ])).rejects.toMatchObject({
      stdout: expect.stringContaining("SAFE_AREA_VIOLATION"),
    });
  });

  it.each([
    ["announcement", ["--title", "Hello", "--badge", "New"]],
    ["brand-announcement", ["--title", "Hello", "--logo", "data:image/svg+xml,%3Csvg%3E%3C/svg%3E"]],
    ["logo-backdrop", ["--title", "Hello", "--watermark-text", "Brand"]],
    ["partner-card", ["--title", "Hello", "--partner-logo", "data:image/svg+xml,%3Csvg%3E%3C/svg%3E"]],
    ["watermark-quote", ["--quote", "Hello", "--watermark-text", "Brand"]],
    ["badge-grid", ["--title", "Hello", "--badge-logo", "data:image/svg+xml,%3Csvg%3E%3C/svg%3E"]],
    ["checkerboard", ["--title", "Hello", "--label", "New"]],
    ["compare", ["--before-title", "Before", "--after-title", "After"]],
    ["gradient", ["--title", "Hello"]],
    ["photo-hero", ["--title", "Hello", "--image", "data:image/svg+xml,%3Csvg%3E%3C/svg%3E", "--label", "New"]],
    ["editorial-feature", ["--title", "Hello", "--image", "data:image/svg+xml,%3Csvg%3E%3C/svg%3E", "--byline", "By Ada"]],
    ["event-poster", ["--title", "Hello", "--image", "data:image/svg+xml,%3Csvg%3E%3C/svg%3E", "--date", "May 4"]],
    ["case-study", ["--title", "Hello", "--image", "data:image/svg+xml,%3Csvg%3E%3C/svg%3E", "--metric", "42% faster"]],
    ["minimal", ["--title", "Hello", "--meta", "Notes"]],
    ["quote", ["--quote", "Hello"]],
    ["split", ["--title", "Hello"]],
    ["terminal", ["--title", "Hello", "--command", "npm test"]],
  ] as const)("renders the %s preset", async (name, args) => {
    const out = join(tempDir, `${name}.png`);

    await runCli(["preset", name, ...args, "--out", out, "--width", "64", "--height", "64"]);

    await expect(readFile(out)).resolves.toHaveProperty("length");
  });

  it("applies preset background-color aliases", async () => {
    const out = join(tempDir, "brand-background-color.png");

    await runCli([
      "preset",
      "brand-announcement",
      "--title",
      "Hello",
      "--background-color",
      "#123456",
      "--out",
      out,
      "--width",
      "128",
      "--height",
      "128",
    ]);

    const png = PNG.sync.read(await readFile(out));
    expect([png.data[0], png.data[1], png.data[2]]).toEqual([0x12, 0x34, 0x56]);
  });

  it("renders presets with a brand kit file and explicit CLI overrides win", async () => {
    const brandPath = join(tempDir, "preset.brand.json");
    const brandedOut = join(tempDir, "brand-kit-preset.png");
    const overrideOut = join(tempDir, "brand-kit-override.png");
    await writeFile(brandPath, JSON.stringify({
      colors: { background: "#123456", text: "#ffffff", accent: "#abcdef" },
      typography: { fontFamily: "Inter, sans-serif" },
    }));

    await runCli(["preset", "solid", "--title", "Brand", "--brand", brandPath, "--out", brandedOut, "--width", "64", "--height", "64"]);
    await runCli(["preset", "solid", "--title", "Brand", "--brand", brandPath, "--background", "#654321", "--out", overrideOut, "--width", "64", "--height", "64"]);

    const branded = PNG.sync.read(await readFile(brandedOut));
    const override = PNG.sync.read(await readFile(overrideOut));
    expect([branded.data[0], branded.data[1], branded.data[2]]).toEqual([0x12, 0x34, 0x56]);
    expect([override.data[0], override.data[1], override.data[2]]).toEqual([0x65, 0x43, 0x21]);
  });
});

function runCli(args: string[]) {
  return execa("node", ["--import", "tsx", "src/cli/index.ts", ...args], {
    cwd: process.cwd(),
    timeout: 60_000,
    killSignal: "SIGKILL",
  });
}

async function writeSolidPng(path: string, rgba: [number, number, number, number]) {
  const png = new PNG({ width: 4, height: 4 });
  for (let offset = 0; offset < png.data.length; offset += 4) {
    png.data[offset] = rgba[0];
    png.data[offset + 1] = rgba[1];
    png.data[offset + 2] = rgba[2];
    png.data[offset + 3] = rgba[3];
  }
  await writeFile(path, PNG.sync.write(png));
}
