import type { RenderImageInput } from "../types.js";
import { sizes } from "../shared/sizes.js";
import { defaultSansFont, escapeHtml } from "../preset-document/index.js";

export interface CheckerboardPresetOptions {
  title: string;
  subtitle?: string;
  label?: string;
  backgroundColor?: string;
  checkerColor?: string;
  textColor?: string;
  accentColor?: string;
  fontFamily?: string;
  width?: number;
  height?: number;
}

export function checkerboard(options: CheckerboardPresetOptions): RenderImageInput {
  const width = options.width ?? sizes.og.width;
  const height = options.height ?? sizes.og.height;
  const safeTitle = escapeHtml(options.title);
  const safeSubtitle = options.subtitle ? escapeHtml(options.subtitle) : "";
  const safeLabel = options.label ? escapeHtml(options.label) : "";
  const cell = Math.max(34, Math.round(width * 0.055));
  const accent = options.accentColor ?? "#f59e0b";

  return {
    document: {
      html: `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <main>
      ${safeLabel ? `<div class="label">${safeLabel}</div>` : ""}
      <h1 data-clickclick-fit data-clickclick-min-font-size="34">${safeTitle}</h1>
      ${safeSubtitle ? `<p data-clickclick-fit data-clickclick-min-font-size="22">${safeSubtitle}</p>` : ""}
    </main>
  </body>
</html>`,
      css: `
* { box-sizing: border-box; }
html, body { margin: 0; width: 100%; height: 100%; }
body {
  width: ${width}px;
  height: ${height}px;
  background-color: ${options.backgroundColor ?? "#111827"};
  background-image:
    linear-gradient(45deg, ${options.checkerColor ?? "rgba(255,255,255,0.08)"} 25%, transparent 25%),
    linear-gradient(-45deg, ${options.checkerColor ?? "rgba(255,255,255,0.08)"} 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, ${options.checkerColor ?? "rgba(255,255,255,0.08)"} 75%),
    linear-gradient(-45deg, transparent 75%, ${options.checkerColor ?? "rgba(255,255,255,0.08)"} 75%);
  background-size: ${cell}px ${cell}px;
  background-position: 0 0, 0 ${cell / 2}px, ${cell / 2}px -${cell / 2}px, -${cell / 2}px 0;
  color: ${options.textColor ?? "#ffffff"};
  font-family: ${options.fontFamily ?? defaultSansFont};
}
main {
  width: ${width}px;
  height: ${height}px;
  padding: ${Math.round(height * 0.11)}px ${Math.round(width * 0.1)}px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: ${Math.round(height * 0.035)}px;
  text-align: center;
}
.label {
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  padding: ${Math.round(height * 0.015)}px ${Math.round(width * 0.024)}px;
  background: ${accent};
  color: #111827;
  font-size: ${Math.round(width * 0.02)}px;
  line-height: 1;
  font-weight: 850;
  text-transform: uppercase;
  letter-spacing: 0;
}
h1, p { margin: 0; width: 100%; max-width: 100%; overflow: hidden; }
h1 { max-height: ${Math.round(height * 0.42)}px; font-size: ${Math.round(width * 0.074)}px; line-height: 1.02; font-weight: 900; }
p { max-height: ${Math.round(height * 0.16)}px; font-size: ${Math.round(width * 0.034)}px; line-height: 1.2; opacity: 0.86; }
`,
    },
    viewport: { width, height },
  };
}
