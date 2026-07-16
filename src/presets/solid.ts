import type { RenderImageInput } from "../types.js";
import { sizes } from "../shared/sizes.js";
import { defaultSansFont, escapeHtml, renderPresetMedia } from "./utils.js";
import type { PresetMediaOptions } from "./utils.js";

export interface SolidPresetOptions extends PresetMediaOptions {
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
  const width = options.width ?? sizes.og.width;
  const height = options.height ?? sizes.og.height;
  const align = options.align ?? "center";
  const safeTitle = escapeHtml(options.title);
  const safeSubtitle = options.subtitle ? escapeHtml(options.subtitle) : "";
  const safeLabel = options.label ? escapeHtml(options.label) : "";
  const media = renderPresetMedia(options, width, height);

  return {
    document: {
      html: `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <main class="card ${align}">
      ${media.html}
      <section class="content">
      ${safeLabel ? `<div class="label">${safeLabel}</div>` : ""}
      <h1 data-clickclick-fit data-clickclick-min-font-size="34">${safeTitle}</h1>
      ${safeSubtitle ? `<p data-clickclick-fit data-clickclick-min-font-size="22">${safeSubtitle}</p>` : ""}
      </section>
    </main>
  </body>
</html>`,
      css: `
* { box-sizing: border-box; }
html, body { margin: 0; width: 100%; height: 100%; }
body {
  width: ${width}px;
  height: ${height}px;
  background: ${options.backgroundColor ?? "#111827"};
  color: ${options.textColor ?? "#ffffff"};
  font-family: ${options.fontFamily ?? defaultSansFont};
}
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
    },
    viewport: { width, height },
  };
}
