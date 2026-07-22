import type { RenderImageInput } from "../types.js";
import { renderPresetDocument, resolvePresetSize, textLayer } from "../preset-document/index.js";

export interface AnnouncementPresetOptions {
  title: string;
  subtitle?: string;
  badge?: string;
  meta?: string;
  cta?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  mutedColor?: string;
  fontFamily?: string;
  width?: number;
  height?: number;
}

export function announcement(options: AnnouncementPresetOptions): RenderImageInput {
  const { width, height } = resolvePresetSize(options);
  const accent = options.accentColor ?? "#2563eb";

  return renderPresetDocument({
    size: { width, height },
    textColor: options.textColor ?? "#0f172a",
    fontFamily: options.fontFamily,
    bodyCss: `
  background:
    linear-gradient(90deg, ${accent} 0 ${Math.round(width * 0.018)}px, transparent ${Math.round(width * 0.018)}px),
    ${options.backgroundColor ?? "#f8fafc"};`,
    html: `
    <main>
      <header>
        ${textLayer(options.badge, { tag: "strong" })}
        ${textLayer(options.meta, { tag: "span" })}
      </header>
      <section>
        ${textLayer(options.title, { tag: "h1", fit: true, minFontSize: 34 })}
        ${textLayer(options.subtitle, { tag: "p", fit: true, minFontSize: 22 })}
      </section>
      ${textLayer(options.cta, { tag: "footer" })}
    </main>`,
    css: `
main {
  width: ${width}px;
  height: ${height}px;
  padding: ${Math.round(height * 0.105)}px ${Math.round(width * 0.09)}px ${Math.round(height * 0.09)}px ${Math.round(width * 0.11)}px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
header { display: flex; align-items: center; gap: ${Math.round(width * 0.025)}px; min-height: ${Math.round(height * 0.07)}px; }
strong {
  max-width: 42%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  padding: ${Math.round(height * 0.014)}px ${Math.round(width * 0.02)}px;
  background: ${accent};
  color: #ffffff;
  font-size: ${Math.round(width * 0.019)}px;
  line-height: 1;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0;
}
span, footer { color: ${options.mutedColor ?? "#475569"}; font-size: ${Math.round(width * 0.026)}px; line-height: 1.1; }
section { display: flex; flex-direction: column; gap: ${Math.round(height * 0.035)}px; }
h1, p { margin: 0; max-width: 100%; overflow: hidden; }
h1 { max-height: ${Math.round(height * 0.4)}px; font-size: ${Math.round(width * 0.072)}px; line-height: 1.03; font-weight: 850; }
p { max-height: ${Math.round(height * 0.18)}px; font-size: ${Math.round(width * 0.034)}px; line-height: 1.22; color: ${options.mutedColor ?? "#475569"}; }
footer { width: fit-content; max-width: 100%; padding-top: ${Math.round(height * 0.025)}px; border-top: ${Math.max(4, Math.round(width * 0.006))}px solid ${accent}; font-weight: 750; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
`,
  });
}
