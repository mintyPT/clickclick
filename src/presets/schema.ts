import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ClickClickError } from "../errors.js";
import type { LayerModification, RenderImageInput, TemplateInput, ViewportSize } from "../types.js";

export type PresetOptionType = "string" | "number" | "integer" | "boolean" | "enum";
export type LocalPresetOptionTarget = "text" | "html" | "src" | "color" | "background";

export interface PresetOptionSchema {
  name: string;
  flag?: string;
  description: string;
  type: PresetOptionType;
  required?: boolean;
  default?: string | number | boolean;
  choices?: string[];
  layer?: string;
  target?: LocalPresetOptionTarget;
}

export interface PresetSchema {
  name: string;
  command?: string;
  description: string;
  options: PresetOptionSchema[];
}

export interface LocalPresetSchema extends PresetSchema {
  html?: string;
  htmlPath?: string;
  css?: string;
  cssPath?: string;
  viewport?: Partial<ViewportSize>;
}

export interface LocalPresetConfig {
  presets: LocalPresetSchema[];
}

export interface PresetModuleDefinition extends PresetSchema {
  render: (values: PresetSchemaValues) => RenderImageInput;
}

export type PresetSchemaValues = Record<string, string | number | boolean | undefined>;

export function createPresetSchema(schema: PresetSchema): PresetSchema {
  validatePresetSchema(schema);
  return schema;
}

export async function loadLocalPresetConfig(path = "clickclick.presets.json"): Promise<LocalPresetConfig> {
  const resolvedPath = resolve(path);
  let raw: string;
  try {
    raw = await readFile(resolvedPath, "utf8");
  } catch (error) {
    throw new ClickClickError("INVALID_INPUT", `Local preset config could not be read: ${path}`, error);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new ClickClickError("INVALID_INPUT", `Local preset config is not valid JSON: ${path}`, error);
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.presets)) {
    throw new ClickClickError("INVALID_INPUT", "Local preset config must contain a presets array.");
  }

  const baseDir = dirname(resolvedPath);
  const presets = parsed.presets.map((preset) => validateLocalPresetSchema(preset, baseDir));
  return { presets };
}

export async function loadLocalPresetModule(path: string): Promise<PresetModuleDefinition[]> {
  const moduleUrl = pathToFileURL(resolve(path)).href;
  let loaded: unknown;
  try {
    loaded = await import(moduleUrl) as unknown;
  } catch (error) {
    throw new ClickClickError("INVALID_INPUT", `Local preset module could not be loaded: ${path}`, error);
  }
  const exported = isRecord(loaded) && "default" in loaded ? loaded.default : loaded;
  const definitions = Array.isArray(exported)
    ? exported
    : isRecord(exported) && Array.isArray(exported.presets)
      ? exported.presets
      : [exported];
  return definitions.map(validatePresetModuleDefinition);
}

export function renderLocalPreset(schema: LocalPresetSchema, values: PresetSchemaValues, output?: RenderImageInput["output"]): TemplateInput {
  const resolved = resolvePresetValues(schema, values);
  const modifications = localPresetModifications(schema, resolved);
  return {
    html: schema.html,
    htmlPath: schema.htmlPath,
    css: schema.css,
    cssPath: schema.cssPath,
    modifications,
    viewport: schema.viewport,
    output,
  };
}

export function resolvePresetValues(schema: PresetSchema, values: PresetSchemaValues): PresetSchemaValues {
  validatePresetSchema(schema);
  const resolved: PresetSchemaValues = {};
  for (const option of schema.options) {
    const value = values[option.name] ?? option.default;
    if (value === undefined) {
      if (option.required) {
        throw new ClickClickError("INVALID_INPUT", `Missing required preset option: ${option.name}`);
      }
      continue;
    }
    resolved[option.name] = coercePresetOption(option, value);
  }
  return resolved;
}

