import type { RenderImageInput } from "../types.js";
import { renderPresetDocument, resolvePresetSize, textLayer } from "../preset-document/index.js";
import { renderPresetMedia } from "./utils.js";
import type { PresetMediaOptions } from "./utils.js";

export interface GradientPresetOptions extends PresetMediaOptions {
  title: string;
  subtitle?: string;
  label?: string;
  fromColor?: string;
  toColor?: string;
  accentColor?: string;
  textColor?: string;
  align?: "left" | "center";
  fontFamily?: string;
  width?: number;
  height?: number;
}

export function gradient(options: GradientPresetOptions): RenderImageInput {
  const { width, height } = resolvePresetSize(options);
  const align = options.align ?? "left";
  const accentColor = options.accentColor ?? "rgba(255,255,255,0.28)";
  const media = renderPresetMedia(options, width, height);

  return renderPresetDocument({
    size: { width, height },
    fontFamily: options.fontFamily,
    textColor: options.textColor,
    bodyCss: `
  background:
    radial-gradient(circle at 82% 18%, ${accentColor}, transparent 28%),
    linear-gradient(135deg, ${options.fromColor ?? "#0f766e"} 0%, ${options.toColor ?? "#7c3aed"} 100%);
`,
    html: `
    <main class="${align}">
      ${media.html}
      <div class="accent"></div>
      <section>
        ${textLayer(options.label, { className: "label" })}
        ${textLayer(options.title, { tag: "h1", fit: true, minFontSize: 34 })}
        ${textLayer(options.subtitle, { tag: "p", fit: true, minFontSize: 22 })}
      </section>
    </main>`,
    css: `
main {
  position: relative;
  overflow: hidden;
  width: ${width}px;
  height: ${height}px;
  padding: ${Math.round(height * 0.12)}px ${Math.round(width * 0.1)}px;
  display: flex;
  align-items: flex-end;
  text-align: ${align};
}
.accent {
  position: absolute;
  z-index: 2;
  top: ${Math.round(height * 0.09)}px;
  left: ${Math.round(width * 0.1)}px;
  width: ${Math.round(width * 0.18)}px;
  height: ${Math.max(10, Math.round(height * 0.018))}px;
  background: ${accentColor};
}
section { position: relative; z-index: 2; width: 100%; display: flex; flex-direction: column; align-items: ${align === "center" ? "center" : "flex-start"}; gap: ${Math.round(height * 0.04)}px; }
.label {
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  padding: ${Math.round(height * 0.014)}px ${Math.round(width * 0.022)}px;
  background: ${accentColor};
  font-size: ${Math.round(width * 0.019)}px;
  line-height: 1;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0;
}
h1, p { margin: 0; max-width: 100%; overflow: hidden; }
h1 { max-height: ${Math.round(height * 0.48)}px; font-size: ${Math.round(width * 0.078)}px; line-height: 1.02; font-weight: 850; }
p { max-height: ${Math.round(height * 0.18)}px; font-size: ${Math.round(width * 0.035)}px; line-height: 1.2; opacity: 0.88; }
${media.css}
`,
  });
}
