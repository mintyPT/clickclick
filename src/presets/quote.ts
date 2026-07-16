import type { RenderImageInput } from "../types.js";
import { sizes } from "../shared/sizes.js";
import { defaultSansFont, escapeHtml } from "./utils.js";

export interface QuotePresetOptions {
  quote: string;
  attribution?: string;
  source?: string;
  mark?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  fontFamily?: string;
  align?: "left" | "center";
  width?: number;
  height?: number;
}

export function quote(options: QuotePresetOptions): RenderImageInput {
  const width = options.width ?? sizes.og.width;
  const height = options.height ?? sizes.og.height;
  const align = options.align ?? "left";
  const safeQuote = escapeHtml(options.quote);
  const safeAttribution = options.attribution ? escapeHtml(options.attribution) : "";
  const safeSource = options.source ? escapeHtml(options.source) : "";
  const safeMark = escapeHtml(options.mark ?? "“");

  return {
    document: {
      html: `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <main class="${align}">
      <div class="mark">${safeMark}</div>
      <blockquote data-clickclick-fit data-clickclick-min-font-size="30">${safeQuote}</blockquote>
      ${safeAttribution || safeSource ? `<footer>${safeAttribution ? `<strong>${safeAttribution}</strong>` : ""}${safeSource ? `<span>${safeSource}</span>` : ""}</footer>` : ""}
    </main>
  </body>
</html>`,
      css: `
* { box-sizing: border-box; }
html, body { margin: 0; width: 100%; height: 100%; }
body {
  width: ${width}px;
  height: ${height}px;
  background: ${options.backgroundColor ?? "#fff7ed"};
  color: ${options.textColor ?? "#1c1917"};
  font-family: ${options.fontFamily ?? 'Georgia, "Times New Roman", serif'};
}
main {
  width: ${width}px;
  height: ${height}px;
  padding: ${Math.round(height * 0.11)}px ${Math.round(width * 0.1)}px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: ${Math.round(height * 0.04)}px;
  text-align: ${align};
}
main.center { align-items: center; }
main.left { align-items: flex-start; }
.mark {
  height: ${Math.round(height * 0.12)}px;
  color: ${options.accentColor ?? "#ea580c"};
  font-size: ${Math.round(width * 0.16)}px;
  line-height: 0.8;
  font-weight: 700;
}
blockquote {
  margin: 0;
  max-width: 100%;
  max-height: ${Math.round(height * 0.48)}px;
  overflow: hidden;
  font-size: ${Math.round(width * 0.056)}px;
  line-height: 1.1;
  font-weight: 700;
}
footer {
  display: flex;
  flex-direction: column;
  gap: ${Math.round(height * 0.014)}px;
  border-left: ${Math.max(5, Math.round(width * 0.007))}px solid ${options.accentColor ?? "#ea580c"};
  padding-left: ${Math.round(width * 0.026)}px;
  font-family: ${defaultSansFont};
  text-align: left;
}
strong, span { max-width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
strong { font-size: ${Math.round(width * 0.03)}px; line-height: 1.1; }
span { font-size: ${Math.round(width * 0.023)}px; line-height: 1.1; opacity: 0.7; }
`,
    },
    viewport: { width, height },
  };
}
