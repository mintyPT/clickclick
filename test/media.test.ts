import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { serializeMediaSource } from "../src/index.js";

let tempDir: string;

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "clickclick-media-"));
});

afterAll(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("media source serialization", () => {
  it("preserves external URLs and fragments", () => {
    expect(serializeMediaSource("https://example.com/logo.svg")).toBe("https://example.com/logo.svg");
    expect(serializeMediaSource("#gradient")).toBe("#gradient");
  });

  it("inlines existing local files as data URLs", async () => {
    const assetPath = join(tempDir, "mark.svg");
    await writeFile(assetPath, '<svg xmlns="http://www.w3.org/2000/svg"></svg>');

    expect(serializeMediaSource(assetPath)).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(serializeMediaSource(pathToFileURL(assetPath).href)).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it("resolves local files relative to a base directory", async () => {
    const assetPath = join(tempDir, "nested.png");
    await writeFile(assetPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    expect(serializeMediaSource("nested.png", tempDir)).toMatch(/^data:image\/png;base64,/);
  });

  it("serializes missing local files as file URLs", () => {
    expect(serializeMediaSource("missing.png", tempDir)).toBe(pathToFileURL(join(process.cwd(), "missing.png")).href);
  });
});
