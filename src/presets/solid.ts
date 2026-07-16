import type { RenderImageInput } from "../types.js";
import { sizes } from "../shared/sizes.js";
import { escapeHtml } from "./utils.js";

export interface SolidPresetOptions {
  title: string;
  subtitle?: string;
  backgroundColor?: string;
  textColor?: string;
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

  return {
    document: {
      html: `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <main class="card ${align}">
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
  background: ${options.backgroundColor ?? "#111827"};
  color: ${options.textColor ?? "#ffffff"};
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.card {
  width: ${width}px;
  height: ${height}px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: ${Math.round(height * 0.04)}px;
  padding: ${Math.round(height * 0.12)}px ${Math.round(width * 0.1)}px;
  text-align: ${align};
}
.card.left { align-items: flex-start; }
.card.center { align-items: center; }
h1, p { margin: 0; max-width: 100%; overflow: hidden; }
h1 { width: 100%; max-height: ${Math.round(height * 0.46)}px; font-size: ${Math.round(width * 0.076)}px; line-height: 1.04; font-weight: 800; }
p { width: 100%; max-height: ${Math.round(height * 0.2)}px; font-size: ${Math.round(width * 0.036)}px; line-height: 1.2; opacity: 0.86; }
`,
    },
    viewport: { width, height },
  };
}
