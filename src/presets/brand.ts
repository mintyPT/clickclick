import type { RenderImageInput } from "../types.js";
import { imageLayer, renderPresetDocument, resolvePresetSize, textLayer } from "./layout.js";
import { renderPresetMedia } from "./utils.js";
import type { PresetLogoOptions, PresetWatermarkOptions } from "./utils.js";

const defaultLogo =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'%3E%3Crect width='256' height='256' rx='54' fill='%23ffffff'/%3E%3Cpath d='M64 144 120 56h72l-56 88h56l-80 80 24-80H64Z' fill='%23111827'/%3E%3C/svg%3E";

interface BrandBaseOptions {
  title: string;
  subtitle?: string;
  logo?: PresetLogoOptions;
  watermark?: PresetWatermarkOptions;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  fontFamily?: string;
  width?: number;
  height?: number;
}

export interface BrandAnnouncementPresetOptions extends BrandBaseOptions {
  cta?: string;
}

export interface LogoBackdropPresetOptions extends BrandBaseOptions {
  meta?: string;
}

export interface PartnerCardPresetOptions extends BrandBaseOptions {
  partnerLogo?: string;
  partnerName?: string;
}

export interface WatermarkQuotePresetOptions extends Omit<BrandBaseOptions, "title"> {
  quote: string;
  attribution?: string;
}

export interface BadgeGridPresetOptions extends BrandBaseOptions {
  badge?: string;
  badgeLogo?: string;
}

export function brandAnnouncement(options: BrandAnnouncementPresetOptions): RenderImageInput {
  const size = resolvePresetSize(options);
  const media = renderPresetMedia({
    logo: options.logo ?? { src: defaultLogo, placement: "top-right" },
    watermark: options.watermark ?? { src: options.logo?.src ?? defaultLogo, opacity: 0.08, scale: 0.58 },
  }, size.width, size.height);
  return brandDocument(size, options, `
    <main class="brand announcement-brand">
      ${media.html}
      <section class="content">
        <div class="eyebrow">Announcement</div>
        ${textLayer(options.title, { tag: "h1", fit: true, minFontSize: 34 })}
        ${textLayer(options.subtitle, { tag: "p", fit: true, minFontSize: 22 })}
        ${textLayer(options.cta, { tag: "strong" })}
      </section>
    </main>`, `
.announcement-brand .content { width: 72%; justify-content: center; }
strong { align-self: flex-start; padding: 16px 22px; background: ${options.accentColor ?? "#facc15"}; color: #111827; font-size: ${Math.round(size.width * 0.024)}px; }
${media.css}`);
}

export function logoBackdrop(options: LogoBackdropPresetOptions): RenderImageInput {
  const size = resolvePresetSize(options);
  const media = renderPresetMedia({
    watermark: options.watermark ?? { src: options.logo?.src ?? defaultLogo, opacity: 0.1, scale: 0.72 },
    logo: options.logo,
  }, size.width, size.height);
  return brandDocument(size, options, `
    <main class="brand logo-backdrop">
      ${media.html}
      <section class="center-content">
        ${textLayer(options.meta, { className: "eyebrow" })}
        ${textLayer(options.title, { tag: "h1", fit: true, minFontSize: 34 })}
        ${textLayer(options.subtitle, { tag: "p" })}
      </section>
    </main>`, `
.center-content { position: relative; z-index: 2; height: 100%; padding: ${Math.round(size.height * 0.14)}px ${Math.round(size.width * 0.12)}px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: ${Math.round(size.height * 0.035)}px; }
${media.css}`);
}

export function partnerCard(options: PartnerCardPresetOptions): RenderImageInput {
  const size = resolvePresetSize(options);
  const media = renderPresetMedia({ watermark: options.watermark }, size.width, size.height);
  const ownLogo = options.logo?.src ?? defaultLogo;
  const partnerLogo = options.partnerLogo ?? defaultLogo;
  return brandDocument(size, options, `
    <main class="brand partner-card">
      ${media.html}
      <section class="logos">
        ${imageLayer(ownLogo)}
        <span>+</span>
        ${imageLayer(partnerLogo)}
      </section>
      <section class="partner-copy">
        ${textLayer(options.title, { tag: "h1", fit: true, minFontSize: 30 })}
        ${textLayer(options.subtitle, { tag: "p" })}
        ${textLayer(options.partnerName, { className: "eyebrow" })}
      </section>
    </main>`, `
.logos { position: relative; z-index: 2; height: 46%; display: flex; align-items: center; justify-content: center; gap: ${Math.round(size.width * 0.04)}px; }
.logos img { width: ${Math.round(size.width * 0.14)}px; height: ${Math.round(size.width * 0.14)}px; object-fit: contain; background: rgba(255,255,255,.12); padding: 22px; }
.logos span { color: ${options.accentColor ?? "#38bdf8"}; font-size: ${Math.round(size.width * 0.07)}px; font-weight: 900; }
.partner-copy { position: relative; z-index: 2; padding: 0 ${Math.round(size.width * 0.14)}px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: ${Math.round(size.height * 0.025)}px; }
${media.css}`);
}

