import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { ClickClickError } from "../errors.js";
import { createRenderer } from "../renderer/index.js";
import { renderTemplate } from "../template/index.js";
import type { ClickClickRenderer, LayerModification, RenderImageResult, TemplateInput } from "../types.js";

export type BatchDataValue = string | number | boolean | null | LayerModification | LayerModification[];
export type BatchDataRow = Record<string, BatchDataValue>;

export interface BatchRenderSize {
  label: string;
  width?: number;
  height?: number;
}

export interface GenerateTemplateBatchInput {
  template: Omit<TemplateInput, "modifications" | "output" | "viewport"> & {
    modifications?: LayerModification[];
    output?: Omit<NonNullable<TemplateInput["output"]>, "path">;
    viewport?: Partial<NonNullable<TemplateInput["viewport"]>>;
  };
  rows: BatchDataRow[];
  outputDir: string;
  outputPattern: string;
  sizes?: BatchRenderSize[];
  renderer?: ClickClickRenderer;
  rowToModifications?: (row: BatchDataRow, index: number) => LayerModification[];
}

export async function generateTemplateBatch(input: GenerateTemplateBatchInput): Promise<RenderImageResult[]> {
  if (input.rows.length === 0) {
    throw new ClickClickError("INVALID_INPUT", "Data source must contain at least one row.");
  }

  await mkdir(input.outputDir, { recursive: true });
  const sizes = input.sizes?.length ? input.sizes : [{ label: "default" }];
  const renderer = input.renderer ?? await createRenderer();
  const ownsRenderer = !input.renderer;
  const results: RenderImageResult[] = [];

  try {
    for (const [index, row] of input.rows.entries()) {
      const rowModifications = input.rowToModifications
        ? input.rowToModifications(row, index)
        : dataRowToLayerModifications(row);
      for (const size of sizes) {
        const path = join(input.outputDir, interpolateOutputPattern(input.outputPattern, row, index, size));
        results.push(await renderTemplate({
          ...input.template,
          modifications: [...(input.template.modifications ?? []), ...rowModifications],
          viewport: {
            ...input.template.viewport,
            width: size.width ?? input.template.viewport?.width,
            height: size.height ?? input.template.viewport?.height,
          },
          output: {
            ...input.template.output,
            path,
          },
        }, { renderer }));
      }
    }
  } finally {
    if (ownsRenderer) await renderer.close();
  }

  return results;
}

export function dataRowToLayerModifications(row: BatchDataRow, fields?: string[]): LayerModification[] {
  if (Array.isArray(row.modifications)) {
    return validateLayerModifications(row.modifications);
  }

  const entries = fields?.map((field) => {
    const value = row[field];
    if (value === undefined) {
      throw new ClickClickError("INVALID_INPUT", `Data row is missing selected layer field: ${field}`);
    }
    return [field, value] as const;
  })
    ?? Object.entries(row).filter(([field]) => !["slug", "id", "filename"].includes(field));
  return entries
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([field, value]) => dataFieldToLayerModification(field, value));
}

export function interpolateOutputPattern(pattern: string, row: BatchDataRow, index: number, size: BatchRenderSize): string {
  return pattern.replace(/\{\{\s*([A-Za-z0-9_-]+)\s*\}\}/g, (_token, rawField: string) => {
    if (rawField === "index") return String(index + 1);
    if (rawField === "size") return size.label;
    if (rawField === "width") return size.width !== undefined ? String(size.width) : "";
    if (rawField === "height") return size.height !== undefined ? String(size.height) : "";
    const value = row[rawField];
    if (value === undefined || value === null || typeof value === "object") {
      throw new ClickClickError("INVALID_INPUT", `Output pattern references missing scalar field: ${rawField}`);
    }
    return sanitizePathSegment(String(value));
  });
}

function dataFieldToLayerModification(field: string, value: BatchDataValue): LayerModification {
  if (Array.isArray(value)) {
    throw new ClickClickError("INVALID_INPUT", `Data field cannot be an array unless it is the modifications field: ${field}`);
  }
  if (value && typeof value === "object") {
    return validateLayerModification({ ...value, name: field });
  }
  return { name: field, text: String(value) };
}

function validateLayerModifications(value: LayerModification[]): LayerModification[] {
  return value.map(validateLayerModification);
}

function validateLayerModification(value: unknown): LayerModification {
  if (!value || typeof value !== "object" || typeof (value as { name?: unknown }).name !== "string") {
    throw new ClickClickError("INVALID_INPUT", "Each generated layer modification must be an object with a string name.");
  }
  return value as LayerModification;
}

function sanitizePathSegment(value: string): string {
  return value.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-");
}
