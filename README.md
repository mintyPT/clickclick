# ClickClick

ClickClick generates PNG and JPEG social images by rendering HTML in headless Chromium with
Playwright. It can be used as a library or as the `clickclick` CLI.

## Scope

The v1 surface is intentionally small:

- render user-authored HTML/CSS to PNG or JPEG;
- render a built-in solid-background text preset;
- opt in to text fitting for elements that should shrink to fit;
- report structured warnings and stable error codes.

It does not render arbitrary URLs, manage user preset registries, read config files, or publish
anything externally.

## Setup

Use Node 20 or newer.

```bash
npm install
npx playwright install chromium
```

If Chromium cannot start, install the system dependencies requested by Playwright for your platform.

## Library

```ts
import { renderImage, presets } from "clickclick";

await renderImage({
  document: {
    html: "<main><h1 data-clickclick-fit>Hello</h1></main>",
    css: "body{margin:0;background:#111;color:white}main{width:1200px;height:630px}",
  },
  output: { path: "og.png" },
});

await renderImage({
  ...presets.solid({
    title: "Launch notes",
    subtitle: "A concise social card",
    backgroundColor: "#111827",
    textColor: "#fff",
  }),
  output: { path: "solid.png" },
});
```

Use `createRenderer()` when rendering many images in one process. It reuses the browser while still
creating a fresh browser context for every render. You may also pass an externally managed Playwright
`Browser`; ClickClick will not close it.

## CLI

Render an HTML file:

```bash
clickclick render ./examples/card.html --css ./examples/card.css --out og.png
```

Generate the solid preset:

```bash
clickclick preset solid --title "Hello" --subtitle "From ClickClick" --out og.png
```

List presets:

```bash
clickclick preset list
```

Common render flags include `--width`, `--height`, `--format`, `--quality`, `--selector`,
`--wait-until`, `--delay`, and `--strict`. `--out` and `--output` are aliases.

## PNG and JPEG

ClickClick infers the format from `output.path` when possible. `.jpg` and `.jpeg` produce JPEG;
everything else defaults to PNG unless `output.format` is provided. JPEG supports `quality`. PNG
supports `omitBackground` for explicit transparency.

## Text Fitting

Add `data-clickclick-fit` to an element to let ClickClick reduce only its inline `font-size` until
the content fits its existing box:

```html
<h1 data-clickclick-fit data-clickclick-min-font-size="28">Long title</h1>
```

Programmatic targets are also supported through `fitText`. The fitter runs after page readiness,
fonts, delay, and the `beforeScreenshot` hook, but before the screenshot. It does not change text,
box size, line height, letter spacing, or transforms.

Overflow at the minimum size returns a `TEXT_FIT_OVERFLOW` warning by default. Use
`data-clickclick-on-overflow="error"` or a programmatic target with `onOverflow: "error"` to throw a
`ClickClickError`. The CLI prints warnings to stderr and exits zero unless `--strict` is set.

## Errors

Known failures throw `ClickClickError` with stable codes:

- `INVALID_INPUT`
- `MISSING_SELECTOR`
- `TEXT_FIT_OVERFLOW`
- `BROWSER_LAUNCH_FAILED`
- `RENDER_FAILED`

## Development

```bash
npm test
npm run check
npm run build
npm run pack:dry
```
