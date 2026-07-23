import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const useCases = resolve(root, "examples/use-cases");

describe("pet services social example", () => {
  it("defines three asset-driven monetization posts in its manifest", async () => {
    const manifest = JSON.parse(await readFile(resolve(useCases, "pet-services-social.manifest.json"), "utf8"));

    expect(manifest).toMatchObject({
      name: "Pawspring Pet Services Social Posts",
      template: "./pet-services-social.html",
      css: "./pet-services-social.css",
      width: 1080,
      height: 1080,
    });
    expect(manifest.variants).toHaveLength(3);

    const modifications = await Promise.all(manifest.variants.map(async (variant: { modifyFile: string }) => (
      JSON.parse(await readFile(resolve(useCases, variant.modifyFile), "utf8"))
    )));
    expect(modifications.flat()).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "care_image", src: expect.stringContaining("./assets/") }),
      expect.objectContaining({ name: "grooming_image", src: expect.stringContaining("./assets/") }),
      expect.objectContaining({ name: "nutrition_image", src: expect.stringContaining("./assets/") }),
    ]));
  });
});
