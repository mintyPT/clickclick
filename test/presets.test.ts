import { describe, expect, it } from "vitest";
import { presets, sizes } from "../src/index.js";
import { presetMetadata } from "../src/presets/index.js";

describe("solid preset", () => {
  it("returns a renderer input with default Open Graph size", () => {
    const input = presets.solid({ title: "Hello", subtitle: "World" });

    expect(input.viewport).toEqual(sizes.og);
    expect(input.document.html).toContain("data-clickclick-fit");
    expect(input.document.css).toContain("background:");
  });

  it("escapes user-authored text", () => {
    const input = presets.solid({ title: "<script>alert(1)</script>" });

    expect(input.document.html).toContain("&lt;script&gt;");
    expect(input.document.html).not.toContain("<script>");
  });

  it("has internal CLI metadata", () => {
    expect(presetMetadata).toContainEqual({
      name: "solid",
      description: expect.stringContaining("Solid-background"),
    });
  });
});
