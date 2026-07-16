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

describe("new social presets", () => {
  it.each([
    ["announcement", presets.announcement({ title: "Hello", subtitle: "World", badge: "New", meta: "Today", cta: "Read more" })],
    ["checkerboard", presets.checkerboard({ title: "Hello", subtitle: "World", label: "New" })],
    ["compare", presets.compare({ title: "Hello", beforeTitle: "Before", beforeText: "Slow", afterTitle: "After", afterText: "Fast" })],
    ["gradient", presets.gradient({ title: "Hello", subtitle: "World" })],
    ["minimal", presets.minimal({ title: "Hello", subtitle: "World", meta: "Notes" })],
    ["split", presets.split({ title: "Hello", subtitle: "World", label: "New" })],
    ["quote", presets.quote({ quote: "Hello", attribution: "Ada", source: "Notes" })],
    ["terminal", presets.terminal({ title: "Hello", command: "npm run build", subtitle: "World" })],
  ] as const)("%s returns a renderer input with default Open Graph size", (_name, input) => {
    expect(input.viewport).toEqual(sizes.og);
    expect(input.document.html).toContain("data-clickclick-fit");
    expect(input.document.css).toBeTruthy();
  });

  it("escapes user-authored text in new presets", () => {
    expect(presets.announcement({ title: "<script>alert(1)</script>" }).document.html).not.toContain("<script>");
    expect(presets.checkerboard({ title: "<script>alert(1)</script>" }).document.html).not.toContain("<script>");
    expect(presets.compare({ beforeTitle: "<script>alert(1)</script>", afterTitle: "Safe" }).document.html).not.toContain("<script>");
    expect(presets.gradient({ title: "<script>alert(1)</script>" }).document.html).not.toContain("<script>");
    expect(presets.minimal({ title: "<script>alert(1)</script>" }).document.html).not.toContain("<script>");
    expect(presets.split({ title: "<script>alert(1)</script>" }).document.html).not.toContain("<script>");
    expect(presets.quote({ quote: "<script>alert(1)</script>" }).document.html).not.toContain("<script>");
    expect(presets.terminal({ title: "Safe", command: "<script>alert(1)</script>" }).document.html).not.toContain("<script>");
  });

  it("applies additional options to existing presets", () => {
    expect(presets.solid({ title: "Hello", label: "Update", fontFamily: "Arial" }).document.html).toContain("Update");
    expect(presets.gradient({ title: "Hello", label: "Update", align: "center" }).document.html).toContain("class=\"center\"");
    expect(presets.quote({ quote: "Hello", mark: ">>", align: "center" }).document.html).toContain("&gt;&gt;");
    expect(presets.split({ title: "Hello", panelSide: "left" }).document.css).toContain("grid-template-columns: 1fr 1.45fr");
    expect(presets.terminal({ title: "Hello", command: "npm test", prompt: ">", output: "done" }).document.html).toContain("done");
  });

  it("has internal CLI metadata for every exported preset", () => {
    expect(presetMetadata.map((preset) => preset.name)).toEqual([
      "announcement",
      "checkerboard",
      "compare",
      "gradient",
      "minimal",
      "quote",
      "solid",
      "split",
      "terminal",
    ]);
  });
});
