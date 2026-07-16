import { ClickClickError } from "../errors.js";
import type { ImageFormat, RenderOutputOptions, WaitUntil } from "../types.js";

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
