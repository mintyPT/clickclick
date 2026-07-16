import type { RenderImageInput } from "../types.js";
import { sizes } from "../shared/sizes.js";
import { defaultSansFont, escapeHtml, renderPresetMedia } from "./utils.js";
import type { PresetLogoOptions, PresetWatermarkOptions } from "./utils.js";

const defaultPhoto =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 630'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%230f766e'/%3E%3Cstop offset='.55' stop-color='%232563eb'/%3E%3Cstop offset='1' stop-color='%23f97316'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1200' height='630' fill='url(%23g)'/%3E%3Ccircle cx='930' cy='150' r='220' fill='%23ffffff' opacity='.18'/%3E%3Cpath d='M80 520 330 260l210 190 170-160 410 310H80Z' fill='%23ffffff' opacity='.2'/%3E%3C/svg%3E";

interface PhotoBaseOptions {
  title: string;
  image?: string;
  overlay?: string;
  logo?: PresetLogoOptions;
  watermark?: PresetWatermarkOptions;
  textColor?: string;
  accentColor?: string;
  fontFamily?: string;
  width?: number;
  height?: number;
}

export interface PhotoHeroPresetOptions extends PhotoBaseOptions {
  subtitle?: string;
  label?: string;
}

export interface EditorialFeaturePresetOptions extends PhotoBaseOptions {
  kicker?: string;
  byline?: string;
  imagePosition?: string;
}

export interface EventPosterPresetOptions extends PhotoBaseOptions {
  date?: string;
  meta?: string;
  cta?: string;
}

export interface CaseStudyPresetOptions extends PhotoBaseOptions {
  customer?: string;
  quote?: string;
  metric?: string;
}

export function photoHero(options: PhotoHeroPresetOptions): RenderImageInput {
  const size = resolveSize(options);
  const media = renderPresetMedia({
    background: { src: options.image ?? defaultPhoto, overlay: options.overlay ?? "linear-gradient(90deg, rgba(3,7,18,.78), rgba(3,7,18,.24))" },
    logo: options.logo,
    watermark: options.watermark,
  }, size.width, size.height);
  return presetDocument(size, options, `
    <main class="photo photo-hero">
      ${media.html}
      <section class="content">
        ${options.label ? `<div class="eyebrow">${escapeHtml(options.label)}</div>` : ""}
        <h1 data-clickclick-fit data-clickclick-min-font-size="34">${escapeHtml(options.title)}</h1>
        ${options.subtitle ? `<p data-clickclick-fit data-clickclick-min-font-size="22">${escapeHtml(options.subtitle)}</p>` : ""}
      </section>
    </main>`, `
.photo-hero .content { width: 68%; justify-content: center; }
${media.css}`);
}

export function editorialFeature(options: EditorialFeaturePresetOptions): RenderImageInput {
  const size = resolveSize(options);
  const image = escapeHtml(options.image ?? defaultPhoto);
  const media = renderPresetMedia({ watermark: options.watermark, logo: options.logo }, size.width, size.height);
  return presetDocument(size, options, `
    <main class="photo editorial">
      ${media.html}
      <section class="copy">
        ${options.kicker ? `<div class="eyebrow">${escapeHtml(options.kicker)}</div>` : ""}
        <h1 data-clickclick-fit data-clickclick-min-font-size="32">${escapeHtml(options.title)}</h1>
        ${options.byline ? `<p>${escapeHtml(options.byline)}</p>` : ""}
      </section>
      <aside class="image" aria-hidden="true"></aside>
    </main>`, `
.editorial { background: ${options.overlay ?? "#f8fafc"}; color: ${options.textColor ?? "#111827"}; }
.editorial .copy { position: relative; z-index: 2; width: 55%; padding: ${Math.round(size.height * 0.1)}px ${Math.round(size.width * 0.07)}px; display: flex; flex-direction: column; justify-content: flex-end; gap: ${Math.round(size.height * 0.035)}px; }
.editorial .image { position: absolute; right: ${Math.round(size.width * 0.06)}px; top: ${Math.round(size.height * 0.08)}px; width: 38%; height: 78%; background: url("${image}") ${options.imagePosition ?? "center"} / cover no-repeat; box-shadow: 0 30px 90px rgba(15,23,42,.24); }
.editorial p { color: ${options.accentColor ?? "#475569"}; }
${media.css}`);
}

