import type { RenderImageInput } from "../types.js";
import { renderPresetDocument, resolvePresetSize, textLayer } from "../preset-document/index.js";

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
  const { width, height } = resolvePresetSize(options);
  const align = options.align ?? "left";

  return renderPresetDocument({
    size: { width, height },
    textColor: options.textColor ?? "#111827",
    fontFamily: options.fontFamily,
    bodyCss: `background: ${options.backgroundColor ?? "#ffffff"};`,
    html: `
    <main class="${align}">
      ${textLayer(options.meta, { className: "meta" })}
      ${textLayer(options.title, { tag: "h1", fit: true, minFontSize: 34 })}
      ${textLayer(options.subtitle, { tag: "p", fit: true, minFontSize: 22 })}
    </main>`,
    css: `
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
  });
}
