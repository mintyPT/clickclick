import type { RenderImageInput } from "../types.js";
import { defaultMonoFont, renderPresetDocument, resolvePresetSize, textLayer } from "../preset-document/index.js";

export interface TerminalPresetOptions {
  title: string;
  command: string;
  subtitle?: string;
  prompt?: string;
  output?: string;
  backgroundColor?: string;
  terminalColor?: string;
  textColor?: string;
  commandColor?: string;
  accentColor?: string;
  fontFamily?: string;
  monoFontFamily?: string;
  width?: number;
  height?: number;
}

export function terminal(options: TerminalPresetOptions): RenderImageInput {
  const { width, height } = resolvePresetSize(options);

  return renderPresetDocument({
    size: { width, height },
    textColor: options.textColor ?? "#f8fafc",
    fontFamily: options.fontFamily,
    bodyCss: `
  background:
    linear-gradient(120deg, rgba(255,255,255,0.05), transparent 42%),
    ${options.backgroundColor ?? "#0b1020"};`,
    html: `
    <main>
      <section>
        ${textLayer(options.title, { tag: "h1", fit: true, minFontSize: 32 })}
        ${textLayer(options.subtitle, { tag: "p", fit: true, minFontSize: 20 })}
      </section>
      <pre>${textLayer(options.prompt ?? "$", { tag: "span" })} ${textLayer(options.command, { tag: "code", fit: true, minFontSize: 18 })}${textLayer(options.output, { tag: "small" })}</pre>
    </main>`,
    css: `
main {
  width: ${width}px;
  height: ${height}px;
  padding: ${Math.round(height * 0.1)}px ${Math.round(width * 0.085)}px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: ${Math.round(height * 0.06)}px;
}
section { display: flex; flex-direction: column; gap: ${Math.round(height * 0.03)}px; }
h1, p { margin: 0; max-width: 100%; overflow: hidden; }
h1 { max-height: ${Math.round(height * 0.28)}px; font-size: ${Math.round(width * 0.062)}px; line-height: 1.05; font-weight: 850; }
p { max-height: ${Math.round(height * 0.13)}px; font-size: ${Math.round(width * 0.03)}px; line-height: 1.2; opacity: 0.76; }
pre {
  margin: 0;
  width: 100%;
  min-height: ${Math.round(height * 0.18)}px;
  padding: ${Math.round(height * 0.045)}px ${Math.round(width * 0.038)}px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${Math.round(width * 0.012)}px;
  overflow: hidden;
  background: ${options.terminalColor ?? "#111827"};
  border: ${Math.max(2, Math.round(width * 0.003))}px solid rgba(255,255,255,0.12);
  box-shadow: ${Math.round(width * 0.016)}px ${Math.round(width * 0.016)}px 0 ${options.accentColor ?? "#22c55e"};
  color: #e5e7eb;
  font-family: ${options.monoFontFamily ?? defaultMonoFont};
  font-size: ${Math.round(width * 0.028)}px;
  line-height: 1.2;
}
span { color: ${options.accentColor ?? "#22c55e"}; font-weight: 800; }
code { display: block; max-width: calc(100% - ${Math.round(width * 0.032)}px); overflow: hidden; white-space: nowrap; color: ${options.commandColor ?? "#e5e7eb"}; }
small { display: block; flex-basis: 100%; max-width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: rgba(229,231,235,0.7); font-size: ${Math.round(width * 0.021)}px; line-height: 1.2; }
`,
  });
}
