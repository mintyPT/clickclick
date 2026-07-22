import { existsSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export function serializeMediaSource(src: string, baseDir?: string): string {
  if (/^file:/i.test(src)) return serializeMediaFilePath(fileURLToPath(src));
  if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(src)) return src;
  const path = resolveExistingMediaPath(src, baseDir);
  return serializeMediaFilePath(path);
}

function serializeMediaFilePath(path: string): string {
  if (!existsSync(path)) return pathToFileURL(path).href;
  const mimeType = mimeTypeForPath(path);
  return `data:${mimeType};base64,${readFileSync(path).toString("base64")}`;
}

function resolveExistingMediaPath(src: string, baseDir: string | undefined): string {
  const cwdPath = resolve(src);
  if (existsSync(cwdPath)) return cwdPath;
  if (baseDir) {
    const basePath = resolve(baseDir, src);
    if (existsSync(basePath)) return basePath;
  }
  return cwdPath;
}

function mimeTypeForPath(path: string): string {
  switch (extname(path).toLowerCase()) {
    case ".apng":
      return "image/apng";
    case ".avif":
      return "image/avif";
    case ".gif":
      return "image/gif";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}
