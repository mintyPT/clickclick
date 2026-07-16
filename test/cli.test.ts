import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execa } from "execa";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

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

    await expect(readFile(out)).resolves.toHaveProperty("length");
  });

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
});

function runCli(args: string[]) {
  return execa("node", ["--import", "tsx", "src/cli/index.ts", ...args], {
    cwd: process.cwd(),
  });
}