export function eventPoster(options: EventPosterPresetOptions): RenderImageInput {
  const size = resolveSize(options);
  const media = renderPresetMedia({
    background: { src: options.image ?? defaultPhoto, overlay: options.overlay ?? "linear-gradient(180deg, rgba(2,6,23,.18), rgba(2,6,23,.88))" },
    logo: options.logo,
    watermark: options.watermark,
  }, size.width, size.height);
  return presetDocument(size, options, `
    <main class="photo event">
      ${media.html}
      <section class="event-meta">
        ${options.date ? `<strong>${escapeHtml(options.date)}</strong>` : ""}
        ${options.meta ? `<span>${escapeHtml(options.meta)}</span>` : ""}
      </section>
      <section class="content">
        <h1 data-clickclick-fit data-clickclick-min-font-size="32">${escapeHtml(options.title)}</h1>
        ${options.cta ? `<div class="cta">${escapeHtml(options.cta)}</div>` : ""}
      </section>
    </main>`, `
.event .content { justify-content: flex-end; width: 72%; }
.event-meta { position: absolute; z-index: 2; top: ${Math.round(size.height * 0.1)}px; left: ${Math.round(size.width * 0.08)}px; display: flex; flex-direction: column; gap: 10px; padding: 22px 26px; background: rgba(255,255,255,.14); color: ${options.textColor ?? "#fff"}; }
.event-meta strong { font-size: ${Math.round(size.width * 0.04)}px; }
.event-meta span, .cta { font-size: ${Math.round(size.width * 0.022)}px; font-weight: 800; text-transform: uppercase; }
.cta { color: ${options.accentColor ?? "#fde68a"}; }
${media.css}`);
}

export function caseStudy(options: CaseStudyPresetOptions): RenderImageInput {
  const size = resolveSize(options);
  const media = renderPresetMedia({
    background: { src: options.image ?? defaultPhoto, overlay: options.overlay ?? "linear-gradient(90deg, rgba(15,23,42,.82), rgba(15,23,42,.52))" },
    logo: options.logo,
    watermark: options.watermark,
  }, size.width, size.height);
  return presetDocument(size, options, `
    <main class="photo case-study">
      ${media.html}
      <section class="content">
        ${options.customer ? `<div class="eyebrow">${escapeHtml(options.customer)}</div>` : ""}
        <h1 data-clickclick-fit data-clickclick-min-font-size="30">${escapeHtml(options.title)}</h1>
        ${options.quote ? `<blockquote>${escapeHtml(options.quote)}</blockquote>` : ""}
        ${options.metric ? `<div class="metric">${escapeHtml(options.metric)}</div>` : ""}
      </section>
    </main>`, `
.case-study .content { width: 62%; justify-content: center; }
blockquote { margin: 0; font-size: ${Math.round(size.width * 0.03)}px; line-height: 1.18; }
.metric { align-self: flex-start; padding: 16px 20px; background: ${options.accentColor ?? "#22c55e"}; color: #052e16; font-size: ${Math.round(size.width * 0.028)}px; font-weight: 900; }
${media.css}`);
}

function resolveSize(options: { width?: number; height?: number }) {
  return { width: options.width ?? sizes.og.width, height: options.height ?? sizes.og.height };
}

function presetDocument(size: { width: number; height: number }, options: { textColor?: string; accentColor?: string; fontFamily?: string }, html: string, extraCss: string): RenderImageInput {
  return {
    document: {
      html: `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>${html}
  </body>
</html>`,
      css: `
* { box-sizing: border-box; }
html, body { margin: 0; width: 100%; height: 100%; }
body { width: ${size.width}px; height: ${size.height}px; font-family: ${options.fontFamily ?? defaultSansFont}; color: ${options.textColor ?? "#fff"}; }
.photo { position: relative; overflow: hidden; width: ${size.width}px; height: ${size.height}px; background: #0f172a; }
.content { position: relative; z-index: 2; height: 100%; padding: ${Math.round(size.height * 0.11)}px ${Math.round(size.width * 0.08)}px; display: flex; flex-direction: column; gap: ${Math.round(size.height * 0.035)}px; }
.eyebrow { align-self: flex-start; padding: 12px 16px; background: ${options.accentColor ?? "rgba(255,255,255,.16)"}; font-size: ${Math.round(size.width * 0.018)}px; line-height: 1; font-weight: 900; text-transform: uppercase; }
h1, p { margin: 0; max-width: 100%; overflow: hidden; }
h1 { max-height: ${Math.round(size.height * 0.48)}px; font-size: ${Math.round(size.width * 0.066)}px; line-height: 1.02; font-weight: 900; }
p { max-height: ${Math.round(size.height * 0.18)}px; font-size: ${Math.round(size.width * 0.032)}px; line-height: 1.22; opacity: .88; }
${extraCss}
`,
    },
    viewport: size,
  };
}