export function watermarkQuote(options: WatermarkQuotePresetOptions): RenderImageInput {
  const size = resolvePresetSize(options);
  const media = renderPresetMedia({
    logo: options.logo,
    watermark: options.watermark ?? { src: options.logo?.src, text: options.logo?.src ? undefined : "QUOTE", opacity: 0.1, scale: 0.22, rotation: -8 },
  }, size.width, size.height);
  return brandDocument(size, options, `
    <main class="brand watermark-quote">
      ${media.html}
      <section class="quote-copy">
        ${textLayer(options.quote, { tag: "blockquote", fit: true, minFontSize: 30 })}
        ${textLayer(options.attribution, { tag: "p" })}
      </section>
    </main>`, `
.quote-copy { position: relative; z-index: 2; height: 100%; padding: ${Math.round(size.height * 0.14)}px ${Math.round(size.width * 0.12)}px; display: flex; flex-direction: column; justify-content: center; gap: ${Math.round(size.height * 0.04)}px; }
blockquote { margin: 0; max-height: ${Math.round(size.height * 0.48)}px; font-size: ${Math.round(size.width * 0.056)}px; line-height: 1.08; font-weight: 850; }
${media.css}`);
}

export function badgeGrid(options: BadgeGridPresetOptions): RenderImageInput {
  const size = resolvePresetSize(options);
  const logo = options.badgeLogo ?? options.logo?.src ?? defaultLogo;
  const media = renderPresetMedia({ logo: options.logo, watermark: options.watermark }, size.width, size.height);
  return brandDocument(size, options, `
    <main class="brand badge-grid">
      <div class="grid" aria-hidden="true">${Array.from({ length: 24 }, () => imageLayer(logo)).join("")}</div>
      ${media.html}
      <section class="badge-copy">
        ${textLayer(options.badge, { className: "eyebrow" })}
        ${textLayer(options.title, { tag: "h1", fit: true, minFontSize: 32 })}
        ${textLayer(options.subtitle, { tag: "p" })}
      </section>
    </main>`, `
.grid { position: absolute; inset: 0; z-index: 0; display: grid; grid-template-columns: repeat(6, 1fr); opacity: .12; }
.grid img { width: 100%; height: 100%; object-fit: contain; padding: 28px; }
.badge-copy { position: relative; z-index: 2; width: 64%; height: 100%; padding: ${Math.round(size.height * 0.12)}px ${Math.round(size.width * 0.08)}px; display: flex; flex-direction: column; justify-content: center; gap: ${Math.round(size.height * 0.035)}px; background: linear-gradient(90deg, ${options.backgroundColor ?? "#111827"} 0%, rgba(17,24,39,.86) 72%, transparent 100%); }
${media.css}`);
}

function brandDocument(size: { width: number; height: number }, options: { backgroundColor?: string; textColor?: string; accentColor?: string; fontFamily?: string }, html: string, extraCss: string): RenderImageInput {
  return renderPresetDocument({
    size,
    html,
    fontFamily: options.fontFamily,
    textColor: options.textColor,
    css: `
.brand { position: relative; overflow: hidden; width: ${size.width}px; height: ${size.height}px; background: ${options.backgroundColor ?? "#111827"}; }
.content { position: relative; z-index: 2; height: 100%; padding: ${Math.round(size.height * 0.12)}px ${Math.round(size.width * 0.08)}px; display: flex; flex-direction: column; gap: ${Math.round(size.height * 0.035)}px; }
.eyebrow { align-self: flex-start; padding: 12px 16px; background: ${options.accentColor ?? "rgba(255,255,255,.14)"}; color: ${options.textColor ?? "#fff"}; font-size: ${Math.round(size.width * 0.018)}px; line-height: 1; font-weight: 900; text-transform: uppercase; }
h1, p { margin: 0; max-width: 100%; overflow: hidden; }
h1 { max-height: ${Math.round(size.height * 0.44)}px; font-size: ${Math.round(size.width * 0.064)}px; line-height: 1.03; font-weight: 900; }
p { max-height: ${Math.round(size.height * 0.18)}px; font-size: ${Math.round(size.width * 0.032)}px; line-height: 1.22; opacity: .84; }
${extraCss}
`,
  });
}
