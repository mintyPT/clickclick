import type { RenderImageInput } from "../types.js";
import { renderPresetDocument, resolvePresetSize, textLayer } from "../preset-document/index.js";

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
  const { width, height } = resolvePresetSize(options);
  const panelSide = options.panelSide ?? "right";
  const copyFirst = panelSide === "right";
  const copy = `<section class="copy">
        ${textLayer(options.label, { className: "label" })}
        ${textLayer(options.title, { tag: "h1", fit: true, minFontSize: 32 })}
        ${textLayer(options.subtitle, { tag: "p", fit: true, minFontSize: 20 })}
      </section>`;

  return renderPresetDocument({
    size: { width, height },
    textColor: options.textColor ?? "#0f172a",
    fontFamily: options.fontFamily,
    bodyCss: `background: ${options.backgroundColor ?? "#f8fafc"};`,
    html: `
    <main>
      ${copyFirst ? copy : ""}
      <aside>
        <div class="rule"></div>
        <div class="dot"></div>
      </aside>
      ${copyFirst ? "" : copy}
    </main>`,
    css: `
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
  });
}
