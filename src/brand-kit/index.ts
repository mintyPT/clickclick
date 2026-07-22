import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ClickClickError } from "../errors.js";
import type { FontRegistryEntry, LayerModification } from "../types.js";
export { brandKitJsonSchema } from "./schema.js";

export interface BrandKit {
  colors?: {
    primary?: string;
    accent?: string;
    background?: string;
    text?: string;
    muted?: string;
    panel?: string;
    gradientFrom?: string;
    gradientTo?: string;
    before?: string;
    after?: string;
  };
  fonts?: {
    body?: BrandFontToken;
    heading?: BrandFontToken;
    mono?: BrandFontToken;
  };
  logos?: {
    primary?: BrandLogoToken;
    watermark?: BrandLogoToken;
  };
  typography?: {
    fontFamily?: string;
    headingFontFamily?: string;
    monoFontFamily?: string;
  };
  spacing?: {
    scale?: number;
    padding?: number;
    gap?: number;
    radius?: number;
  };
  defaults?: {
    backgroundImage?: BrandBackgroundToken;
    overlay?: string;
    logoPlacement?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    logoSize?: number;
    logoOpacity?: number;
    watermarkPlacement?: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
    watermarkOpacity?: number;
    watermarkScale?: number;
    watermarkRotation?: number;
    align?: "left" | "center";
  };
  templateLayers?: Record<string, BrandTemplateLayer>;
}

export interface BrandFontToken extends Omit<FontRegistryEntry, "family" | "source"> {
  family: string;
  source?: string | string[];
}

export interface BrandLogoToken {
  src: string;
  alt?: string;
  placement?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  size?: number;
  opacity?: number;
}

export interface BrandBackgroundToken {
  src: string;
  fit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  position?: string;
  opacity?: number;
}

export interface BrandTemplateLayer extends Omit<LayerModification, "name"> {}

export interface BrandablePresetOptions {
  brand?: BrandKit;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  mutedColor?: string;
  panelColor?: string;
  fromColor?: string;
  toColor?: string;
  beforeColor?: string;
  afterColor?: string;
  fontFamily?: string;
  monoFontFamily?: string;
  align?: "left" | "center";
  image?: string;
  overlay?: string;
  background?: unknown;
  logo?: unknown;
  watermark?: unknown;
}

