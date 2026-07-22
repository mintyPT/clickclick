import { describe, expect, it } from "vitest";
import {
  imageLayer,
  renderPresetDocument,
  resolvePresetSize,
  textLayer,
} from "../src/preset-document/index.js";
import { sizes } from "../src/index.js";

describe("preset document assembly", () => {
  it("resolves default and custom preset sizes", () => {
    expect(resolvePresetSize({})).toEqual(sizes.og);
    expect(resolvePresetSize({ width: 600, height: 315 })).toEqual({ width: 600, height: 315 });
  });

  it("renders escaped text layers with fit attributes", () => {
    expect(textLayer("<Launch>", {
      tag: "h1",
      className: "hero",
      fit: true,
      minFontSize: 24,
      attributes: {
        "data-kind": "title",
        hidden: false,
        inert: true,
      },
    })).toBe('<h1 class="hero" data-clickclick-fit data-clickclick-min-font-size="24" data-kind="title" inert>&lt;Launch&gt;</h1>');
    expect(textLayer("npm test", { tag: "code", fit: true, minFontSize: 18 })).toBe('<code data-clickclick-fit data-clickclick-min-font-size="18">npm test</code>');
  });

  it("renders escaped image layers", () => {
    expect(imageLayer("https://example.com/a.svg", {
      className: "logo",
      alt: "<Logo>",
      ariaHidden: true,
    })).toBe('<img class="logo" src="https://example.com/a.svg" alt="&lt;Logo&gt;" aria-hidden="true" />');
  });

  it("renders a complete preset document shell", () => {
    const input = renderPresetDocument({
      size: { width: 320, height: 180 },
      html: '<main class="card">Hello</main>',
      css: ".card { color: red; }",
      textColor: "#111827",
      bodyCss: "background: #fff;",
    });

    expect(input.viewport).toEqual({ width: 320, height: 180 });
    expect(input.document.html).toContain("<!doctype html>");
    expect(input.document.html).toContain('<main class="card">Hello</main>');
    expect(input.document.css).toContain("width: 320px;");
    expect(input.document.css).toContain("background: #fff;");
    expect(input.document.css).toContain(".card { color: red; }");
  });
});
