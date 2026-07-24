import { access, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const manifestPath = "examples/use-cases/automotive-social.manifest.json";

describe("automotive social example", () => {
  it("documents a manifest-backed automotive sales and detailing example set", async () => {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const readme = await readFile("README.md", "utf8");
    const attribution = await readFile("ATTRIBUTION.md", "utf8");

    expect(manifest.name).toBe("Apex Auto Social Posts");
    expect(manifest.variants.map((variant: { id: string }) => variant.id)).toEqual([
      "inventory",
      "detailing",
      "trade-in",
    ]);

    for (const variant of manifest.variants) {
      await access(`examples/use-cases/${variant.output.replace("./", "")}`);
      const modifications = JSON.parse(
        await readFile(`examples/use-cases/${variant.modifyFile.replace("./", "")}`, "utf8"),
      );
      expect(modifications.some((modification: { name: string; src?: string }) => (
        modification.name.endsWith("_image") && modification.src?.startsWith("./assets/")
      ))).toBe(true);
      expect(readme).toContain(variant.output.replace("./", "./examples/use-cases/"));
    }

    expect(readme).toContain("Render Apex Auto Social Posts");
    expect(readme).toContain("automotive sales and detailing");
    expect(attribution).toContain("## Apex Auto Social Posts");
  });
});