export function coercePresetOption(option: PresetOptionSchema, value: unknown): string | number | boolean {
  let coerced: string | number | boolean;
  if (option.type === "boolean") {
    coerced = typeof value === "boolean" ? value : value === "true";
  } else if (option.type === "integer") {
    coerced = typeof value === "number" ? value : Number.parseInt(String(value), 10);
    if (!Number.isInteger(coerced)) throw new ClickClickError("INVALID_INPUT", `${option.name} must be an integer.`);
  } else if (option.type === "number") {
    coerced = typeof value === "number" ? value : Number.parseFloat(String(value));
    if (!Number.isFinite(coerced)) throw new ClickClickError("INVALID_INPUT", `${option.name} must be a number.`);
  } else {
    coerced = String(value);
  }

  if (option.choices && !option.choices.includes(String(coerced))) {
    throw new ClickClickError("INVALID_INPUT", `${option.name} must be one of: ${option.choices.join(", ")}.`);
  }
  return coerced;
}

function localPresetModifications(schema: LocalPresetSchema, values: PresetSchemaValues): LayerModification[] {
  return schema.options.flatMap((option) => {
    const value = values[option.name];
    if (value === undefined || !option.layer) return [];
    const field = option.target ?? "text";
    return [{ name: option.layer, [field]: value }] as LayerModification[];
  });
}

function validateLocalPresetSchema(value: unknown, baseDir: string): LocalPresetSchema {
  validatePresetSchema(value);
  const schema = value as LocalPresetSchema;
  if (!schema.html && !schema.htmlPath) {
    throw new ClickClickError("INVALID_INPUT", `Local preset ${schema.name} must define html or htmlPath.`);
  }
  if (schema.htmlPath) schema.htmlPath = resolve(baseDir, schema.htmlPath);
  if (schema.cssPath) schema.cssPath = resolve(baseDir, schema.cssPath);
  return schema;
}

export function validatePresetSchema(value: unknown): asserts value is PresetSchema {
  if (!isRecord(value)) throw new ClickClickError("INVALID_INPUT", "Preset schema must be an object.");
  if (typeof value.name !== "string" || value.name.length === 0) {
    throw new ClickClickError("INVALID_INPUT", "Preset schema name is required.");
  }
  if (typeof value.description !== "string") {
    throw new ClickClickError("INVALID_INPUT", `Preset schema ${value.name} must include a description.`);
  }
  if (!Array.isArray(value.options)) {
    throw new ClickClickError("INVALID_INPUT", `Preset schema ${value.name} must include an options array.`);
  }
  for (const option of value.options) {
    validatePresetOptionSchema(value.name, option);
  }
}

function validatePresetOptionSchema(presetName: string, value: unknown): asserts value is PresetOptionSchema {
  if (!isRecord(value)) throw new ClickClickError("INVALID_INPUT", `Preset ${presetName} has an invalid option.`);
  if (typeof value.name !== "string" || value.name.length === 0) {
    throw new ClickClickError("INVALID_INPUT", `Preset ${presetName} has an option without a name.`);
  }
  if (typeof value.description !== "string") {
    throw new ClickClickError("INVALID_INPUT", `Preset ${presetName} option ${value.name} must include a description.`);
  }
  if (!["string", "number", "integer", "boolean", "enum"].includes(String(value.type))) {
    throw new ClickClickError("INVALID_INPUT", `Preset ${presetName} option ${value.name} has an invalid type.`);
  }
  if (value.type === "enum" && (!Array.isArray(value.choices) || value.choices.length === 0)) {
    throw new ClickClickError("INVALID_INPUT", `Preset ${presetName} option ${value.name} enum options must include choices.`);
  }
  if (value.target !== undefined && !["text", "html", "src", "color", "background"].includes(String(value.target))) {
    throw new ClickClickError("INVALID_INPUT", `Preset ${presetName} option ${value.name} has an invalid target.`);
  }
}

export function validatePresetDefinition(value: unknown): PresetModuleDefinition {
  return validatePresetModuleDefinition(value);
}

function validatePresetModuleDefinition(value: unknown): PresetModuleDefinition {
  validatePresetSchema(value);
  if (!isRecord(value) || typeof value.render !== "function") {
    throw new ClickClickError("INVALID_INPUT", `Preset schema ${(value as { name?: unknown }).name ?? ""} must include a render function.`);
  }
  return value as unknown as PresetModuleDefinition;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
