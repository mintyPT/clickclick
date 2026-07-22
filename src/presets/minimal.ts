import type { RenderImageInput } from "../types.js";
import { sizes } from "../shared/sizes.js";
import { defaultSansFont, escapeHtml } from "../preset-document/index.js";

export interface MinimalPresetOptions {
  title: string;
  subtitle?: string;
  meta?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  mutedColor?: string;
  align?: "left" | "center";
  fontFamily?: string;
  width?: number;
  height?: number;
}

export function minimal(options: MinimalPresetOptions): RenderImageInput {
  const width = options.width ?? sizes.og.width;
  const height = options.height ?? sizes.og.height;
  const align = options.align ?? "left";
  const safeTitle = escapeHtml(options.title);
  const safeSubtitle = options.subtitle ? escapeHtml(options.subtitle) : "";
  const safeMeta = options.meta ? escapeHtml(options.meta) : "";

  return {
    document: {
      html: `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <main class="${align}">
      ${safeMeta ? `<div class="meta">${safeMeta}</div>` : ""}
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
  background: ${options.backgroundColor ?? "#ffffff"};
  color: ${options.textColor ?? "#111827"};
  font-family: ${options.fontFamily ?? defaultSansFont};
}
main {
  width: ${width}px;
  height: ${height}px;
  padding: ${Math.round(height * 0.13)}px ${Math.round(width * 0.105)}px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: ${Math.round(height * 0.035)}px;
  text-align: ${align};
  border-top: ${Math.max(6, Math.round(width * 0.009))}px solid ${options.accentColor ?? "#111827"};
}
main.center { align-items: center; }
main.left { align-items: flex-start; }
.meta {
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: ${options.mutedColor ?? "#6b7280"};
  font-size: ${Math.round(width * 0.024)}px;
  line-height: 1;
  font-weight: 700;
}
h1, p { margin: 0; width: 100%; max-width: 100%; overflow: hidden; }
h1 { max-height: ${Math.round(height * 0.42)}px; font-size: ${Math.round(width * 0.068)}px; line-height: 1.06; font-weight: 760; }
p { max-height: ${Math.round(height * 0.18)}px; font-size: ${Math.round(width * 0.032)}px; line-height: 1.25; color: ${options.mutedColor ?? "#4b5563"}; }
`,
    },
    viewport: { width, height },
  };
}
