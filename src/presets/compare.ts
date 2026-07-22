import type { RenderImageInput } from "../types.js";
import { renderPresetDocument, resolvePresetSize, textLayer } from "../preset-document/index.js";

export interface ComparePresetOptions {
  title?: string;
  beforeTitle: string;
  beforeText?: string;
  afterTitle: string;
  afterText?: string;
  backgroundColor?: string;
  beforeColor?: string;
  afterColor?: string;
  textColor?: string;
  accentColor?: string;
  fontFamily?: string;
  width?: number;
  height?: number;
}

export function compare(options: ComparePresetOptions): RenderImageInput {
  const { width, height } = resolvePresetSize(options);

  return renderPresetDocument({
    size: { width, height },
    textColor: options.textColor ?? "#0f172a",
    fontFamily: options.fontFamily,
    bodyCss: `background: ${options.backgroundColor ?? "#f1f5f9"};`,
    html: `
    <main>
      ${textLayer(options.title, { tag: "h1", fit: true, minFontSize: 26 })}
      <section>
        <article class="before">
          ${textLayer(options.beforeTitle, { tag: "strong" })}
          ${textLayer(options.beforeText, { tag: "p", fit: true, minFontSize: 20 })}
        </article>
        <article class="after">
          ${textLayer(options.afterTitle, { tag: "strong" })}
          ${textLayer(options.afterText, { tag: "p", fit: true, minFontSize: 20 })}
        </article>
      </section>
    </main>`,
    css: `
main {
  width: ${width}px;
  height: ${height}px;
  padding: ${Math.round(height * 0.095)}px ${Math.round(width * 0.075)}px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: ${Math.round(height * 0.055)}px;
}
h1 {
  margin: 0;
  max-height: ${Math.round(height * 0.15)}px;
  overflow: hidden;
  font-size: ${Math.round(width * 0.044)}px;
  line-height: 1.08;
  font-weight: 850;
  text-align: center;
}
section { display: grid; grid-template-columns: 1fr 1fr; gap: ${Math.round(width * 0.035)}px; min-height: ${Math.round(height * 0.42)}px; }
article {
  min-width: 0;
  padding: ${Math.round(height * 0.06)}px ${Math.round(width * 0.04)}px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: ${Math.round(height * 0.03)}px;
  border-top: ${Math.max(8, Math.round(width * 0.01))}px solid ${options.accentColor ?? "#0ea5e9"};
}
.before { background: ${options.beforeColor ?? "#ffffff"}; }
.after { background: ${options.afterColor ?? "#dcfce7"}; }
strong {
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: ${Math.round(width * 0.029)}px;
  line-height: 1;
  font-weight: 850;
  text-transform: uppercase;
  letter-spacing: 0;
}
p {
  margin: 0;
  max-height: ${Math.round(height * 0.28)}px;
  overflow: hidden;
  font-size: ${Math.round(width * 0.042)}px;
  line-height: 1.12;
  font-weight: 760;
}
`,
  });
}
