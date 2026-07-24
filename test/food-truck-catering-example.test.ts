import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("food truck catering example set", () => {
  it("keeps media in variant modifications and documents every manifest variant", async () => {
    const manifest = JSON.parse(await readFile("examples/use-cases/food-truck-catering.manifest.json", "utf8")) as {
      template: string;
      css: string;
      variants: Array<{ title: string; modifyFile: string; output: string }>;
    };
    const html = await readFile("examples/use-cases/food-truck-catering.html", "utf8");
    const readme = await readFile("README.md", "utf8");
    const attribution = await readFile("ATTRIBUTION.md", "utf8");

    expect(manifest.template).toBe("./food-truck-catering.html");
    expect(manifest.css).toBe("./food-truck-catering.css");
    expect(manifest.variants).toHaveLength(3);
    expect(html).not.toContain("unsplash");
    expect(html).not.toContain("food-truck-catering-");

    for (const variant of manifest.variants) {
      const modifications = await readFile(`examples/use-cases/${variant.modifyFile.replace("./", "")}`, "utf8");
      expect(modifications).toContain("./assets/food-truck-catering-");
      expect(readme).toContain(variant.title);
      expect(readme).toContain(variant.output.replace("./", "examples/use-cases/"));
    }

    expect(attribution).toContain("Food Truck Catering Social Posts");
    expect(attribution).toContain("Unsplash License");
  });
});
