import { ClickClickError } from "../errors.js";
import { sizeNames, sizes } from "../shared/sizes.js";
import type { ImageFormat, RenderCacheOptions, RenderOutputOptions, WaitUntil } from "../types.js";

export interface ParsedRenderSize {
  label: string;
  width: number;
  height: number;
}

export function parseInteger(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Expected an integer, received ${value}`);
  }
  return parsed;
}

export function parseNumber(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected a number, received ${value}`);
  }
  return parsed;
}

export function parseOutputOptions(options: Record<string, unknown>): RenderOutputOptions {
  return {
    path: typeof options.output === "string" ? options.output : undefined,
    format: parseFormat(options.format),
    quality: typeof options.quality === "number" ? options.quality : undefined,
    omitBackground: Boolean(options.omitBackground),
  };
}

export function parseRenderOptions(options: Record<string, unknown>) {
  return {
    selector: typeof options.selector === "string" ? options.selector : undefined,
    waitUntil: parseWaitUntil(options.waitUntil),
    delayMs: typeof options.delay === "number" ? options.delay : undefined,
  };
}

export function parseCacheOptions(options: Record<string, unknown>): RenderCacheOptions | undefined {
  if (!options.cache) return undefined;
  return {
    dir: typeof options.cacheDir === "string" ? options.cacheDir : undefined,
    info: Boolean(options.cacheInfo),
  };
}

export function collectOption(value: string, previous: string[] = []): string[] {
  return [...previous, value];
}

export function parseSizeOptions(options: Record<string, unknown>): ParsedRenderSize[] {
  const rawValues = [
    ...stringArray(options.size),
    ...stringArray(options.sizes),
  ].flatMap((value) => value.split(",").map((part) => part.trim()).filter(Boolean));

  const parsed = rawValues.map(parseSize);
  const seen = new Set<string>();
  for (const size of parsed) {
    if (seen.has(size.label)) {
      throw new ClickClickError("INVALID_INPUT", `Duplicate size requested: ${size.label}`);
    }
    seen.add(size.label);
  }
  return parsed;
}

function stringArray(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) return value;
  return [];
}

function parseSize(value: string): ParsedRenderSize {
  if (value in sizes) {
    const named = sizes[value as keyof typeof sizes];
    return { label: value, width: named.width, height: named.height };
  }

  const match = /^([1-9]\d*)x([1-9]\d*)$/i.exec(value);
  if (!match) {
    throw new ClickClickError("INVALID_INPUT", `Size must be one of ${sizeNames.join(", ")} or WIDTHxHEIGHT.`);
  }

  return {
    label: `${match[1]}x${match[2]}`,
    width: Number(match[1]),
    height: Number(match[2]),
  };
}

function parseFormat(value: unknown): ImageFormat | undefined {
  if (value === undefined) return undefined;
  if (value === "png" || value === "jpeg") return value;
  throw new ClickClickError("INVALID_INPUT", "Format must be png or jpeg.");
}

function parseWaitUntil(value: unknown): WaitUntil | undefined {
  if (value === undefined) return undefined;
  if (value === "load" || value === "domcontentloaded" || value === "networkidle" || value === "commit") return value;
  throw new ClickClickError("INVALID_INPUT", "wait-until must be load, domcontentloaded, networkidle, or commit.");
}
