import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Page } from "playwright";
import { resolveRenderCacheOptions, writeCachedResult } from "../cache/index.js";
import { brandFonts, brandTemplateCss, brandTemplateModifications, resolveBrandKitSources, validateBrandKit } from "../brand-kit/index.js";
import { ClickClickError } from "../errors.js";
import { resolveAssetSource } from "../media/index.js";
import { renderImage } from "../renderer/index.js";
import type {
  ClickClickConfig,
  LayerModification,
  RenderImageResult,
  TemplateInput,
  TemplateRecipe,
  TemplateSetItem,
  TemplateWarning,
  RenderCacheOptions,
  ClickClickRenderer,
} from "../types.js";

interface PreparedTemplate {
  html: string;
  css?: string;
  baseUrl?: string;
}

export interface RenderTemplateOptions {
  renderer?: ClickClickRenderer;
}

export async function renderTemplate(input: TemplateInput, options: RenderTemplateOptions = {}): Promise<RenderImageResult> {
  const template = await prepareTemplate(input);
  const warnings: TemplateWarning[] = [];
  const css = [fontFaceCss([...(brandFonts(input.brand)), ...(input.fonts ?? [])]), brandTemplateCss(input.brand), template.css].filter(Boolean).join("\n");
  const { modifications, warnings: assetWarnings } = await serializeLayerModificationSources([...brandTemplateModifications(input.brand), ...(input.modifications ?? [])], input.htmlPath ? dirname(resolve(input.htmlPath)) : undefined);
  const cache = options.renderer || input.render?.beforeScreenshot ? undefined : templateCacheOptions(input.cache, {
    kind: "template",
    modifications,
    onMissingLayer: input.onMissingLayer ?? "error",
    onDuplicateLayer: input.onDuplicateLayer ?? "warn",
  });

  const renderInput = {
    document: {
      html: template.html,
      css,
      baseUrl: template.baseUrl,
    },
    viewport: input.viewport,
    output: input.output,
    fitText: input.fitText,
    render: {
      ...input.render,
      beforeScreenshot: async (page: Page) => {
        const layerWarnings = await applyLayerModifications(page, modifications, {
          onMissingLayer: input.onMissingLayer ?? "error",
          onDuplicateLayer: input.onDuplicateLayer ?? "warn",
        });
        warnings.push(...layerWarnings);
        await input.render?.beforeScreenshot?.(page);
      },
    },
  };
  const result = options.renderer ? await options.renderer.render(renderInput) : await renderImage(renderInput, { cache });

  const combined = { ...result, warnings: [...assetWarnings, ...warnings, ...result.warnings] };
  const resolvedCache = resolveRenderCacheOptions(cache);
  if (resolvedCache && combined.cache?.key && !combined.cache.hit) {
    await writeCachedResult(resolvedCache, combined.cache.key, combined);
  }

  if (input.debugDir) {
    await writeDebugBundle(input.debugDir, template, input, combined.warnings);
  }

  return combined;
}

function templateCacheOptions(cache: RenderCacheOptions | undefined, keyParts: unknown): RenderCacheOptions | undefined {
  if (!cache) return undefined;
  if (cache === true) return { keyParts };
  return { ...cache, keyParts: { ...objectKeyParts(cache.keyParts), template: keyParts } };
}

function objectKeyParts(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : { value };
}

export async function loadConfig(path: string): Promise<ClickClickConfig> {
  const raw = await readFile(path, "utf8");
  try {
    const config = JSON.parse(raw) as ClickClickConfig;
    if (config.brand) {
      const baseDir = dirname(resolve(path));
      await validateBrandKit(config.brand, baseDir);
      config.brand = resolveBrandKitSources(config.brand, baseDir);
    }
    return config;
  } catch (error) {
    if (error instanceof ClickClickError) throw error;
    throw new ClickClickError("INVALID_INPUT", `Config file is not valid JSON: ${path}`, error);
  }
}

export async function renderRecipe(configPath: string, name: string, overrides: Partial<TemplateInput> = {}): Promise<RenderImageResult> {
  const config = await loadConfig(configPath);
  const recipe = config.recipes?.[name];
  if (!recipe) {
    throw new ClickClickError("INVALID_INPUT", `Recipe not found: ${name}`);
  }
  return renderTemplate(resolveRecipe(config, recipe, dirname(resolve(configPath)), overrides));
}

