import type { RenderImageInput } from "../types.js";
import { sizes } from "../shared/sizes.js";
import { escapeHtml } from "./utils.js";

export interface GradientPresetOptions {
  title: string;
  subtitle?: string;
  fromColor?: string;
  toColor?: string;
  accentColor?: string;
  textColor?: string;
  width?: number;
  height?: number;
}

export function gradient(options: GradientPresetOptions): RenderImageInput {
  const width = options.width ?? sizes.og.width;
  const height = options.height ?? sizes.og.height;
  const safeTitle = escapeHtml(options.title);
  const safeSubtitle = options.subtitle ? escapeHtml(options.subtitle) : "";
  const accentColor = options.accentColor ?? "rgba(255,255,255,0.28)";

  return {
    document: {
      html: `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <main>
      <div class="accent"></div>
      <section>
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
  color: ${options.textColor ?? "#ffffff"};
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background:
    radial-gradient(circle at 82% 18%, ${accentColor}, transparent 28%),
    linear-gradient(135deg, ${options.fromColor ?? "#0f766e"} 0%, ${options.toColor ?? "#7c3aed"} 100%);
}
main {
  position: relative;
  width: ${width}px;
  height: ${height}px;
  padding: ${Math.round(height * 0.12)}px ${Math.round(width * 0.1)}px;
  display: flex;
  align-items: flex-end;
}
.accent {
  position: absolute;
  top: ${Math.round(height * 0.09)}px;
  left: ${Math.round(width * 0.1)}px;
  width: ${Math.round(width * 0.18)}px;
  height: ${Math.max(10, Math.round(height * 0.018))}px;
  background: ${accentColor};
}
section { width: 100%; display: flex; flex-direction: column; gap: ${Math.round(height * 0.04)}px; }
h1, p { margin: 0; max-width: 100%; overflow: hidden; }
h1 { max-height: ${Math.round(height * 0.48)}px; font-size: ${Math.round(width * 0.078)}px; line-height: 1.02; font-weight: 850; }
p { max-height: ${Math.round(height * 0.18)}px; font-size: ${Math.round(width * 0.035)}px; line-height: 1.2; opacity: 0.88; }
`,
    },
    viewport: { width, height },
  };
}
