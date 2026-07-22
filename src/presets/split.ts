import type { RenderImageInput } from "../types.js";
import { sizes } from "../shared/sizes.js";
import { defaultSansFont, escapeHtml } from "../preset-document/index.js";

export interface SplitPresetOptions {
  title: string;
  subtitle?: string;
  label?: string;
  backgroundColor?: string;
  panelColor?: string;
  accentColor?: string;
  textColor?: string;
  panelSide?: "left" | "right";
  fontFamily?: string;
  width?: number;
  height?: number;
}

export function split(options: SplitPresetOptions): RenderImageInput {
  const width = options.width ?? sizes.og.width;
  const height = options.height ?? sizes.og.height;
  const safeTitle = escapeHtml(options.title);
  const safeSubtitle = options.subtitle ? escapeHtml(options.subtitle) : "";
  const safeLabel = options.label ? escapeHtml(options.label) : "";
  const panelSide = options.panelSide ?? "right";
  const copyFirst = panelSide === "right";

  return {
    document: {
      html: `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <main>
      ${copyFirst ? `<section class="copy">
        ${safeLabel ? `<div class="label">${safeLabel}</div>` : ""}
        <h1 data-clickclick-fit data-clickclick-min-font-size="32">${safeTitle}</h1>
        ${safeSubtitle ? `<p data-clickclick-fit data-clickclick-min-font-size="20">${safeSubtitle}</p>` : ""}
      </section>` : ""}
      <aside>
        <div class="rule"></div>
        <div class="dot"></div>
      </aside>
      ${copyFirst ? "" : `<section class="copy">
        ${safeLabel ? `<div class="label">${safeLabel}</div>` : ""}
        <h1 data-clickclick-fit data-clickclick-min-font-size="32">${safeTitle}</h1>
        ${safeSubtitle ? `<p data-clickclick-fit data-clickclick-min-font-size="20">${safeSubtitle}</p>` : ""}
      </section>`}
    </main>
  </body>
</html>`,
      css: `
* { box-sizing: border-box; }
html, body { margin: 0; width: 100%; height: 100%; }
body {
  width: ${width}px;
  height: ${height}px;
  background: ${options.backgroundColor ?? "#f8fafc"};
  color: ${options.textColor ?? "#0f172a"};
  font-family: ${options.fontFamily ?? defaultSansFont};
}
main {
  width: ${width}px;
  height: ${height}px;
  display: grid;
  grid-template-columns: ${copyFirst ? "1.45fr 1fr" : "1fr 1.45fr"};
}
.copy {
  min-width: 0;
  padding: ${Math.round(height * 0.13)}px ${Math.round(width * 0.07)}px ${Math.round(height * 0.11)}px ${Math.round(width * 0.09)}px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: ${Math.round(height * 0.035)}px;
}
.label {
  width: fit-content;
  max-width: 100%;
  padding: ${Math.round(height * 0.016)}px ${Math.round(width * 0.022)}px;
  background: ${options.accentColor ?? "#14b8a6"};
  color: #ffffff;
  font-size: ${Math.round(width * 0.019)}px;
  line-height: 1;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0;
}
aside {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(150deg, transparent 0 34%, ${options.accentColor ?? "#14b8a6"} 34% 47%, transparent 47% 100%),
    ${options.panelColor ?? "#111827"};
}
.rule {
  position: absolute;
  inset: ${Math.round(height * 0.1)}px ${Math.round(width * 0.055)}px;
  border: ${Math.max(4, Math.round(width * 0.008))}px solid rgba(255,255,255,0.2);
}
.dot {
  position: absolute;
  right: ${Math.round(width * 0.085)}px;
  bottom: ${Math.round(height * 0.13)}px;
  width: ${Math.round(width * 0.12)}px;
  height: ${Math.round(width * 0.12)}px;
  border-radius: 999px;
  background: ${options.accentColor ?? "#14b8a6"};
}
h1, p { margin: 0; max-width: 100%; overflow: hidden; }
h1 { max-height: ${Math.round(height * 0.42)}px; font-size: ${Math.round(width * 0.064)}px; line-height: 1.04; font-weight: 850; }
p { max-height: ${Math.round(height * 0.18)}px; font-size: ${Math.round(width * 0.031)}px; line-height: 1.25; color: color-mix(in srgb, currentColor 76%, transparent); }
`,
    },
    viewport: { width, height },
  };
}
