import { solid } from "./solid.js";
export type { SolidPresetOptions } from "./solid.js";

export const presets = {
  solid,
};

export const presetMetadata = [
  {
    name: "solid",
    description: "Solid-background social image with title and optional subtitle.",
  },
] as const;