export async function loadBrandKit(path: string): Promise<BrandKit> {
  const brandPath = resolve(path);
  let raw: string;
  try {
    raw = await readFile(brandPath, "utf8");
  } catch {
    throw new ClickClickError("INVALID_INPUT", `Brand kit file could not be read: ${brandPath}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new ClickClickError("INVALID_INPUT", `Brand kit file is not valid JSON: ${brandPath}`, error);
  }

  await validateBrandKit(parsed, dirname(brandPath));
  return resolveBrandKitSources(parsed as BrandKit, dirname(brandPath));
}

export async function validateBrandKit(value: unknown, baseDir = process.cwd()): Promise<void> {
  if (!isObject(value)) {
    throw new ClickClickError("INVALID_INPUT", "Brand kit must be a JSON object.");
  }
  const brand = value as BrandKit;
  validateRecord("colors", brand.colors, validateColorToken);
  validateRecord("fonts", brand.fonts, validateFontToken);
  validateRecord("logos", brand.logos, validateLogoToken);
  validateRecord("typography", brand.typography, validateTypographyToken);
  validateRecord("spacing", brand.spacing, validateNumberToken);
  validateRecord("defaults", brand.defaults, validateDefaultToken);
  validateRecord("templateLayers", brand.templateLayers, validateTemplateLayer);

  for (const font of Object.values(brand.fonts ?? {})) {
    for (const source of stringSources(font.source)) {
      await assertReadableLocalSource(source, baseDir, "Font");
    }
  }
  for (const logo of Object.values(brand.logos ?? {})) {
    if (logo?.src) await assertReadableLocalSource(logo.src, baseDir, "Logo");
  }
  if (brand.defaults?.backgroundImage?.src) {
    await assertReadableLocalSource(brand.defaults.backgroundImage.src, baseDir, "Background image");
  }
}

export function applyBrandToPresetOptions<T extends BrandablePresetOptions>(options: T): T {
  const brand = options.brand;
  if (!brand) return options;
  const colors = brand.colors ?? {};
  const defaults = brand.defaults ?? {};
  const primaryLogo = brand.logos?.primary;
  const watermarkLogo = brand.logos?.watermark;
  const typography = brand.typography ?? {};

  return {
    ...options,
    backgroundColor: options.backgroundColor ?? colors.background,
    textColor: options.textColor ?? colors.text,
    accentColor: options.accentColor ?? colors.accent ?? colors.primary,
    mutedColor: options.mutedColor ?? colors.muted,
    panelColor: options.panelColor ?? colors.panel,
    fromColor: options.fromColor ?? colors.gradientFrom ?? colors.primary,
    toColor: options.toColor ?? colors.gradientTo ?? colors.accent,
    beforeColor: options.beforeColor ?? colors.before,
    afterColor: options.afterColor ?? colors.after,
    fontFamily: options.fontFamily ?? typography.fontFamily ?? typography.headingFontFamily ?? brand.fonts?.body?.family ?? brand.fonts?.heading?.family,
    monoFontFamily: options.monoFontFamily ?? typography.monoFontFamily ?? brand.fonts?.mono?.family,
    align: options.align ?? defaults.align,
    image: options.image ?? defaults.backgroundImage?.src,
    overlay: options.overlay ?? defaults.overlay,
    background: options.background ?? backgroundFromBrand(defaults, colors),
    logo: options.logo ?? logoFromBrand(primaryLogo, defaults),
    watermark: options.watermark ?? watermarkFromBrand(watermarkLogo, defaults),
  };
}

export function brandFonts(brand: BrandKit | undefined): FontRegistryEntry[] {
  if (!brand?.fonts) return [];
  return Object.values(brand.fonts).flatMap((font) => font.source ? [{ ...font, source: font.source }] : []);
}

export function brandTemplateCss(brand: BrandKit | undefined): string {
  if (!brand) return "";
  const declarations: string[] = [];
  for (const [name, value] of Object.entries(brand.colors ?? {})) {
    declarations.push(`  --clickclick-color-${kebabCase(name)}: ${value};`);
  }
  for (const [name, value] of Object.entries(brand.spacing ?? {})) {
    declarations.push(`  --clickclick-spacing-${kebabCase(name)}: ${value}px;`);
  }
  const typography = brand.typography ?? {};
  const fontFamily = typography.fontFamily ?? brand.fonts?.body?.family;
  const headingFontFamily = typography.headingFontFamily ?? brand.fonts?.heading?.family;
  const monoFontFamily = typography.monoFontFamily ?? brand.fonts?.mono?.family;
  if (fontFamily) declarations.push(`  --clickclick-font-body: ${fontFamily};`);
  if (headingFontFamily) declarations.push(`  --clickclick-font-heading: ${headingFontFamily};`);
  if (monoFontFamily) declarations.push(`  --clickclick-font-mono: ${monoFontFamily};`);
  return declarations.length > 0 ? `:root {\n${declarations.join("\n")}\n}` : "";
}

export function brandTemplateModifications(brand: BrandKit | undefined): LayerModification[] {
  if (!brand?.templateLayers) return [];
  return Object.entries(brand.templateLayers).map(([name, modification]) => ({ name, ...modification }));
}

export function resolveBrandKitSources(brand: BrandKit, baseDir: string): BrandKit {
  return {
    ...brand,
    fonts: brand.fonts ? Object.fromEntries(Object.entries(brand.fonts).map(([key, font]) => [
      key,
      { ...font, source: resolveSources(font.source, baseDir) },
    ])) : undefined,
    logos: brand.logos ? Object.fromEntries(Object.entries(brand.logos).map(([key, logo]) => [
      key,
      { ...logo, src: resolveSource(logo.src, baseDir) },
    ])) : undefined,
    defaults: {
      ...brand.defaults,
      backgroundImage: brand.defaults?.backgroundImage ? {
        ...brand.defaults.backgroundImage,
        src: resolveSource(brand.defaults.backgroundImage.src, baseDir),
      } : undefined,
    },
  };
}

function backgroundFromBrand(defaults: NonNullable<BrandKit["defaults"]>, colors: NonNullable<BrandKit["colors"]>) {
  if (!defaults.backgroundImage) return undefined;
  return {
    src: defaults.backgroundImage.src,
    fit: defaults.backgroundImage.fit,
    position: defaults.backgroundImage.position,
    opacity: defaults.backgroundImage.opacity,
    overlay: defaults.overlay ?? colors.background,
  };
}

function logoFromBrand(logo: BrandLogoToken | undefined, defaults: NonNullable<BrandKit["defaults"]>) {
  if (!logo) return undefined;
  return {
    src: logo.src,
    alt: logo.alt,
    placement: logo.placement ?? defaults.logoPlacement,
    size: logo.size ?? defaults.logoSize,
    opacity: logo.opacity ?? defaults.logoOpacity,
  };
}

function watermarkFromBrand(logo: BrandLogoToken | undefined, defaults: NonNullable<BrandKit["defaults"]>) {
  if (!logo) return undefined;
  return {
    src: logo.src,
    placement: defaults.watermarkPlacement,
    opacity: logo.opacity ?? defaults.watermarkOpacity,
    scale: defaults.watermarkScale,
    rotation: defaults.watermarkRotation,
  };
}

function validateRecord(label: string, value: unknown, validate: (key: string, value: unknown) => void) {
  if (value === undefined) return;
  if (!isObject(value)) throw new ClickClickError("INVALID_INPUT", `Brand kit ${label} must be an object.`);
  for (const [key, token] of Object.entries(value)) validate(key, token);
}

function validateColorToken(key: string, value: unknown) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ClickClickError("INVALID_INPUT", `Brand color ${key} must be a non-empty CSS color string.`);
  }
}

function validateFontToken(key: string, value: unknown) {
  if (!isObject(value) || typeof value.family !== "string" || value.family.trim() === "") {
    throw new ClickClickError("INVALID_INPUT", `Brand font ${key} must include a non-empty family.`);
  }
  if (value.source !== undefined && stringSources(value.source).length === 0) {
    throw new ClickClickError("INVALID_INPUT", `Brand font ${key} source must be a string or string array.`);
  }
}

function validateLogoToken(key: string, value: unknown) {
  if (!isObject(value) || typeof value.src !== "string" || value.src.trim() === "") {
    throw new ClickClickError("INVALID_INPUT", `Brand logo ${key} must include a non-empty src.`);
  }
  if (value.placement !== undefined) validateCornerPlacement(`Brand logo ${key} placement`, value.placement);
  if (value.size !== undefined) validatePositiveNumber(`Brand logo ${key} size`, value.size);
  if (value.opacity !== undefined) validateUnitNumber(`Brand logo ${key} opacity`, value.opacity);
}

function validateTypographyToken(key: string, value: unknown) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ClickClickError("INVALID_INPUT", `Brand typography ${key} must be a non-empty string.`);
  }
}

function validateNumberToken(key: string, value: unknown) {
  validatePositiveNumber(`Brand spacing ${key}`, value);
}

function validateDefaultToken(key: string, value: unknown) {
  if (key === "backgroundImage") {
    if (!isObject(value) || typeof value.src !== "string" || value.src.trim() === "") {
      throw new ClickClickError("INVALID_INPUT", "Brand default backgroundImage must include a non-empty src.");
    }
    if (value.opacity !== undefined) validateUnitNumber("Brand default backgroundImage opacity", value.opacity);
    return;
  }
  if (key === "logoPlacement") return validateCornerPlacement("Brand default logoPlacement", value);
  if (key === "watermarkPlacement") return validatePlacement("Brand default watermarkPlacement", value);
  if (key === "align") return validateAlign(value);
  if (key.endsWith("Opacity")) return validateUnitNumber(`Brand default ${key}`, value);
  if (key.endsWith("Size") || key.endsWith("Scale") || key.endsWith("Rotation")) return validateFiniteNumber(`Brand default ${key}`, value);
  if (typeof value !== "string" || value.trim() === "") {
    throw new ClickClickError("INVALID_INPUT", `Brand default ${key} must be a non-empty string.`);
  }
}

function validateTemplateLayer(key: string, value: unknown) {
  if (!isObject(value)) throw new ClickClickError("INVALID_INPUT", `Brand template layer ${key} must be an object.`);
}

function validateCornerPlacement(label: string, value: unknown) {
  if (value === "top-left" || value === "top-right" || value === "bottom-left" || value === "bottom-right") return;
  throw new ClickClickError("INVALID_INPUT", `${label} must be top-left, top-right, bottom-left, or bottom-right.`);
}

function validatePlacement(label: string, value: unknown) {
  if (value === "center") return;
  validateCornerPlacement(label, value);
}

function validateAlign(value: unknown) {
  if (value === "left" || value === "center") return;
  throw new ClickClickError("INVALID_INPUT", "Brand default align must be left or center.");
}

function validatePositiveNumber(label: string, value: unknown) {
  validateFiniteNumber(label, value);
  if ((value as number) < 0) throw new ClickClickError("INVALID_INPUT", `${label} must be zero or greater.`);
}

function validateUnitNumber(label: string, value: unknown) {
  validateFiniteNumber(label, value);
  if ((value as number) < 0 || (value as number) > 1) throw new ClickClickError("INVALID_INPUT", `${label} must be between 0 and 1.`);
}

function validateFiniteNumber(label: string, value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ClickClickError("INVALID_INPUT", `${label} must be a finite number.`);
  }
}

async function assertReadableLocalSource(source: string, baseDir: string, label: string) {
  if (isRemoteOrDataSource(source)) return;
  const path = source.startsWith("file:") ? fileURLToPath(source) : resolve(baseDir, source);
  try {
    await access(path);
  } catch {
    throw new ClickClickError("INVALID_INPUT", `${label} source could not be read: ${source}`);
  }
}

function stringSources(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) return value;
  return [];
}

function isRemoteOrDataSource(source: string): boolean {
  return /^(https?:|data:)/.test(source);
}

function resolveSources(source: string | string[] | undefined, baseDir: string): string | string[] | undefined {
  if (typeof source === "string") return resolveSource(source, baseDir);
  if (Array.isArray(source)) return source.map((item) => resolveSource(item, baseDir));
  return undefined;
}

function resolveSource(source: string, baseDir: string): string {
  if (isRemoteOrDataSource(source) || source.startsWith("file:")) return source;
  return resolve(baseDir, source);
}

function kebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
