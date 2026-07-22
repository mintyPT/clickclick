import type { RenderImageInput } from "../types.js";
import { renderPresetDocument, resolvePresetSize, textLayer } from "../preset-document/index.js";

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
  const { width, height } = resolvePresetSize(options);
  const cell = Math.max(34, Math.round(width * 0.055));
  const accent = options.accentColor ?? "#f59e0b";

  return renderPresetDocument({
    size: { width, height },
    textColor: options.textColor,
    fontFamily: options.fontFamily,
    bodyCss: `
  background-color: ${options.backgroundColor ?? "#111827"};
  background-image:
    linear-gradient(45deg, ${options.checkerColor ?? "rgba(255,255,255,0.08)"} 25%, transparent 25%),
    linear-gradient(-45deg, ${options.checkerColor ?? "rgba(255,255,255,0.08)"} 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, ${options.checkerColor ?? "rgba(255,255,255,0.08)"} 75%),
    linear-gradient(-45deg, transparent 75%, ${options.checkerColor ?? "rgba(255,255,255,0.08)"} 75%);
  background-size: ${cell}px ${cell}px;
  background-position: 0 0, 0 ${cell / 2}px, ${cell / 2}px -${cell / 2}px, -${cell / 2}px 0;`,
    html: `
    <main>
      ${textLayer(options.label, { className: "label" })}
      ${textLayer(options.title, { tag: "h1", fit: true, minFontSize: 34 })}
      ${textLayer(options.subtitle, { tag: "p", fit: true, minFontSize: 22 })}
    </main>`,
    css: `
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
  });
}
