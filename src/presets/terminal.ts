import type { RenderImageInput } from "../types.js";
import { sizes } from "../shared/sizes.js";
import { defaultMonoFont, defaultSansFont, escapeHtml } from "./utils.js";

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
  const width = options.width ?? sizes.og.width;
  const height = options.height ?? sizes.og.height;
  const safeTitle = escapeHtml(options.title);
  const safeSubtitle = options.subtitle ? escapeHtml(options.subtitle) : "";
  const safeCommand = escapeHtml(options.command);
  const safePrompt = escapeHtml(options.prompt ?? "$");
  const safeOutput = options.output ? escapeHtml(options.output) : "";

  return {
    document: {
      html: `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <main>
      <section>
        <h1 data-clickclick-fit data-clickclick-min-font-size="32">${safeTitle}</h1>
        ${safeSubtitle ? `<p data-clickclick-fit data-clickclick-min-font-size="20">${safeSubtitle}</p>` : ""}
      </section>
      <pre><span>${safePrompt}</span> <code data-clickclick-fit data-clickclick-min-font-size="18">${safeCommand}</code>${safeOutput ? `<small>${safeOutput}</small>` : ""}</pre>
    </main>
  </body>
</html>`,
      css: `
* { box-sizing: border-box; }
html, body { margin: 0; width: 100%; height: 100%; }
body {
  width: ${width}px;
  height: ${height}px;
  background:
    linear-gradient(120deg, rgba(255,255,255,0.05), transparent 42%),
    ${options.backgroundColor ?? "#0b1020"};
  color: ${options.textColor ?? "#f8fafc"};
  font-family: ${options.fontFamily ?? defaultSansFont};
}
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
    },
    viewport: { width, height },
  };
}
