import type { RenderImageInput } from "../types.js";
import { renderPresetDocument, resolvePresetSize, textLayer } from "./layout.js";
import { renderPresetMedia } from "./utils.js";
import type { PresetMediaOptions } from "./utils.js";

export interface AdaptivePresetOptions extends PresetMediaOptions {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  meta?: string;
  backgroundColor?: string;
  panelColor?: string;
  textColor?: string;
  accentColor?: string;
  fontFamily?: string;
  width?: number;
  height?: number;
}

export function adaptive(options: AdaptivePresetOptions): RenderImageInput {
  const size = resolvePresetSize(options);
  const { width, height } = size;
  const media = renderPresetMedia(options, width, height);
  const ratio = width / height;
  const layout = ratio >= 1.45 ? "wide" : ratio <= 0.78 ? "tall" : "balanced";
  const shortEdge = Math.min(width, height);
  const longEdge = Math.max(width, height);
  const padding = Math.round(shortEdge * (layout === "tall" ? 0.085 : 0.09));
  const gap = Math.round(shortEdge * (layout === "wide" ? 0.06 : 0.045));
  const titleSize = Math.round(Math.min(longEdge * 0.082, shortEdge * (layout === "wide" ? 0.24 : 0.18)));
  const subtitleSize = Math.round(Math.min(longEdge * 0.034, shortEdge * 0.07));
  const chromeSize = Math.max(18, Math.round(shortEdge * 0.038));
  const frameInset = Math.round(shortEdge * 0.04);
  const panelColor = options.panelColor ?? "rgba(255,255,255,0.12)";
  const accentColor = options.accentColor ?? "#22d3ee";

  return renderPresetDocument({
    size,
    fontFamily: options.fontFamily,
    textColor: options.textColor,
    bodyCss: `background: ${options.backgroundColor ?? "#171717"};`,
    html: `
    <main class="adaptive ${layout}">
      ${media.html}
      <section class="copy">
        ${textLayer(options.eyebrow, { className: "eyebrow" })}
        ${textLayer(options.title, { tag: "h1", fit: true, minFontSize: 24 })}
        ${textLayer(options.subtitle, { tag: "p", fit: true, minFontSize: 16 })}
      </section>
      <aside class="visual" aria-hidden="true">
        <div class="visual-frame">
          <div class="bar"></div>
          <div class="bars">
            <span></span><span></span><span></span>
          </div>
          <div class="label-strip"></div>
        </div>
      </aside>
      ${textLayer(options.meta, { className: "meta" })}
    </main>`,
    css: `
.adaptive {
  position: relative;
  overflow: hidden;
  width: ${width}px;
  height: ${height}px;
  display: grid;
  gap: ${gap}px;
  padding: ${padding}px;
  background:
    linear-gradient(135deg, rgba(255,255,255,0.09), rgba(255,255,255,0) 42%),
    radial-gradient(circle at 82% 18%, ${accentColor}44 0, transparent ${Math.round(shortEdge * 0.36)}px),
    ${options.backgroundColor ?? "#171717"};
}
.adaptive::before {
  content: "";
  position: absolute;
  inset: ${frameInset}px;
  border: ${Math.max(2, Math.round(shortEdge * 0.006))}px solid rgba(255,255,255,0.18);
  pointer-events: none;
  z-index: 1;
}
.copy,
.visual,
.meta {
  position: relative;
  z-index: 2;
}
.copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: ${Math.round(shortEdge * 0.035)}px;
}
.wide {
  grid-template-columns: minmax(0, 1.25fr) minmax(0, .75fr);
  grid-template-rows: minmax(0, 1fr) auto;
}
.wide .copy { grid-column: 1; grid-row: 1; align-self: center; }
.wide .visual { grid-column: 2; grid-row: 1 / span 2; align-self: stretch; }
.wide .meta { grid-column: 1; grid-row: 2; }
.balanced {
  grid-template-columns: 1fr;
  grid-template-rows: minmax(0, 1fr) minmax(${Math.round(height * 0.24)}px, ${Math.round(height * 0.32)}px) auto;
}
.balanced .copy { text-align: center; align-items: center; }
.balanced .visual { min-height: 0; }
.balanced .meta { text-align: center; }
.tall {
  grid-template-columns: 1fr;
  grid-template-rows: minmax(0, 1.08fr) minmax(${Math.round(height * 0.24)}px, .72fr) auto;
}
.tall .copy { justify-content: flex-end; }
.tall .visual { min-height: 0; }
.eyebrow,
.meta {
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: ${chromeSize}px;
  line-height: 1;
  font-weight: 850;
  text-transform: uppercase;
}
.eyebrow {
  align-self: flex-start;
  padding: ${Math.round(shortEdge * 0.018)}px ${Math.round(shortEdge * 0.03)}px;
  background: ${accentColor};
  color: #111827;
}
.balanced .eyebrow { align-self: center; }
h1,
p {
  margin: 0;
  max-width: 100%;
  overflow: hidden;
}
h1 {
  width: 100%;
  max-height: ${Math.round(height * (layout === "wide" ? 0.54 : 0.42))}px;
  font-size: ${titleSize}px;
  line-height: 1.02;
  font-weight: 900;
}
p {
  width: 100%;
  max-height: ${Math.round(height * 0.2)}px;
  font-size: ${subtitleSize}px;
  line-height: 1.22;
  opacity: .82;
}
.visual {
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  min-width: 0;
}
.visual-frame {
  width: 100%;
  min-height: 100%;
  display: grid;
  grid-template-rows: 1fr auto auto;
  gap: ${Math.round(shortEdge * 0.032)}px;
  padding: ${Math.round(shortEdge * 0.045)}px;
  background: ${panelColor};
  border: ${Math.max(2, Math.round(shortEdge * 0.006))}px solid rgba(255,255,255,0.2);
}
.bar {
  min-height: ${Math.round(shortEdge * 0.14)}px;
  background:
    linear-gradient(135deg, ${accentColor}, rgba(255,255,255,0.92)),
    ${panelColor};
}
.bars {
  display: grid;
  grid-template-columns: ${layout === "wide" ? "1fr" : "1fr 1fr 1fr"};
  gap: ${Math.round(shortEdge * 0.02)}px;
}
.bars span {
  min-height: ${Math.round(shortEdge * (layout === "wide" ? 0.055 : 0.045))}px;
  background: rgba(255,255,255,0.74);
}
.bars span:nth-child(2) { opacity: .52; }
.bars span:nth-child(3) { opacity: .3; }
.label-strip {
  height: ${Math.round(shortEdge * 0.045)}px;
  width: 58%;
  background: ${accentColor};
}
.meta {
  opacity: .72;
}
${media.css}
`,
  });
}
