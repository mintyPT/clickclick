import type { BrandKit, RenderImageInput } from "../types.js";
import { applyBrandToPresetOptions } from "../brand-kit/index.js";
import { renderPresetDocument, resolvePresetSize, textLayer } from "../preset-document/index.js";
import { renderPresetMedia } from "./utils.js";
import type { PresetMediaOptions } from "./utils.js";

export interface SolidPresetOptions extends PresetMediaOptions {
  brand?: BrandKit;
  title: string;
  subtitle?: string;
  label?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  fontFamily?: string;
  width?: number;
  height?: number;
  align?: "left" | "center";
}

export function solid(options: SolidPresetOptions): RenderImageInput {
  options = applyBrandToPresetOptions(options);
  const { width, height } = resolvePresetSize(options);
  const align = options.align ?? "center";
  const media = renderPresetMedia(options, width, height);

  return renderPresetDocument({
    size: { width, height },
    fontFamily: options.fontFamily,
    textColor: options.textColor,
    bodyCss: `background: ${options.backgroundColor ?? "#111827"};`,
    html: `
    <main class="card ${align}">
      ${media.html}
      <section class="content">
      ${textLayer(options.label, { className: "label" })}
      ${textLayer(options.title, { tag: "h1", fit: true, minFontSize: 34 })}
      ${textLayer(options.subtitle, { tag: "p", fit: true, minFontSize: 22 })}
      </section>
    </main>`,
    css: `
.card {
  position: relative;
  overflow: hidden;
  width: ${width}px;
  height: ${height}px;
}
.content {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: ${Math.round(height * 0.04)}px;
  padding: ${Math.round(height * 0.12)}px ${Math.round(width * 0.1)}px;
  text-align: ${align};
}
.card.left .content { align-items: flex-start; }
.card.center .content { align-items: center; }
.label {
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  padding: ${Math.round(height * 0.015)}px ${Math.round(width * 0.022)}px;
  background: ${options.accentColor ?? "rgba(255,255,255,0.14)"};
  color: ${options.textColor ?? "#ffffff"};
  font-size: ${Math.round(width * 0.02)}px;
  line-height: 1;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0;
}
h1, p { margin: 0; max-width: 100%; overflow: hidden; }
h1 { width: 100%; max-height: ${Math.round(height * 0.46)}px; font-size: ${Math.round(width * 0.076)}px; line-height: 1.04; font-weight: 800; }
p { width: 100%; max-height: ${Math.round(height * 0.2)}px; font-size: ${Math.round(width * 0.036)}px; line-height: 1.2; opacity: 0.86; }
${media.css}
`,
  });
}
