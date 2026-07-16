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

    expect(result.stdout).toContain("gradient");
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

  it.each([
    ["gradient", ["--title", "Hello"]],
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
