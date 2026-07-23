export const sizes = {
  og: { width: 1200, height: 630 },
  "twitter-card": { width: 1200, height: 675 },
  "instagram-square": { width: 1080, height: 1080 },
  "instagram-story": { width: 1080, height: 1920 },
  linkedin: { width: 1200, height: 627 },
  "youtube-thumb": { width: 1280, height: 720 },
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
} as const;

export const DEFAULT_VIEWPORT = sizes.og;
export const sizeNames = Object.keys(sizes) as SizeName[];

export type SizeName = keyof typeof sizes;