export async function renderTemplateSet(configPath: string, name: string, outputDir?: string, overrides: Pick<TemplateInput, "brand" | "cache"> = {}): Promise<RenderImageResult[]> {
  const config = await loadConfig(configPath);
  const set = config.templateSets?.[name];
  if (!set) {
    throw new ClickClickError("INVALID_INPUT", `Template set not found: ${name}`);
  }
  const baseDir = dirname(resolve(configPath));
  const targetDir = outputDir ? resolve(outputDir) : baseDir;
  return Promise.all(set.map((item) => {
    const path = item.output?.path ?? join(targetDir, `${item.name}.${item.output?.format ?? "png"}`);
    return renderTemplate(resolveRecipe(config, item, baseDir, {
      output: { ...item.output, path },
      viewport: viewportFromRecipe(item),
      cache: overrides.cache,
    }));
  }));
}

export async function listConfigTemplates(configPath: string): Promise<string[]> {
  const config = await loadConfig(configPath);
  return Object.keys(config.templates ?? {}).sort();
}

function resolveRecipe(config: ClickClickConfig, recipe: TemplateRecipe, baseDir: string, overrides: Partial<TemplateInput>): TemplateInput {
  const template = config.templates?.[recipe.template];
  if (!template) {
    throw new ClickClickError("INVALID_INPUT", `Template not found: ${recipe.template}`);
  }
  return {
    ...template,
    ...overrides,
    brand: overrides.brand ?? recipe.brand ?? template.brand ?? config.brand,
    htmlPath: resolveOptionalPath(baseDir, overrides.htmlPath ?? template.htmlPath),
    cssPath: resolveOptionalPath(baseDir, overrides.cssPath ?? template.cssPath),
    fonts: [...(config.fonts ?? []), ...(template.fonts ?? []), ...(overrides.fonts ?? [])],
    modifications: [...(recipe.modifications ?? []), ...(overrides.modifications ?? [])],
    viewport: overrides.viewport ?? viewportFromRecipe(recipe),
    output: { ...recipe.output, ...definedOutput(overrides.output) },
  };
}

function definedOutput(output: TemplateInput["output"]): TemplateInput["output"] {
  if (!output) return undefined;
  return Object.fromEntries(Object.entries(output).filter(([, value]) => value !== undefined));
}

function viewportFromRecipe(recipe: TemplateRecipe | TemplateSetItem) {
  return {
    width: recipe.output?.width,
    height: recipe.output?.height,
  };
}

async function prepareTemplate(input: TemplateInput): Promise<PreparedTemplate> {
  const html = input.html ?? (input.htmlPath ? await readFileChecked(input.htmlPath, "HTML") : undefined);
  if (!html) {
    throw new ClickClickError("INVALID_INPUT", "Template html or htmlPath is required.");
  }
  const css = input.css ?? (input.cssPath ? await readFileChecked(input.cssPath, "CSS") : undefined);
  return {
    html,
    css,
    baseUrl: input.baseUrl ?? (input.htmlPath ? `${pathToFileURL(dirname(resolve(input.htmlPath))).href}/` : undefined),
  };
}

async function readFileChecked(path: string, label: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch {
    throw new ClickClickError("INVALID_INPUT", `${label} file could not be read: ${path}`);
  }
}

async function applyLayerModifications(page: Page, modifications: LayerModification[], behavior: { onMissingLayer: "warn" | "error" | "ignore"; onDuplicateLayer: "warn" | "error" | "ignore" }) {
  const payload = JSON.stringify({ modifications, behavior });
  const result = await page.evaluate(`(() => {
    const applyLayerModifications = ${APPLY_LAYER_MODIFICATIONS_SCRIPT};
    return applyLayerModifications(${payload});
  })()`) as TemplateWarning[];
  return result;
}

