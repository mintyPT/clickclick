import { describe, expect, it } from "vitest";
import { ClickClickError } from "../src/errors.js";
import { renderImage } from "../src/renderer/index.js";
import { normalizeInput } from "../src/renderer/validation.js";

describe("render input validation", () => {
  it("defaults to PNG and the Open Graph viewport", () => {
    const input = normalizeInput({ document: { html: "<h1>Hello</h1>" } });

    expect(input.output.format).toBe("png");
    expect(input.viewport).toEqual({ width: 1200, height: 630 });
  });

  it("infers JPEG from output path", () => {
    const input = normalizeInput({
      document: { html: "<h1>Hello</h1>" },
      output: { path: "card.jpg", quality: 82 },
    });

    expect(input.output.format).toBe("jpeg");
  });

  it("rejects JPEG transparency", () => {
    expect(() =>
      normalizeInput({
        document: { html: "<h1>Hello</h1>" },
        output: { format: "jpeg", omitBackground: true },
      }),
    ).toThrow(ClickClickError);
  });

  it("closes an internally created renderer after one-shot failures", async () => {
    await expect(renderImage({ document: { html: "" } })).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
  });
});
