# ClickClick

ClickClick generates PNG and JPEG social images by rendering HTML in headless Chromium with
Playwright. It can be used as a library or as the `clickclick` CLI.

## Scope

The v1 surface is intentionally small:

- render user-authored HTML/CSS to PNG or JPEG;
- render built-in social image presets;
- opt in to text fitting for elements that should shrink to fit;
- report structured warnings and stable error codes.

It does not render arbitrary URLs, manage user preset registries, read config files, or publish
anything externally.

## Setup

Use Node 20 or newer.

```bash
npm install @mintypt/clickclick
npx playwright install chromium
```

If Chromium cannot start, install the system dependencies requested by Playwright for your platform.

## Library

```ts
import { renderImage, presets } from "@mintypt/clickclick";

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

Generate a built-in preset:

```bash
clickclick preset gradient --title "Hello" --subtitle "From ClickClick" --out og.png
```

List presets:

```bash
clickclick preset list
```

Common render flags include `--width`, `--height`, `--format`, `--quality`, `--selector`,
`--wait-until`, `--delay`, and `--strict`. `--out` and `--output` are aliases.

## Presets

ClickClick currently ships these built-in presets. Keep this list in sync with the exported
`presets` object and the CLI preset commands.

### `gradient`

A colorful gradient social image with a title, optional subtitle, configurable gradient colors, text
color, and accent color. It uses `data-clickclick-fit` text fitting for title and subtitle.

CLI:

```bash
clickclick preset gradient \
  --title "Launch faster" \
  --subtitle "Colorful social cards from HTML and CSS" \
  --from "#0f766e" \
  --to "#7c3aed" \
  --accent "rgba(255,255,255,0.32)" \
  --out examples/presets/gradient.png
```

Library:

```ts
import { presets, renderImage } from "@mintypt/clickclick";

await renderImage({
  ...presets.gradient({
    title: "Launch faster",
    subtitle: "Colorful social cards from HTML and CSS",
    fromColor: "#0f766e",
    toColor: "#7c3aed",
    accentColor: "rgba(255,255,255,0.32)",
  }),
  output: { path: "examples/presets/gradient.png" },
});
```

Result:

![Gradient preset result](./examples/presets/gradient.png)

### `quote`

An editorial quote image with large quote text, optional attribution, optional source, and
configurable background, text, and accent colors.

CLI:

```bash
clickclick preset quote \
  --quote "Small tools should still feel carefully made." \
  --attribution "ClickClick" \
  --source "Preset gallery" \
  --out examples/presets/quote.png
```

Library:

```ts
import { presets, renderImage } from "@mintypt/clickclick";

await renderImage({
  ...presets.quote({
    quote: "Small tools should still feel carefully made.",
    attribution: "ClickClick",
    source: "Preset gallery",
  }),
  output: { path: "examples/presets/quote.png" },
});
```

Result:

![Quote preset result](./examples/presets/quote.png)

### `solid`

A solid-background social image with a title, optional subtitle, configurable colors, size, and
left or center alignment. It uses the same `data-clickclick-fit` text-fitting mechanism available to
user-authored HTML.

CLI:

```bash
clickclick preset solid \
  --title "Launch notes" \
  --subtitle "A concise social card" \
  --background "#111827" \
  --text-color "#ffffff" \
  --out examples/presets/solid.png
```

Library:

```ts
import { presets, renderImage } from "@mintypt/clickclick";

await renderImage({
  ...presets.solid({
    title: "Launch notes",
    subtitle: "A concise social card",
    backgroundColor: "#111827",
    textColor: "#ffffff",
  }),
  output: { path: "examples/presets/solid.png" },
});
```

Result:

![Solid preset result](./examples/presets/solid.png)

### `split`

A split-layout social image with text on the left and a bold graphic panel on the right. It supports
an optional label, subtitle, panel color, background color, text color, and accent color.

CLI:

```bash
clickclick preset split \
  --title "Ship a sharper changelog" \
  --subtitle "Readable layouts for posts, releases, and product updates." \
  --label "Release" \
  --out examples/presets/split.png
```

Library:

```ts
import { presets, renderImage } from "@mintypt/clickclick";

await renderImage({
  ...presets.split({
    title: "Ship a sharper changelog",
    subtitle: "Readable layouts for posts, releases, and product updates.",
    label: "Release",
  }),
  output: { path: "examples/presets/split.png" },
});
```

Result:

![Split preset result](./examples/presets/split.png)

### `terminal`

A developer-focused social image with title, optional subtitle, and a command block. It supports
configurable page, terminal, text, and accent colors.

CLI:

```bash
clickclick preset terminal \
  --title "Automate image generation" \
  --subtitle "Render social cards from scripts, docs, or CI." \
  --command "clickclick preset terminal --out og.png" \
  --out examples/presets/terminal.png
```

Library:

```ts
import { presets, renderImage } from "@mintypt/clickclick";

await renderImage({
  ...presets.terminal({
    title: "Automate image generation",
    subtitle: "Render social cards from scripts, docs, or CI.",
    command: "clickclick preset terminal --out og.png",
  }),
  output: { path: "examples/presets/terminal.png" },
});
```

Result:

![Terminal preset result](./examples/presets/terminal.png)

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

## Release

CI runs on pushes to `main` and on pull requests across Node 20, 22, and 24. Each run installs
dependencies, installs Playwright Chromium, typechecks, builds, runs tests, and verifies the npm
package contents with `npm pack --dry-run`.

Publishing to npm is handled by the `Publish to npm` GitHub Actions workflow when a GitHub release is
published or when the workflow is manually dispatched. The workflow uses npm trusted publishing with
GitHub Actions OIDC, so npm must be configured with a trusted publisher for:

- Package: `@mintypt/clickclick`
- Repository: `mintyPT/clickclick`
- Workflow filename: `publish.yml`
- Allowed action: `npm publish`

The publish job runs the same checks as CI and then publishes with provenance:

```bash
npm publish --access public --provenance
```
