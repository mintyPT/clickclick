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

  it("renders shared media layers safely", () => {
    const input = presets.solid({
      title: "Launch",
      background: {
        src: 'https://example.com/photo-"wide".jpg',
        fit: "cover",
        position: "center top",
        opacity: 0.7,
        overlay: "rgba(0,0,0,0.35)",
      },
      logo: {
        src: "data:image/svg+xml,%3Csvg%3E%3C/svg%3E",
        placement: "bottom-left",
        size: 96,
        alt: "<Company>",
      },
      watermark: {
        text: "<Draft>",
        placement: "center",
        opacity: 0.18,
        scale: 0.18,
        rotation: -12,
      },
    });

    expect(input.document.html).toContain("preset-media-background");
    expect(input.document.html).toContain("preset-media-logo");
    expect(input.document.html).toContain("&lt;Company&gt;");
    expect(input.document.html).toContain("&lt;Draft&gt;");
    expect(input.document.css).toContain('url("https://example.com/photo-\\"wide\\".jpg")');
    expect(input.document.css).toContain("background-size: cover");
    expect(input.document.css).toContain("opacity: 0.7");
  });
});

describe("new social presets", () => {
  it.each([
    ["announcement", presets.announcement({ title: "Hello", subtitle: "World", badge: "New", meta: "Today", cta: "Read more" })],
    ["checkerboard", presets.checkerboard({ title: "Hello", subtitle: "World", label: "New" })],
    ["compare", presets.compare({ title: "Hello", beforeTitle: "Before", beforeText: "Slow", afterTitle: "After", afterText: "Fast" })],
    ["gradient", presets.gradient({ title: "Hello", subtitle: "World" })],
    ["photoHero", presets.photoHero({ title: "Hello", subtitle: "World", label: "New" })],
    ["editorialFeature", presets.editorialFeature({ title: "Hello", kicker: "Feature", byline: "By Ada" })],
    ["eventPoster", presets.eventPoster({ title: "Hello", date: "May 4", meta: "Online", cta: "Register" })],
    ["caseStudy", presets.caseStudy({ title: "Hello", customer: "Acme", quote: "Great", metric: "42% faster" })],
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
    expect(presets.photoHero({ title: "<script>alert(1)</script>" }).document.html).not.toContain("<script>");
    expect(presets.editorialFeature({ title: "<script>alert(1)</script>" }).document.html).not.toContain("<script>");
    expect(presets.eventPoster({ title: "<script>alert(1)</script>" }).document.html).not.toContain("<script>");
    expect(presets.caseStudy({ title: "<script>alert(1)</script>", quote: "<script>alert(1)</script>" }).document.html).not.toContain("<script>");
    expect(presets.minimal({ title: "<script>alert(1)</script>" }).document.html).not.toContain("<script>");
    expect(presets.split({ title: "<script>alert(1)</script>" }).document.html).not.toContain("<script>");
    expect(presets.quote({ quote: "<script>alert(1)</script>" }).document.html).not.toContain("<script>");
    expect(presets.terminal({ title: "Safe", command: "<script>alert(1)</script>" }).document.html).not.toContain("<script>");
  });

  it("applies additional options to existing presets", () => {
    expect(presets.solid({ title: "Hello", label: "Update", fontFamily: "Arial" }).document.html).toContain("Update");
    expect(presets.gradient({ title: "Hello", label: "Update", align: "center" }).document.html).toContain("class=\"center\"");
    expect(presets.gradient({ title: "Hello", background: { src: "photo.png", overlay: "rgba(0,0,0,.4)" } }).document.css).toContain("preset-media-background");
    expect(presets.photoHero({ title: "Hello", image: "photo.png", logo: { src: "logo.png" } }).document.css).toContain("photo.png");
    expect(presets.editorialFeature({ title: "Hello", image: "photo.png", watermark: { text: "Draft" } }).document.html).toContain("Draft");
    expect(presets.eventPoster({ title: "Hello", image: "photo.png", logo: { src: "logo.png" } }).document.html).toContain("preset-media-logo");
    expect(presets.caseStudy({ title: "Hello", image: "photo.png", watermark: { src: "mark.png" } }).document.css).toContain("mark.png");
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
      "photoHero",
      "editorialFeature",
      "eventPoster",
      "caseStudy",
      "minimal",
      "quote",
      "solid",
      "split",
      "terminal",
    ]);
  });
});
