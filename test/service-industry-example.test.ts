import { access, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("service industry social example set", () => {
  it("documents one distinct asset-driven template for each requested industry", async () => {
    const manifests = [
      "health-wellness-social.manifest.json",
      "interior-design-social.manifest.json",
      "real-estate-social.manifest.json",
      "music-entertainment-social.manifest.json",
      "photography-videography-social.manifest.json",
      "wedding-services-social.manifest.json",
      "event-planning-social.manifest.json",
      "hotels-resorts-social.manifest.json",
    ];
    const expectedTemplates = [
      "./health-wellness-social.html",
      "./interior-design-social.html",
      "./real-estate-social.html",
      "./music-entertainment-social.html",
      "./photography-videography-social.html",
      "./wedding-services-social.html",
      "./event-planning-social.html",
      "./hotels-resorts-social.html",
    ];
    const readme = await readFile("README.md", "utf8");
    const attribution = await readFile("ATTRIBUTION.md", "utf8");

    const loaded = await Promise.all(manifests.map(async (manifestPath) => (
      JSON.parse(await readFile(`examples/use-cases/${manifestPath}`, "utf8")) as {
      name: string;
      template: string;
      css: string;
      variants: Array<{ id: string; title: string; modifyFile: string; output: string }>;
      }
    )));

    expect(loaded.map((manifest) => manifest.template)).toEqual(expectedTemplates);
    expect(new Set(loaded.map((manifest) => manifest.template)).size).toBe(8);

    for (const manifest of loaded) {
      expect(manifest.variants).toHaveLength(1);
      const html = await readFile(`examples/use-cases/${manifest.template.replace("./", "")}`, "utf8");
      expect(html).not.toContain("unsplash");

      for (const variant of manifest.variants) {
        const modifications = await readFile(`examples/use-cases/${variant.modifyFile.replace("./", "")}`, "utf8");
        await access(`examples/use-cases/${variant.output.replace("./", "")}`);
        expect(modifications).toContain("./assets/service-");
        expect(readme).toContain(variant.title);
        expect(readme).toContain(variant.output.replace("./", "./examples/use-cases/"));
      }
    }

    expect(attribution).toContain("Service Industry Social Posts");
    expect(attribution).toContain("service-hotels-resorts-unsplash.jpg");
    expect(attribution).toContain("Unsplash License");
  });
});
