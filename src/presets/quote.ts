import type { BrandKit, RenderImageInput } from "../types.js";
import { applyBrandToPresetOptions } from "../brand-kit/index.js";
import { defaultSansFont, renderPresetDocument, resolvePresetSize, textLayer } from "../preset-document/index.js";

export interface QuotePresetOptions {
  brand?: BrandKit;
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
  options = applyBrandToPresetOptions(options);
  const { width, height } = resolvePresetSize(options);
  const align = options.align ?? "left";

  return renderPresetDocument({
    size: { width, height },
    textColor: options.textColor ?? "#1c1917",
    fontFamily: options.fontFamily ?? 'Georgia, "Times New Roman", serif',
    bodyCss: `background: ${options.backgroundColor ?? "#fff7ed"};`,
    html: `
    <main class="${align}">
      ${textLayer(options.mark ?? "“", { className: "mark" })}
      ${textLayer(options.quote, { tag: "blockquote", fit: true, minFontSize: 30 })}
      ${options.attribution || options.source ? `<footer>${textLayer(options.attribution, { tag: "strong" })}${textLayer(options.source, { tag: "span" })}</footer>` : ""}
    </main>`,
    css: `
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
  });
}
