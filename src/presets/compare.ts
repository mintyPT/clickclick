import type { RenderImageInput } from "../types.js";
import { sizes } from "../shared/sizes.js";
import { defaultSansFont, escapeHtml } from "./utils.js";

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
  const width = options.width ?? sizes.og.width;
  const height = options.height ?? sizes.og.height;
  const safeTitle = options.title ? escapeHtml(options.title) : "";
  const safeBeforeTitle = escapeHtml(options.beforeTitle);
  const safeBeforeText = options.beforeText ? escapeHtml(options.beforeText) : "";
  const safeAfterTitle = escapeHtml(options.afterTitle);
  const safeAfterText = options.afterText ? escapeHtml(options.afterText) : "";

  return {
    document: {
      html: `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <main>
      ${safeTitle ? `<h1 data-clickclick-fit data-clickclick-min-font-size="26">${safeTitle}</h1>` : ""}
      <section>
        <article class="before">
          <strong>${safeBeforeTitle}</strong>
          ${safeBeforeText ? `<p data-clickclick-fit data-clickclick-min-font-size="20">${safeBeforeText}</p>` : ""}
        </article>
        <article class="after">
          <strong>${safeAfterTitle}</strong>
          ${safeAfterText ? `<p data-clickclick-fit data-clickclick-min-font-size="20">${safeAfterText}</p>` : ""}
        </article>
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
  background: ${options.backgroundColor ?? "#f1f5f9"};
  color: ${options.textColor ?? "#0f172a"};
  font-family: ${options.fontFamily ?? defaultSansFont};
}
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
    },
    viewport: { width, height },
  };
}