const APPLY_LAYER_MODIFICATIONS_SCRIPT = `({ modifications, behavior }) => {
  const warnings = [];
  const fail = (code, layer, message, mode) => {
    if (mode === "error") throw new Error(code + ": " + message);
    if (mode === "warn") warnings.push({ code, layer, message });
  };
  const effectMap = {
    grayscale: { filter: "grayscale(1)" },
    sepia: { filter: "sepia(1)" },
    blur: { filter: "blur(6px)" },
    "grayscale-blur": { filter: "grayscale(1) blur(6px)" },
    "flip-horizontal": { transform: "scaleX(-1)" },
    "flip-vertical": { transform: "scaleY(-1)" },
    invert: { filter: "invert(1)" },
    negate: { filter: "invert(1)" },
  };
  for (const mod of modifications) {
    const nodes = Array.from(document.querySelectorAll('[data-layer="' + CSS.escape(mod.name) + '"]'));
    if (nodes.length === 0) {
      fail("MISSING_LAYER", mod.name, "Layer not found: " + mod.name, behavior.onMissingLayer);
      continue;
    }
    if (nodes.length > 1) {
      fail("DUPLICATE_LAYER", mod.name, "Layer appears " + nodes.length + " times: " + mod.name, behavior.onDuplicateLayer);
    }
    for (const node of nodes) {
      if (mod.text !== undefined) node.textContent = mod.text;
      if (mod.html !== undefined) node.innerHTML = mod.html;
      const src = mod.src ?? mod.image_url;
      if (src !== undefined && (node instanceof HTMLImageElement || node instanceof HTMLSourceElement)) {
        node.src = src;
      } else if (src !== undefined) {
        node.style.backgroundImage = 'url("' + String(src).replaceAll('"', '\\\\"') + '")';
      }
      if (mod.color !== undefined) node.style.color = mod.color;
      if (mod.background !== undefined) node.style.background = mod.background;
      if (mod.font_family !== undefined) node.style.fontFamily = mod.font_family;
      if (mod.alignment !== undefined) node.style.textAlign = mod.alignment;
      if (mod.hide === true) node.style.display = "none";
      if (mod.show === true) node.style.display = "";
      if (mod.className !== undefined) node.className = mod.className;
      if (mod.x !== undefined || mod.y !== undefined) node.style.translate = (mod.x ?? 0) + "px " + (mod.y ?? 0) + "px";
      if (mod.border !== undefined) node.style.border = mod.border;
      if (mod.shadow !== undefined) node.style.boxShadow = mod.shadow;
      if (mod.fit !== undefined) node.style.objectFit = mod.fit;
      if (mod.anchor !== undefined) node.style.objectPosition = mod.anchor;
      if (mod.style) {
        for (const [key, value] of Object.entries(mod.style)) {
          node.style.setProperty(key.replace(/[A-Z]/g, (match) => "-" + match.toLowerCase()), String(value));
        }
      }
      if (mod.attributes) {
        for (const [key, value] of Object.entries(mod.attributes)) {
          if (value === null || value === false) node.removeAttribute(key);
          else node.setAttribute(key, value === true ? "" : String(value));
        }
      }
      if (mod.effect) {
        const effect = effectMap[mod.effect];
        if (effect?.filter) node.style.filter = [node.style.filter, effect.filter].filter(Boolean).join(" ");
        if (effect?.transform) node.style.transform = [node.style.transform, effect.transform].filter(Boolean).join(" ");
      }
    }
  }
  return warnings;
}`;

async function serializeLayerModificationSources(modifications: LayerModification[], baseDir: string | undefined): Promise<{ modifications: LayerModification[]; warnings: TemplateWarning[] }> {
  const warnings: TemplateWarning[] = [];
  const resolved = await Promise.all(modifications.map(async (modification) => {
    const src = modification.src ?? modification.image_url;
    if (!src) return modification;
    const asset = await resolveAssetSource(src, { baseDir });
    warnings.push(...asset.diagnostics.map((diagnostic) => ({
      code: "ASSET_DIAGNOSTIC" as const,
      layer: modification.name,
      message: `${diagnostic.code}: ${diagnostic.message}`,
    })));
    return modification.src !== undefined
      ? { ...modification, src: asset.url }
      : { ...modification, image_url: asset.url };
  }));
  return { modifications: resolved, warnings };
}

function fontFaceCss(fonts: TemplateInput["fonts"] = []): string {
  return fonts.map((font) => {
    const sources = (Array.isArray(font.source) ? font.source : [font.source])
      .map((source) => `url("${source}")`)
      .join(", ");
    return [
      "@font-face {",
      `  font-family: "${font.family.replaceAll('"', '\\"')}";`,
      `  src: ${sources};`,
      font.weight === undefined ? "" : `  font-weight: ${font.weight};`,
      font.style === undefined ? "" : `  font-style: ${font.style};`,
      font.display === undefined ? "" : `  font-display: ${font.display};`,
      "}",
    ].filter(Boolean).join("\n");
  }).join("\n");
}

async function writeDebugBundle(debugDir: string, template: PreparedTemplate, input: TemplateInput, warnings: unknown[]) {
  await mkdir(debugDir, { recursive: true });
  await writeFile(join(debugDir, "source.html"), template.html);
  if (template.css) await writeFile(join(debugDir, "source.css"), template.css);
  await writeFile(join(debugDir, "manifest.json"), JSON.stringify({
    modifications: input.modifications ?? [],
    warnings,
    output: input.output,
    viewport: input.viewport,
  }, null, 2));
}

function resolveOptionalPath(baseDir: string, path: string | undefined): string | undefined {
  return path ? resolve(baseDir, path) : undefined;
}
