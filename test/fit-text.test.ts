import { describe, expect, it } from "vitest";
import { runTextFitting } from "../src/fit-text/index.js";

describe("text fitting", () => {
  it("passes configured targets into the browser evaluator", async () => {
    const fakePage = {
      evaluate: async (_fn: unknown, payload: unknown) => payload,
    };

    await expect(runTextFitting(fakePage, [{ selector: ".title", minFontSize: 10, maxFontSize: 50 }])).resolves.toEqual({
      configuredTargets: [
        {
          selector: ".title",
          minFontSize: 10,
          maxFontSize: 50,
          onOverflow: "warn",
        },
      ],
    });
  });
});
