import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { ImageFormat, RenderCacheOptions, RenderImageResult, RenderWarning } from "../types.js";

export const DEFAULT_CACHE_DIR = ".clickclick-cache";
export const CACHE_VERSION = 1;

export interface ResolvedRenderCacheOptions {
  dir: string;
  info: boolean;
  keyParts?: unknown;
}

interface CacheMetadata {
  version: number;
  key: string;
  format: ImageFormat;
  width: number;
  height: number;
  warnings: RenderWarning[];
}

export function resolveRenderCacheOptions(cache: RenderCacheOptions | undefined): ResolvedRenderCacheOptions | undefined {
  if (!cache) return undefined;
  if (cache === true) {
    return { dir: resolve(DEFAULT_CACHE_DIR), info: false };
  }
  return {
    dir: resolve(cache.dir ?? DEFAULT_CACHE_DIR),
    info: Boolean(cache.info),
    keyParts: cache.keyParts,
  };
}

export function createCacheKey(value: unknown): string {
  return createHash("sha256")
    .update(stableStringify({ version: CACHE_VERSION, value }))
    .digest("hex");
}

export async function readCachedResult(cache: ResolvedRenderCacheOptions, key: string, path: string | undefined): Promise<RenderImageResult | undefined> {
  try {
    const [metadataRaw, buffer] = await Promise.all([
      readFile(metadataPath(cache.dir, key), "utf8"),
      readFile(imagePath(cache.dir, key)),
    ]);
    const metadata = JSON.parse(metadataRaw) as CacheMetadata;
    if (metadata.version !== CACHE_VERSION || metadata.key !== key) return undefined;
    return {
      buffer,
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      path,
      warnings: Array.isArray(metadata.warnings) ? metadata.warnings : [],
      cache: { hit: true, key, dir: cache.dir },
    };
  } catch {
    return undefined;
  }
}

export async function writeCachedResult(cache: ResolvedRenderCacheOptions, key: string, result: RenderImageResult): Promise<void> {
  await mkdir(cache.dir, { recursive: true });
  await Promise.all([
    writeFile(imagePath(cache.dir, key), result.buffer),
    writeFile(metadataPath(cache.dir, key), JSON.stringify({
      version: CACHE_VERSION,
      key,
      format: result.format,
      width: result.width,
      height: result.height,
      warnings: result.warnings,
    } satisfies CacheMetadata, null, 2)),
  ]);
}

export async function clearCache(options: { dir?: string } = {}): Promise<void> {
  await rm(resolve(options.dir ?? DEFAULT_CACHE_DIR), { recursive: true, force: true });
}

function imagePath(dir: string, key: string): string {
  return join(dir, `${key}.image`);
}

function metadataPath(dir: string, key: string): string {
  return join(dir, `${key}.json`);
}

function stableStringify(value: unknown): string {
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
