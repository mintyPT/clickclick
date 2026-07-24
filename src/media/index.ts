import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ClickClickError } from "../errors.js";
import type { AssetDiagnostic, AssetPipelineOptions, AssetTransformOptions, ResolvedAsset } from "../types.js";

const DEFAULT_ASSET_CACHE_DIR = ".clickclick-cache/assets";
const DEFAULT_MAX_ASSET_BYTES = 10 * 1024 * 1024;
const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  "image/apng",
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
]);

export function serializeMediaSource(src: string, baseDir?: string): string {
  if (/^file:/i.test(src)) return serializeMediaFilePath(fileURLToPath(src));
  if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(src)) return src;
  const path = resolveExistingMediaPath(src, baseDir);
  return serializeMediaFilePath(path);
}

export async function resolveAssetSource(src: string, options: AssetPipelineOptions = {}): Promise<ResolvedAsset> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_ASSET_BYTES;
  const diagnostics: AssetDiagnostic[] = [];

  if (src.startsWith("#")) {
    return {
      source: src,
      url: src,
      mimeType: "text/plain",
      diagnostics,
    };
  }

  if (/^data:/i.test(src)) {
    const parsed = parseDataUrl(src);
    if (!parsed) {
      diagnostics.push({
        code: "ASSET_INVALID_DATA_URL",
        severity: "warning",
        message: `Asset data URL could not be parsed: ${src.slice(0, 80)}`,
        source: src,
      });
      return { source: src, url: src, mimeType: "application/octet-stream", diagnostics };
    }
  diagnostics.push(...diagnosticsForAsset(src, parsed.mimeType, parsed.bytes, maxBytes));
    return {
      source: src,
      url: await serializeResolvedAsset(src, parsed.mimeType, parsed.bytes, options.transform, diagnostics),
      mimeType: normalizedMimeType(parsed.mimeType),
      bytes: parsed.bytes,
      diagnostics,
    };
  }

  if (/^https?:/i.test(src)) {
    return resolveRemoteAsset(src, options, maxBytes);
  }

  const path = /^file:/i.test(src)
    ? fileURLToPath(src)
    : resolveExistingMediaPath(src, options.baseDir);
  try {
    const bytes = await readFile(path);
    const mimeType = mimeTypeForPath(path);
    diagnostics.push(...diagnosticsForAsset(src, mimeType, bytes, maxBytes));
    return {
      source: src,
      url: await serializeResolvedAsset(src, mimeType, bytes, options.transform, diagnostics),
      mimeType,
      bytes,
      diagnostics,
    };
  } catch {
    diagnostics.push({
      code: "ASSET_MISSING",
      severity: "warning",
      message: `Asset could not be read: ${path}`,
      source: src,
      details: { path },
    });
    return {
      source: src,
      url: pathToFileURL(path).href,
      mimeType: mimeTypeForPath(path),
      diagnostics,
    };
  }
}

function serializeMediaFilePath(path: string): string {
  if (!existsSync(path)) return pathToFileURL(path).href;
  const mimeType = mimeTypeForPath(path);
  return `data:${mimeType};base64,${readFileSync(path).toString("base64")}`;
}

function resolveExistingMediaPath(src: string, baseDir: string | undefined): string {
  const cwdPath = resolve(src);
  if (existsSync(cwdPath)) return cwdPath;
  if (baseDir) {
    const basePath = resolve(baseDir, src);
    if (existsSync(basePath)) return basePath;
  }
  return cwdPath;
}

