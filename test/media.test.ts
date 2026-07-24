import { createServer, type Server } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveAssetSource, serializeMediaSource } from "../src/index.js";

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

describe("asset pipeline", () => {
  it("normalizes local files and file URLs to data URLs with diagnostics", async () => {
    const assetPath = join(tempDir, "pipeline-logo.svg");
    await writeFile(assetPath, '<svg xmlns="http://www.w3.org/2000/svg"></svg>');

    const local = await resolveAssetSource("pipeline-logo.svg", { baseDir: tempDir });
    const file = await resolveAssetSource(pathToFileURL(assetPath).href);

    expect(local).toMatchObject({ source: "pipeline-logo.svg", mimeType: "image/svg+xml", diagnostics: [] });
    expect(local.url).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(file.url).toBe(local.url);
  });

  it("caches remote assets with deterministic keys", async () => {
    const cacheDir = join(tempDir, "asset-cache");
    const { server, url } = await serveAsset("image/png", Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    try {
      const first = await resolveAssetSource(url, { cacheDir });
      const second = await resolveAssetSource(url, { cacheDir });

      expect(first.cache).toMatchObject({ hit: false, key: expect.any(String) });
      expect(second.cache).toMatchObject({ hit: true, key: first.cache?.key });
      expect(second.url).toBe(first.url);
    } finally {
      server.close();
    }
  });

  it("reports missing, unsupported, huge, and transformed assets", async () => {
    const missing = await resolveAssetSource("missing.png", { baseDir: tempDir });
    const unsupportedPath = join(tempDir, "asset.txt");
    await writeFile(unsupportedPath, "hello");
    const unsupported = await resolveAssetSource(unsupportedPath, { maxBytes: 2, transform: { width: 24 } });

    expect(missing.diagnostics).toMatchObject([{ code: "ASSET_MISSING" }]);
    expect(unsupported.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "ASSET_UNSUPPORTED_FORMAT" }),
      expect.objectContaining({ code: "ASSET_TOO_LARGE" }),
      expect.objectContaining({ code: "ASSET_TRANSFORM_UNSUPPORTED" }),
    ]));
  });

  it("normalizes SVG dimensions when requested", async () => {
    const result = await resolveAssetSource("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E", {
      transform: { width: 320, height: 180 },
    });

    expect(Buffer.from(result.url.split(",")[1] ?? "", "base64").toString("utf8")).toContain('width="320"');
    expect(Buffer.from(result.url.split(",")[1] ?? "", "base64").toString("utf8")).toContain('height="180"');
  });
});

async function serveAsset(contentType: string, body: Buffer): Promise<{ server: Server; url: string }> {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": contentType });
    response.end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Server address was not available.");
  return { server, url: `http://127.0.0.1:${address.port}/asset.png` };
}