function mimeTypeForPath(path: string): string {
  switch (extname(path).toLowerCase()) {
    case ".apng":
      return "image/apng";
    case ".avif":
      return "image/avif";
    case ".gif":
      return "image/gif";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

async function resolveRemoteAsset(src: string, options: AssetPipelineOptions, maxBytes: number): Promise<ResolvedAsset> {
  const diagnostics: AssetDiagnostic[] = [];
  const key = createHash("sha256")
    .update(stableAssetKey({ src, transform: options.transform }))
    .digest("hex");
  const cacheDir = resolve(options.cacheDir ?? DEFAULT_ASSET_CACHE_DIR);
  const cachePath = join(cacheDir, `${key}.asset`);
  const metadataPath = join(cacheDir, `${key}.json`);

  try {
    const [metadataRaw, bytes] = await Promise.all([
      readFile(metadataPath, "utf8"),
      readFile(cachePath),
    ]);
    const metadata = JSON.parse(metadataRaw) as { source?: string; mimeType?: string };
    if (metadata.source === src && typeof metadata.mimeType === "string") {
      diagnostics.push(...diagnosticsForAsset(src, metadata.mimeType, bytes, maxBytes));
      return {
        source: src,
        url: await serializeResolvedAsset(src, metadata.mimeType, bytes, options.transform, diagnostics),
        mimeType: metadata.mimeType,
        bytes,
        cache: { hit: true, key, path: cachePath },
        diagnostics,
      };
    }
  } catch {
    // Cache misses are expected.
  }

  try {
    const response = await fetch(src);
    if (!response.ok) {
      throw new ClickClickError("INVALID_INPUT", `HTTP ${response.status} ${response.statusText}`);
    }
    const mimeType = normalizedMimeType(response.headers.get("content-type")?.split(";")[0] ?? mimeTypeForPath(new URL(src).pathname));
    const bytes = Buffer.from(await response.arrayBuffer());
    diagnostics.push(...diagnosticsForAsset(src, mimeType, bytes, maxBytes));
    await mkdir(cacheDir, { recursive: true });
    await Promise.all([
      writeFile(cachePath, bytes),
      writeFile(metadataPath, JSON.stringify({ source: src, mimeType }, null, 2)),
    ]);
    return {
      source: src,
      url: await serializeResolvedAsset(src, mimeType, bytes, options.transform, diagnostics),
      mimeType,
      bytes,
      cache: { hit: false, key, path: cachePath },
      diagnostics,
    };
  } catch (error) {
    diagnostics.push({
      code: "ASSET_REMOTE_ERROR",
      severity: "warning",
      message: `Remote asset could not be fetched: ${src}`,
      source: src,
      details: { error: error instanceof Error ? error.message : String(error) },
    });
    return {
      source: src,
      url: src,
      mimeType: mimeTypeForPath(new URL(src).pathname),
      cache: { hit: false, key, path: cachePath },
      diagnostics,
    };
  }
}

async function serializeResolvedAsset(src: string, mimeType: string, bytes: Buffer, transform: AssetTransformOptions | undefined, diagnostics: AssetDiagnostic[]): Promise<string> {
  const transformed = applySvgTransform(src, normalizedMimeType(mimeType), bytes, transform, diagnostics);
  return `data:${transformed.mimeType};base64,${transformed.bytes.toString("base64")}`;
}

function applySvgTransform(src: string, mimeType: string, bytes: Buffer, transform: AssetTransformOptions | undefined, diagnostics: AssetDiagnostic[]): { mimeType: string; bytes: Buffer } {
  if (!transform) return { mimeType, bytes };
  const requestedWidth = transform.width ?? transform.resize?.width;
  const requestedHeight = transform.height ?? transform.resize?.height;
  const requestedFormat = transform.format;
  const unsupportedBitmapTransform = transform.crop || transform.fit || transform.focalPoint || requestedFormat && requestedFormat !== "svg" && requestedFormat !== mimeTypeToFormat(mimeType);

  if (mimeType !== "image/svg+xml") {
    if (requestedWidth || requestedHeight || unsupportedBitmapTransform) {
      diagnostics.push({
        code: "ASSET_TRANSFORM_UNSUPPORTED",
        severity: "warning",
        message: "Bitmap asset transforms require an external image pipeline and were left unchanged.",
        source: src,
      });
    }
    return { mimeType, bytes };
  }

  if (unsupportedBitmapTransform || requestedFormat && requestedFormat !== "svg") {
    diagnostics.push({
      code: "ASSET_TRANSFORM_UNSUPPORTED",
      severity: "warning",
      message: "SVG normalization supports width and height only; crop, focal point, fit, and raster format conversion were left unchanged.",
      source: src,
    });
  }

  let svg = bytes.toString("utf8").trim();
  if (requestedWidth) {
    svg = setSvgAttribute(svg, "width", String(requestedWidth));
  }
  if (requestedHeight) {
    svg = setSvgAttribute(svg, "height", String(requestedHeight));
  }
  return { mimeType, bytes: Buffer.from(svg) };
}

function diagnosticsForAsset(src: string, mimeType: string, bytes: Buffer, maxBytes: number): AssetDiagnostic[] {
  const diagnostics: AssetDiagnostic[] = [];
  const normalized = normalizedMimeType(mimeType);
  if (!SUPPORTED_IMAGE_MIME_TYPES.has(normalized)) {
    diagnostics.push({
      code: "ASSET_UNSUPPORTED_FORMAT",
      severity: "warning",
      message: `Asset format is not a supported image type: ${normalized}`,
      source: src,
    });
  }
  if (bytes.byteLength > maxBytes) {
    diagnostics.push({
      code: "ASSET_TOO_LARGE",
      severity: "warning",
      message: `Asset is larger than ${maxBytes} bytes: ${bytes.byteLength}`,
      source: src,
      details: { bytes: bytes.byteLength, maxBytes },
    });
  }
  return diagnostics;
}

function parseDataUrl(src: string): { mimeType: string; bytes: Buffer } | undefined {
  const match = /^data:([^;,]+)?((?:;[^,]+)*),(.*)$/is.exec(src);
  if (!match) return undefined;
  const mimeType = normalizedMimeType(match[1] || "text/plain");
  const metadata = match[2] ?? "";
  const body = match[3] ?? "";
  const bytes = metadata.includes(";base64")
    ? Buffer.from(body, "base64")
    : Buffer.from(decodeURIComponent(body), "utf8");
  return { mimeType, bytes };
}

function normalizedMimeType(value: string): string {
  const lower = value.toLowerCase();
  return lower === "image/jpg" ? "image/jpeg" : lower;
}

function stableAssetKey(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined && typeof item !== "function")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, sortValue(item)]),
  );
}

function setSvgAttribute(svg: string, attribute: "width" | "height", value: string): string {
  if (!/^<svg[\s>]/i.test(svg)) return svg;
  const escaped = value.replaceAll('"', "&quot;");
  const attributePattern = new RegExp(`\\s${attribute}=(["']).*?\\1`, "i");
  if (attributePattern.test(svg)) return svg.replace(attributePattern, ` ${attribute}="${escaped}"`);
  return svg.replace(/^<svg\b/i, `<svg ${attribute}="${escaped}"`);
}

function mimeTypeToFormat(mimeType: string): "png" | "jpeg" | "svg" | undefined {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpeg";
  if (mimeType === "image/svg+xml") return "svg";
  return undefined;
}
