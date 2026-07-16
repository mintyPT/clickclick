---
prefix: CC
format_version: 2
groups: [renderer-core, preset-and-cli, project-foundation, quality-gate, release-publishing, template-core, local-workflows, authoring-diagnostics, screenshot-api, template-library, preset-media-foundation, brand-presets, photo-presets, media-preset-docs, readme-examples-coverage]
---

## CC-001 · Scaffold TypeScript package and CLI shell
type: Task | status: Done | priority: High
blocks: [CC-008, CC-002] | blocked_by: []
tags: [afk, project-foundation]

## What & why

Create the initial ClickClick project structure for a Node.js TypeScript library and CLI. The project is brand new, so this slice establishes the package, build, test, and command foundations that later renderer and CLI work can build on without revisiting basic tooling.

The agreed v1 direction is a single npm package that exports library APIs and ships a `clickclick` binary. It should be ESM-only, require Node 20 or newer, use `tsup` for builds, Vitest for tests, and Commander for CLI parsing.

## Where

Project root package metadata, TypeScript configuration, build/test scripts, source layout, and the CLI entry point.

## How

Initialize npm package metadata for one package with both library exports and a binary. Configure ESM output, Node 20 engine metadata, TypeScript strictness, tsup build output, Vitest, and a feature-folder source layout. Add a minimal Commander-powered CLI shell with help output and no real rendering behavior yet.

Use a source layout that can split later without doing so now: renderer, fit-text, presets, cli, errors, and shared size/type exports. Keep the first implementation narrow and avoid adding URL screenshotting, config files, component rendering, or user preset registries.

## Acceptance criteria

- [ ] `package.json` defines an ESM-only Node 20+ package with library exports and a `clickclick` bin entry.
- [ ] Build, typecheck, and test scripts exist and run against the scaffold.
- [ ] Source folders exist for CLI, renderer, fit text, presets, errors, and shared exports.
- [ ] `clickclick --help` works through the development script and shows the initial command structure.
- [ ] No renderer behavior, preset behavior, or publishing automation is implemented in this slice beyond placeholders needed for compilation.

### History
- created · 2026-07-15T20:57:15Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-15T21:11:55Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-15T21:11:58Z · mauro.goncalo@gmail.com

---

## CC-002 · Implement core Playwright image renderer
type: Task | status: Done | priority: High
blocks: [CC-003, CC-005] | blocked_by: [CC-001]
tags: [afk, renderer-core]

## What & why

Implement the core library behavior that turns HTML into PNG or JPEG images using a headless Playwright browser. This is the central capability of ClickClick: users provide HTML/CSS and rendering options, and the library returns an image buffer and optionally writes a file.

The renderer should support both a simple one-shot API and a reusable renderer for batch-oriented callers. It should optimize for deterministic social image generation while exposing enough Playwright control for CI and advanced users.

## Where

Renderer module, public library exports, browser lifecycle handling, validation, output writing, shared types, and error handling.

## How

Expose named exports such as `renderImage`, `createRenderer`, `ClickClickError`, and the relevant TypeScript types. Use the full `playwright` package and Chromium in headless mode. Support typed Playwright launch options for one-shot rendering and renderer creation. Support an externally supplied Playwright `Browser`; when supplied, ClickClick must not close it.

Use a new browser context per render. Default the viewport to 1200x630. Render from a nested input object with `document`, `viewport`, `output`, and `render` concerns. Support `document.html`, optional `document.css`, and optional `document.baseUrl` so relative assets can resolve. Support viewport screenshots by default and optional selector screenshots when `render.selector` is provided.

Support PNG and JPEG output. Infer format from `output.path` when `output.format` is omitted, default to PNG otherwise, and allow `quality` only for JPEG. Support explicit PNG transparency through `output.omitBackground`, and reject that option for JPEG. Return a result object containing buffer and metadata; write to `output.path` when provided.

Use targeted manual validation and throw a single public `ClickClickError` with stable error codes for invalid input, missing selectors, text-fit strict failures from later work, and browser/render failures. Catch browser launch failures and provide an actionable message that points users toward Playwright browser installation or system dependencies.

## Acceptance criteria

- [ ] `renderImage(input, options?)` renders HTML to a buffer and optionally writes to `output.path`.
- [ ] `createRenderer(options?)` supports reusable rendering and has a clear `close()` lifecycle.
- [ ] Renderer creation accepts Playwright launch options and an optional externally managed `Browser`.
- [ ] Each render uses a fresh browser context and does not close externally supplied browsers.
- [ ] PNG/JPEG format inference, JPEG quality validation, and PNG `omitBackground` validation are implemented.
- [ ] `document.baseUrl` works for relative assets, and the CLI can later set it to an HTML file directory.
- [ ] Viewport screenshots are default; selector screenshots work and report a stable error when the selector is missing.
- [ ] Public TypeScript types and `ClickClickError` are exported from the package entry point.

### History
- created · 2026-07-15T20:57:29Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-15T21:11:55Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-15T21:11:58Z · mauro.goncalo@gmail.com

---

## CC-003 · Add opt-in dynamic text fitting
type: Task | status: Done | priority: High
blocks: [CC-004] | blocked_by: [CC-002]
tags: [afk, renderer-core]

## What & why

Add dynamic text fitting so social images do not break when user-provided text is longer than expected. This must work for built-in presets and for user-authored HTML, because text overflow is a general rendering problem rather than a preset-only concern.

The v1 contract should be deliberately narrow: ClickClick only reduces `font-size` on explicitly targeted elements until their rendered content fits their existing layout box, then reports warnings or errors when it still cannot fit.

## Where

Fit-text module, renderer lifecycle, render input types, result warnings, and error handling.

## How

Support both declarative HTML attributes and programmatic config. Presets and users can mark elements with `data-clickclick-fit` plus optional min/max font-size attributes. Users rendering existing HTML can pass `fitText` config entries with selectors, `minFontSize`, `maxFontSize`, and `onOverflow`.

Run fitting in the browser after initial page readiness, after fonts are ready, and after the `beforeScreenshot` hook. Then screenshot. The fitting algorithm should set the element to the maximum font size, measure overflow using rendered layout dimensions, and binary-search down to the minimum font size. It should only change inline `font-size`; it must not change text content, width, height, line-height, letter-spacing, or apply transforms.

If text still overflows at the minimum size, return a warning by default. When `onOverflow` is `error`, throw `ClickClickError` with a stable text-fit overflow code. Include enough metadata in warnings for users and the CLI to explain what overflowed.

## Acceptance criteria

- [ ] Fit text can be enabled for user HTML through attributes and through programmatic selector config.
- [ ] The renderer lifecycle waits for configured readiness and fonts, runs the `beforeScreenshot` hook, then runs fitting before screenshot.
- [ ] The algorithm only mutates inline `font-size` and uses binary search between min and max sizes.
- [ ] Overflow at minimum font size returns structured warnings by default.
- [ ] `onOverflow: "error"` throws a `ClickClickError` with a stable code.
- [ ] Result warnings are included in the public render result and are suitable for CLI stderr reporting.

### History
- created · 2026-07-15T20:57:41Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-15T21:11:55Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-15T21:11:58Z · mauro.goncalo@gmail.com

---

## CC-004 · Add solid social image preset
type: Task | status: Done | priority: High
blocks: [CC-006] | blocked_by: [CC-003]
tags: [afk, preset-and-cli]

## What & why

Add the first built-in preset: a polished solid-background text card for common social images. Presets should be convenience helpers that produce the same renderer input shape as user-authored HTML, proving that the core API is composable and not tied to special preset behavior.

The preset should solve the common need for a configurable background color and title/subtitle text while using the general text-fitting feature so long copy remains usable.

## Where

Preset module, shared size constants, public exports, and internal CLI preset metadata.

## How

Expose `presets.solid(options)` as a simple public function returning a render input. Also export size constants such as Open Graph 1200x630, square 1080x1080, and story 1080x1920. Keep public presets ergonomic functions, while storing any command metadata internally for the CLI.

The solid preset should accept title, optional subtitle, background color, text color, width, height, and alignment. Default to 1200x630. Generate full-viewport HTML/CSS with explicit background styling and text-fit attributes on the relevant text elements. Do not include logo/image support in this v1 preset.

## Acceptance criteria

- [ ] `presets.solid(options)` is exported publicly and returns a valid renderer input object.
- [ ] The preset supports title, subtitle, background color, text color, width, height, and left/center alignment.
- [ ] The preset defaults to a 1200x630 Open Graph viewport.
- [ ] Preset text uses the general text-fit attribute mechanism rather than preset-only logic.
- [ ] `sizes.og`, `sizes.square`, and `sizes.story` are exported as reusable constants.
- [ ] Internal preset metadata exists for CLI listing/help without exposing a formal public preset registry.

### History
- created · 2026-07-15T20:57:51Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-15T21:11:55Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-15T21:11:58Z · mauro.goncalo@gmail.com

---

## CC-005 · Implement raw HTML render CLI command
type: Task | status: Done | priority: High
blocks: [CC-006] | blocked_by: [CC-002]
tags: [afk, preset-and-cli]

## What & why

Implement the first useful CLI workflow for user-authored HTML files. Users should be able to render an HTML document to PNG or JPEG from the command line, optionally layering in one CSS file, without writing library code.

This is the CLI counterpart to the core renderer and establishes the option naming, warning behavior, and file resolution rules for v1.

## Where

CLI command module, CLI option parsing, filesystem input handling, renderer invocation, stderr warning output, and CLI error handling.

## How

Add `clickclick render <html-file>` with support for one optional `--css` file. The CLI should read the HTML file, optionally read the CSS file, and set `document.baseUrl` to the HTML file directory so relative assets and font URLs resolve naturally. Do not add URL rendering or config-file driven generation in v1.

Standardize options with convenient aliases: `--out`/`--output`, `--width`, `--height`, `--format`, `--quality`, `--selector`, `--wait-until`, `--delay`, and `--strict`. Width/height should default to 1200x630 when omitted. Warnings from the renderer should print to stderr and exit zero by default; `--strict` should convert warnings into a non-zero exit.

Use Commander for help text and option parsing. Validate input files before invoking Playwright and show readable error messages for `ClickClickError` failures.

## Acceptance criteria

- [ ] `clickclick render ./card.html --out og.png` renders an image file.
- [ ] `--css ./card.css` injects one optional CSS file into the render input.
- [ ] The command sets `document.baseUrl` to the HTML file directory.
- [ ] Width, height, format, quality, selector, wait, delay, output, and strict options are supported with the agreed aliases.
- [ ] Renderer warnings print to stderr and exit zero by default.
- [ ] `--strict` exits non-zero when renderer warnings are present.
- [ ] Missing files and known renderer errors produce readable CLI messages.

### History
- created · 2026-07-15T20:58:02Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-15T21:11:55Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-15T21:11:58Z · mauro.goncalo@gmail.com

---

## CC-006 · Implement preset CLI commands
type: Task | status: Done | priority: High
blocks: [CC-007] | blocked_by: [CC-004, CC-005]
tags: [afk, preset-and-cli]

## What & why

Expose built-in presets through the CLI so users can generate common social images without authoring HTML. The initial CLI preset surface should stay nested under `preset` to preserve the top-level namespace for future commands.

This completes the v1 user path for generating a solid-background social image from the command line.

## Where

CLI preset command module, internal preset definitions, help text, renderer invocation, and warning/error handling shared with raw rendering.

## How

Add `clickclick preset list` to show available built-in presets and add `clickclick preset solid` to render the solid preset. Use internal preset metadata for list/help output, but keep the public library API as simple functions.

The solid command should support title, subtitle, background color, text color, width, height, align, output, format, quality, selector if useful, delay/wait options if shared, and strict warning behavior. Use canonical docs-friendly names while supporting convenient aliases: `--background`/`--background-color`, `--out`/`--output`, and the shared render flags.

Do not add user preset registries, template files, config files, or top-level preset aliases in v1.

## Acceptance criteria

- [ ] `clickclick preset list` lists the built-in `solid` preset with a short description.
- [ ] `clickclick preset solid --title "Hello" --out og.png` generates an image through the shared renderer.
- [ ] Solid preset CLI options cover title, subtitle, background color, text color, width, height, alignment, output, format, quality, and strict mode.
- [ ] CLI help for preset commands is discoverable and consistent with the raw render command.
- [ ] Renderer warnings and `--strict` behavior match the raw render command.
- [ ] No public preset registry or config-file workflow is introduced.

### History
- created · 2026-07-15T20:58:12Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-15T21:11:55Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-15T21:11:58Z · mauro.goncalo@gmail.com

---

## CC-007 · Add browser smoke and pixel tests
type: Task | status: Done | priority: High
blocks: [CC-009, CC-008] | blocked_by: [CC-006]
tags: [afk, quality-gate]

## What & why

Add enough automated coverage to prove the renderer, text fitting, presets, and CLI work with a real headless browser without creating a brittle visual regression suite. Since ClickClick's core behavior depends on Playwright screenshots, unit tests alone are not sufficient.

The test suite should catch broken browser lifecycle, blank images, wrong formats, missing output files, and text-fit failure behavior.

## Where

Vitest test suite, browser integration tests, CLI smoke tests if practical, image inspection helpers, and package scripts.

## How

Add focused tests around input validation, format inference, preset output shape, renderer smoke behavior, and text fitting. Use Playwright for browser-backed smoke tests that assert buffers/files exist and have plausible format/dimensions. Add one deterministic pixel-level test, such as rendering a known solid background and checking a stable pixel value, to catch blank or wrong-background screenshots.

For text fitting, test that long text causes a font-size reduction, that overflow at the minimum size returns a warning by default, and that strict/error mode throws the expected `ClickClickError`. Keep pixel assertions minimal and avoid broad screenshot snapshots in v1.

## Acceptance criteria

- [ ] Unit tests cover validation, output format inference, public preset output shape, and error codes.
- [ ] Browser smoke tests render simple HTML to PNG/JPEG buffers and files.
- [ ] At least one deterministic pixel-level test verifies a known rendered background or equivalent non-blank output.
- [ ] Text-fit tests cover shrink behavior, warning behavior, and error behavior.
- [ ] CLI smoke coverage verifies raw render and preset render commands at a practical level.
- [ ] `npm test`, `npm run check`, and `npm run build` pass before the ticket is complete.

### History
- created · 2026-07-15T20:58:22Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-15T21:11:55Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-15T21:11:58Z · mauro.goncalo@gmail.com

---

## CC-008 · Prepare open-source repository polish
type: Task | status: Done | priority: Medium
blocks: [CC-009] | blocked_by: [CC-001, CC-007]
tags: [afk, release-publishing]

## What & why

Prepare the project to be published as an open-source GitHub repository after the local v1 library and CLI work is complete. This ticket does not publish anything externally; it makes the repository understandable, installable, and reviewable for public users.

The project should present itself clearly as a Node.js TypeScript library and CLI for generating social images by screenshotting HTML with Playwright.

## Where

Repository documentation, package metadata, examples, ignore files, license/contributing files, and public-facing project description.

## How

Add a README that documents the v1 scope, library API, CLI commands, installation requirements, Playwright browser notes, examples for raw HTML and the solid preset, text-fitting behavior, and known non-goals. Add appropriate repository files for an open-source project such as license, contributing notes, `.gitignore`, and examples.

Keep publication actions out of this ticket. The output should be ready for a human to review before the repo is made public.

## Acceptance criteria

- [ ] README explains what ClickClick does, the v1 scope, install/setup notes, library usage, CLI usage, and Playwright browser troubleshooting.
- [ ] README documents text fitting, warnings, `--strict`, PNG/JPEG behavior, and explicit PNG transparency.
- [ ] Examples exist for rendering an HTML file and generating the solid preset.
- [ ] Package metadata is suitable for a public npm package, excluding final package-name/account decisions.
- [ ] License and contributing files exist or the ticket clearly records the human decision needed before publication.
- [ ] No GitHub repo creation, remote push, npm publish, or external release action is performed.

### History
- created · 2026-07-15T20:58:31Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-15T21:11:55Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-15T21:11:58Z · mauro.goncalo@gmail.com

---

## CC-009 · Prepare npm publishing workflow
type: Task | status: Done | priority: Medium
blocks: [CC-010] | blocked_by: [CC-007, CC-008]
tags: [hitl, release-publishing]

## What & why

Prepare the npm publication workflow for ClickClick after the local v1 implementation is working and the open-source repository polish is in place. This ticket captures the release mechanics and human decisions required before publishing the CLI/library package.

This is intentionally a later release milestone, not part of the first local implementation slice.

## Where

Package metadata, release scripts, npm packaging configuration, documentation, and release checklist.

## How

Confirm the npm package name and ownership model with a human before making irreversible assumptions. Prepare package metadata, `files` whitelist, bin entry verification, build artifacts, dry-run packaging checks, and release script conventions. Decide whether npm provenance, public access flags, tags, and GitHub release automation are needed.

Do not publish to npm in this ticket. It should end with a verified dry-run package and a clear release checklist.

## Acceptance criteria

- [ ] Human confirms the package name, npm account or organization, license, and publication access model.
- [ ] Package metadata, bin entry, exports, and `files` whitelist are ready for npm.
- [ ] A dry-run package check verifies the built CLI and library files that would be published.
- [ ] Release scripts or documented release commands exist and are safe to run intentionally.
- [ ] README contains npm installation and first-run notes.
- [ ] No actual npm publication is performed.

### History
- created · 2026-07-15T20:58:39Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-16T13:13:29Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-16T13:49:43Z · mauro.goncalo@gmail.com

---

## CC-010 · Publish public GitHub repo and npm package
type: Task | status: Done | priority: Medium
blocks: [] | blocked_by: [CC-009]
tags: [hitl, release-publishing]

## What & why

Publish ClickClick externally as an open-source GitHub repository and npm package after the implementation, tests, repository polish, and npm publishing preparation are complete. This is the final release action, deliberately separated from local implementation and dry-run preparation.

Because it creates public external artifacts, this ticket requires human approval and credentials at execution time.

## Where

Git remote configuration, GitHub repository creation or push, release tagging, npm publication, and release notes.

## How

After all implementation and quality-gate tickets are complete, create or connect the public GitHub repository, push the reviewed source, create an initial release tag if appropriate, and publish the npm package using the prepared workflow. Verify that the package installs, the `clickclick` binary runs, and the README/repository links are correct.

Do not perform this ticket until a human confirms the target GitHub repo, npm account/package name, license, release version, and publication timing.

## Acceptance criteria

- [ ] Human confirms the public GitHub repository target and npm package publication details.
- [ ] The repository source is pushed publicly with the intended default branch and metadata.
- [ ] The npm package is published under the confirmed name and version.
- [ ] A clean install of the published package exposes the `clickclick` binary and library exports.
- [ ] Release notes or a GitHub release summarize the initial v1 capability and current limits.
- [ ] Post-publish links in package metadata and documentation resolve correctly.

### History
- created · 2026-07-15T20:58:48Z · mauro.goncalo@gmail.com
- Backlog → Blocked: Human approval required before creating public release artifacts: confirm GitHub repo target, npm package/account, license, release version, and publication timing. · 2026-07-16T13:49:48Z · mauro.goncalo@gmail.com
- Blocked → Done · 2026-07-16T14:29:31Z · mauro.goncalo@gmail.com
- handoff · 2026-07-16T14:29:47Z · mauro.goncalo@gmail.com
  Verified existing public release: origin main reachable at github.com:mintyPT/clickclick.git, npm reports @maurogoncalo/clickclick@0.1.1 with MIT/GitHub metadata, clean temp install exposes the clickclick binary, and library exports resolve. Local install warned because verifier Node was 18.20.4 while package requires >=20.

---

## CC-011 · Add local HTML template rendering with named layers
type: Task | status: Done | priority: High
blocks: [CC-012, CC-013] | blocked_by: []
tags: [template-core]

## What & why

Add a local template rendering API so users can render HTML/CSS templates with named editable layers instead of only calling the low-level document screenshot API. This establishes the local Bannerbear-style foundation while keeping generation fully local and synchronous.

Templates should be regular HTML/CSS with editable elements marked by stable layer names such as data-layer attributes. The feature should preserve the existing renderer as the lower-level primitive and expose a higher-level template API for both library and CLI users.

## Where

Renderer entry points, public TypeScript exports, CLI command surface, validation/types, tests, examples, and README documentation.

## How

Introduce a typed template input that accepts HTML/CSS strings and/or local template files, discovers named layers in the rendered DOM, applies no-op/default rendering correctly, and delegates screenshot capture to the existing Playwright renderer. Keep the API local: no async jobs, hosted URLs, auth, database, or webhooks.

Expose the feature through both interfaces: a library API such as renderTemplate/createTemplateRenderer and a CLI command for rendering a template file. Document how named layers are declared and how output options map to the existing PNG/JPEG renderer.

## Acceptance criteria

- [ ] Library API exposes local HTML/CSS template rendering with typed inputs and outputs.
- [ ] CLI exposes template rendering with documented flags or subcommands.
- [ ] Templates can mark editable layers with data-layer names and render successfully even before modifications are added.
- [ ] Rendering supports existing PNG/JPEG output options, including transparent PNG behavior where applicable.
- [ ] Tests cover template rendering, layer discovery, missing/duplicate layer behavior, and output option propagation.
- [ ] README documents the library usage, CLI usage, and template authoring model.
- [ ] If this introduces a meaningfully different generated image example, add an example image under examples and reference it from README.

### History
- created · 2026-07-16T13:54:06Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-16T14:17:36Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-16T14:17:41Z · mauro.goncalo@gmail.com
- handoff · 2026-07-16T14:17:54Z · mauro.goncalo@gmail.com
  implemented on main; verified npm run check, npm run build, and npm test (44 tests)

---

## CC-012 · Add hybrid Bannerbear-style layer modifications
type: Task | status: Done | priority: High
blocks: [CC-014, CC-017] | blocked_by: [CC-011]
tags: [template-core]

## What & why

Add a local modifications model for named template layers so users can generate variants from one HTML/CSS template the way they would with Bannerbear. The API should support Bannerbear-shaped common fields while still allowing web-native DOM/CSS escape hatches.

This unlocks practical local image generation: users can change text, images, colors, fonts, alignment, visibility, styles, classes, attributes, positioning, borders, shadows, and named CSS effects without rewriting templates.

## Where

Template rendering internals, public types, validation, CLI parsing, tests, examples, and README documentation.

## How

Accept a modifications array keyed by layer name. Translate common fields into DOM updates and CSS changes, while also allowing generic style, className, attributes, text, html, src/image_url, and hide/show changes. Support image fit and anchor semantics through CSS object-fit and object-position. Add named CSS effects such as grayscale, sepia, blur, grayscale blur, flip horizontal/vertical, and invert/negate. Do not implement real face detection or computer-vision smart crop.

Expose the same modification capability through the library API and CLI JSON input. Validate unsupported values clearly and report missing layers as structured warnings or errors according to the chosen behavior.

## Acceptance criteria

- [ ] Library API accepts typed layer modifications targeting data-layer names.
- [ ] CLI accepts modifications, likely from inline JSON and/or a JSON file.
- [ ] Supported fields include text/html/src or image_url/color/background/font_family/alignment/hide/style/className/attributes/x-y shift/border/shadow/effect.
- [ ] Image fit and anchor controls map to object-fit and object-position.
- [ ] Named CSS effects are implemented without adding computer-vision dependencies.
- [ ] Tests cover each supported modification family and invalid/missing layer behavior.
- [ ] README documents the modification schema with CLI and library examples.
- [ ] Add at least one generated example image demonstrating modifications and document it in README.

### History
- created · 2026-07-16T13:54:18Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-16T14:17:36Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-16T14:17:41Z · mauro.goncalo@gmail.com
- handoff · 2026-07-16T14:17:54Z · mauro.goncalo@gmail.com
  implemented on main; verified npm run check, npm run build, and npm test (44 tests)

---

## CC-013 · Add font registry support for local template rendering
type: Task | status: Done | priority: Medium
blocks: [CC-014] | blocked_by: [CC-011]
tags: [template-core]

## What & why

Add a font registry so local template generation can reliably use explicit local or URL font files instead of depending only on system-installed fonts. This gives users predictable typography for generated images and supports Bannerbear-style font_family overrides in modifications.

## Where

Template renderer setup, CSS injection, public types, CLI configuration/options, tests, examples, and README documentation.

## How

Allow users to register font families with local file paths or URLs. Generate and inject @font-face CSS into rendered documents before screenshot capture. Make registered families usable from template CSS and from layer modifications via font_family. Preserve support for template-authored font CSS; the registry is an explicit reliability layer, not the only font path.

Expose registry configuration in the library API and CLI. Later config-file support can centralize defaults, but this ticket should make the feature usable directly.

## Acceptance criteria

- [ ] Library API accepts a font registry with family names and local path or URL sources.
- [ ] CLI exposes font registration options or a font registry input file.
- [ ] Renderer injects @font-face CSS before rendering and waits for fonts where possible.
- [ ] font_family modifications can select registered fonts.
- [ ] Tests cover CSS injection, local font configuration validation, and interaction with modifications.
- [ ] README documents font registration through both library and CLI usage.
- [ ] If a new generated image visibly demonstrates custom font rendering, add the example image and document it in README.

### History
- created · 2026-07-16T13:54:27Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-16T14:17:36Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-16T14:17:41Z · mauro.goncalo@gmail.com
- handoff · 2026-07-16T14:17:54Z · mauro.goncalo@gmail.com
  implemented on main; verified npm run check, npm run build, and npm test (44 tests)

---

## CC-014 · Add local render recipes and project config
type: Task | status: Done | priority: High
blocks: [CC-015, CC-016, CC-018] | blocked_by: [CC-012, CC-013]
tags: [local-workflows]

## What & why

Add local recipe and project configuration support so users can save repeatable render inputs instead of passing every option by hand. This replaces Bannerbear signed/on-demand URLs with local, portable render recipe files and establishes project-level defaults for templates, outputs, fonts, debug behavior, and CLI workflows.

## Where

Configuration loading, recipe parsing, public types, CLI commands/options, renderer integration, tests, examples, and README documentation.

## How

Define a clickclick.config format, preferably TypeScript and/or JSON, for template directories, output directory, default viewport, default output format/quality, font registry defaults, named template sets, recipe defaults, and debug settings. Define a recipe JSON format containing a template or template set reference, modifications, output options, viewport/render options, and optional metadata.

Expose config and recipe loading through both library helpers and CLI commands. Keep recipes local files; do not add HTTP server, signing, hosted URLs, auth, or persistent jobs.

## Acceptance criteria

- [ ] Library API can load and execute local render recipes with typed validation.
- [ ] CLI can render a recipe file with documented command syntax.
- [ ] Project config can define template/output/font/debug defaults used by CLI and library helpers where applicable.
- [ ] Recipe files can reference templates and pass modifications/output options.
- [ ] Tests cover config discovery, explicit config loading, recipe validation, defaults merging, and error messages.
- [ ] README documents config and recipe formats with both CLI and library usage.
- [ ] If recipes enable a new image generation example, add the generated image and document it in README.

### History
- created · 2026-07-16T13:54:37Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-16T14:17:36Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-16T14:17:41Z · mauro.goncalo@gmail.com
- handoff · 2026-07-16T14:18:04Z · mauro.goncalo@gmail.com
  implemented on main; verified npm run check, npm run build, and npm test (44 tests)

---

## CC-015 · Add template sets for multi-output collections
type: Task | status: Done | priority: High
blocks: [CC-016] | blocked_by: [CC-014]
tags: [local-workflows]

## What & why

Add local template sets so one shared modifications payload can generate multiple named outputs, mirroring Bannerbear collections without hosted jobs. This supports campaign-style workflows such as Open Graph, Twitter, square social, and story images from one data payload.

## Where

Template rendering API, recipe/config model, CLI, tests, examples, and README documentation.

## How

Define a template set object with named entries. Each entry points to a template and may override viewport, output path, format, quality, and render options. Add a library function for rendering a set and returning results keyed by entry name. Implement sequential rendering first for reliability; concurrency can be a later optimization.

Expose template-set rendering in the CLI and allow recipes/config to reference sets. Make per-entry failures understandable while preserving useful progress/result information.

## Acceptance criteria

- [ ] Library API renders a named template set with shared modifications and per-entry options.
- [ ] CLI renders a template set from config or an explicit set file/reference.
- [ ] Results are returned or reported keyed by template set entry name.
- [ ] Sequential rendering reuses existing renderer behavior without introducing hosted job semantics.
- [ ] Tests cover shared modifications, per-entry overrides, output paths, and partial/failure reporting behavior.
- [ ] README documents template sets with CLI and library examples.
- [ ] Add generated example images for a multi-output set and document them in README.

### History
- created · 2026-07-16T13:54:46Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-16T14:17:36Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-16T14:17:41Z · mauro.goncalo@gmail.com
- handoff · 2026-07-16T14:18:04Z · mauro.goncalo@gmail.com
  implemented on main; verified npm run check, npm run build, and npm test (44 tests)

---

## CC-016 · Add CLI commands for templates recipes and template sets
type: Task | status: Done | priority: High
blocks: [CC-020] | blocked_by: [CC-014, CC-015]
tags: [local-workflows]

## What & why

Make the new local template workflows usable from the command line. The library and CLI should stay in sync: features added to the public API need a clear CLI path when they are useful from a terminal, and the README should show both surfaces.

## Where

CLI command definitions, option parsing, help text, config/recipe integration, tests, examples, and README documentation.

## How

Add or reorganize CLI commands for rendering a single template, rendering a recipe, and rendering a template set. Support modifications from JSON or files, output options, config selection, debug options where available, and useful help text. Keep command behavior local and blocking: no async job IDs, polling, webhooks, or hosted URLs.

Ensure README updates cover command examples alongside equivalent library usage, and that any image-producing workflow has a generated example image when it demonstrates a new visible capability.

## Acceptance criteria

- [ ] CLI exposes documented commands for template rendering, recipe rendering, and template-set rendering.
- [ ] CLI supports modification input and output options consistently with the library API.
- [ ] CLI help text is clear enough for users to discover required inputs and common flags.
- [ ] CLI tests cover success paths, validation failures, and output file creation.
- [ ] README documents each command with equivalent library usage where applicable.
- [ ] README remains complete for all built-in presets per repository instructions.
- [ ] New image-producing CLI workflows include generated example images and README references.

### History
- created · 2026-07-16T13:54:55Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-16T14:17:36Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-16T14:17:41Z · mauro.goncalo@gmail.com
- handoff · 2026-07-16T14:18:04Z · mauro.goncalo@gmail.com
  implemented on main; verified npm run check, npm run build, and npm test (44 tests)

---

## CC-017 · Add debug bundle diagnostics for local renders
type: Task | status: Done | priority: Medium
blocks: [] | blocked_by: [CC-012]
tags: [authoring-diagnostics]

## What & why

Add a debug bundle mode so users can understand why local template rendering produced the wrong image or failed. Local generation depends on user-owned HTML, CSS, assets, fonts, and modifications, so failures should produce inspectable artifacts rather than opaque Playwright errors.

## Where

Renderer lifecycle, template modification reporting, Playwright page instrumentation, CLI options, tests, debug artifact writing, and README documentation.

## How

Add an opt-in debug mode that writes a local folder containing final rendered HTML, injected CSS, applied modifications, missing-layer report, console logs, page errors, failed requests, external request status/timing where available, font-load information where detectable, pre-screenshot/full-page screenshots, final cropped screenshot where applicable, text-fit warnings, and renderer metadata such as viewport, format, timings, template path, and output path.

Expose debug bundle configuration through both library options and CLI flags/config. Keep diagnostics local; do not add hosted diagnosis endpoints.

## Acceptance criteria

- [ ] Library API can enable debug bundle output and returns or reports the debug path.
- [ ] CLI exposes debug bundle options and writes artifacts to a documented location.
- [ ] Debug bundle includes rendered HTML/CSS, applied modifications, layer issues, logs/errors, request failures, screenshots, warnings, and metadata as feasible.
- [ ] Tests cover debug artifact creation and representative failure reporting.
- [ ] README documents how to enable and inspect debug bundles from both library and CLI usage.
- [ ] If debug mode changes generated output examples, add or update example assets and README references as appropriate.

### History
- created · 2026-07-16T13:55:05Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-16T14:17:36Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-16T14:17:41Z · mauro.goncalo@gmail.com
- handoff · 2026-07-16T14:18:04Z · mauro.goncalo@gmail.com
  implemented on main; verified npm run check, npm run build, and npm test (44 tests)

---

## CC-018 · Add local preview and watch command for templates
type: Task | status: Done | priority: Medium
blocks: [] | blocked_by: [CC-014]
tags: [authoring-diagnostics]

## What & why

Add a local preview/watch workflow so users can author HTML/CSS templates and see generated output quickly without building a hosted editor. This provides the useful local equivalent of Bannerbear editor sessions while keeping templates file-based.

## Where

CLI, template/recipe loading, local preview server or watch loop, renderer integration, tests where practical, examples, and README documentation.

## How

Add a command such as clickclick preview that accepts a template or recipe, applies sample modifications, watches relevant files, and refreshes or regenerates preview output when inputs change. Prefer a simple local server or file-refresh workflow that fits the existing package. Do not add authenticated sessions, expiring links, embedded editor accounts, or a full visual editor.

Expose any reusable preview/watch primitives in the library only if they are useful and typed; otherwise keep the implementation primarily CLI-oriented but documented.

## Acceptance criteria

- [ ] CLI provides a preview/watch command for local template authoring.
- [ ] Preview can use sample modifications from a recipe or explicit input.
- [ ] File changes trigger refreshed preview output or regenerated preview image.
- [ ] Behavior is documented clearly in CLI help and README.
- [ ] README includes preview usage and explains how it fits with templates and recipes.
- [ ] If preview workflow produces a distinct example image, add it under examples and reference it from README.
- [ ] Tests or smoke checks cover the non-interactive parts of preview/watch behavior where practical.

### History
- created · 2026-07-16T13:55:14Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-16T14:17:36Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-16T14:17:41Z · mauro.goncalo@gmail.com
- handoff · 2026-07-16T14:18:14Z · mauro.goncalo@gmail.com
  implemented on main; verified npm run check, npm run build, and npm test (44 tests)

---

## CC-019 · Add first-class URL screenshot helper
type: Task | status: Done | priority: Medium
blocks: [] | blocked_by: []
tags: [screenshot-api]

## What & why

Add first-class local webpage screenshot support as the static-image equivalent of Bannerbear screenshots. The project already uses Playwright, so users should be able to capture a URL directly through the library and CLI without writing their own Playwright script.

## Where

Renderer/public API, CLI, validation/types, tests, examples, and README documentation.

## How

Introduce a screenshotUrl-style library API and matching CLI command. Support URL, viewport width/height, full-page capture, selector capture, wait strategy, delay, output path, PNG/JPEG format, quality, transparent background where supported, mobile-ish viewport or device emulation, and browser language/locale. Return results consistent with existing renderImage outputs.

Keep this independent from template rendering: no template modifications, recipes optional later through config support, and no hosted screenshot job semantics.

## Acceptance criteria

- [ ] Library API captures remote or local URLs with typed options and returns a RenderImage-style result.
- [ ] CLI exposes URL screenshot capture with documented flags.
- [ ] Supports viewport, full-page, selector, wait/delay, format, quality, output path, and language/locale options where feasible.
- [ ] Tests cover API validation, CLI invocation, and at least one deterministic local URL/page capture.
- [ ] README documents URL screenshot usage for both library and CLI.
- [ ] Add a generated screenshot example image and document it in README if the feature creates a new visible example category.

### History
- created · 2026-07-16T13:55:24Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-16T14:17:36Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-16T14:17:41Z · mauro.goncalo@gmail.com
- handoff · 2026-07-16T14:18:14Z · mauro.goncalo@gmail.com
  implemented on main; verified npm run check, npm run build, and npm test (44 tests)

---

## CC-020 · Add local template registry and import flow
type: Task | status: Done | priority: Medium
blocks: [] | blocked_by: [CC-016]
tags: [template-library]

## What & why

Add a local template registry and import flow so users can discover and copy reusable starter templates without relying on a hosted marketplace. This is the local equivalent of Bannerbear template library/import behavior and should also give the existing presets/examples a more structured discovery surface.

## Where

Template/example metadata, CLI list/import commands, config/recipe integration, generated example assets, tests, and README documentation.

## How

Define a registry metadata format for local templates with name, description, preview image, template HTML/CSS paths, sample modifications, expected output size, tags/category, and related files. Add CLI commands to list registry entries and import/copy one into a user project. Surface built-in presets/examples through the same registry where appropriate. Keep remote marketplace/fetch support out of scope.

Ensure imported templates include enough sample recipe/modification data for users to render them immediately through both CLI and library workflows.

## Acceptance criteria

- [ ] Registry metadata format is defined and validated.
- [ ] CLI can list local registry templates and import/copy a selected template into a project.
- [ ] Imported templates include sample modifications or recipes that render successfully.
- [ ] Library helpers expose registry reading/import behavior if useful for non-CLI users.
- [ ] Tests cover registry validation, listing, and import/copy behavior.
- [ ] README documents registry structure, CLI usage, and library usage where applicable.
- [ ] Built-in template examples include preview/generated images and README references.
- [ ] README remains complete for all built-in presets with CLI command, library usage, and resulting image.

### History
- created · 2026-07-16T13:55:33Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-16T14:17:36Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-16T14:17:41Z · mauro.goncalo@gmail.com
- handoff · 2026-07-16T14:18:14Z · mauro.goncalo@gmail.com
  implemented on main; verified npm run check, npm run build, and npm test (44 tests)

---

## CC-021 · Add shared media options for built-in presets
type: Task | status: Done | priority: High
blocks: [CC-022, CC-023] | blocked_by: []
tags: [area.presets, media, api, preset-media-foundation]

## What & why

Built-in presets need a shared media layer so new presets can use background photos, logos, corner marks, and watermarks consistently instead of each preset hand-rolling unsafe CSS strings. This is the foundation for adding many more visually rich presets while keeping the library API predictable and safe.

The current presets are mostly CSS-only. The next generation should support media without requiring users to write their own HTML templates for common branded cards.

## Where

Preset option types, preset utilities, built-in preset implementations, CLI preset wiring, and preset tests.

## How

Introduce shared preset media option shapes and utilities that can be reused by existing and new presets. Cover at least:

- background photo URL or data URI with fit/position/opacity/overlay controls;
- logo image URL or data URI with corner placement, size, opacity, and optional alt text where meaningful;
- watermark image URL or text with opacity, scale, rotation, and placement;
- safe escaping/serialization of text and URL-like values before embedding them into generated HTML/CSS.

Apply the shared media options to at least a couple of existing presets where it is a natural fit, such as `solid`, `gradient`, `announcement`, or `quote`, without breaking current calls. Keep defaults backward-compatible.

Add tests that prove user-authored text is escaped, media URLs are serialized safely, old preset calls still work, and new media options produce expected HTML/CSS markers.

## Acceptance criteria

- [ ] Shared TypeScript types/utilities exist for preset background photos, logos, and watermarks.
- [ ] Existing preset APIs remain backward-compatible.
- [ ] At least two existing presets accept and render the new media options.
- [ ] Unsafe text and media inputs are escaped or serialized safely.
- [ ] CLI commands expose matching media flags for presets that support the new options.
- [ ] Tests cover default behavior, media option rendering, escaping, and metadata consistency.

### History
- created · 2026-07-16T14:53:46Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-16T15:02:32Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-16T15:04:19Z · mauro.goncalo@gmail.com
- handoff · 2026-07-16T15:04:19Z · mauro.goncalo@gmail.com
  Implemented shared preset media options for background images, logos, and watermarks; wired into solid/gradient CLI and library APIs; npm test and npm run build passed.

---

## CC-022 · Add photo-forward social image presets
type: Task | status: Done | priority: High
blocks: [CC-024] | blocked_by: [CC-021]
tags: [area.presets, media, photos, photo-presets]

## What & why

Add a set of new built-in presets where a background photo or product image is the primary visual element. Users should be able to create polished social images for blog posts, changelogs, launches, events, and case studies without authoring custom HTML/CSS.

These presets should make ClickClick feel much richer than the current mostly-flat cards while staying scriptable from both the library and CLI.

## Where

Preset modules, preset exports/metadata, CLI `preset` commands, preset tests, and generated README example assets.

## How

Build several photo-forward presets using the shared media utilities from the media foundation ticket. Suggested presets:

- `photoHero`: full-bleed background photo with readable overlay, title, subtitle, label, and optional logo corner.
- `editorialFeature`: magazine-style layout with cropped media panel, headline, byline/meta, and optional watermark.
- `eventPoster`: event or launch poster with background image, date/meta block, CTA, and optional sponsor/logo treatment.
- `caseStudy`: image-backed customer/story card with logo, quote or result metric, and branded overlay.

Each preset should expose a focused option type, library export, metadata entry, CLI command, and tests. Use text fitting for long titles where appropriate. Keep generated HTML/CSS self-contained and deterministic.

Avoid remote network dependencies in tests. For docs/examples, use checked-in local assets or stable data URIs unless a live URL screenshot is specifically needed.

## Acceptance criteria

- [ ] At least four new photo-forward presets are exported from the library.
- [ ] Each new preset has CLI support with documented flags for image URL/path-like values, overlay, text, and optional logo/watermark controls.
- [ ] Each new preset has tests for default size, escaping, media option rendering, and metadata listing.
- [ ] Presets produce nonblank images in browser-level rendering tests or targeted CLI smoke tests.
- [ ] Long titles use ClickClick text fitting where layout requires it.
- [ ] Existing presets and preset list ordering remain stable except for the intentional additions.

### History
- created · 2026-07-16T14:53:58Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-16T15:04:43Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-16T15:10:34Z · mauro.goncalo@gmail.com
- handoff · 2026-07-16T15:10:35Z · mauro.goncalo@gmail.com
  Added photoHero, editorialFeature, eventPoster, and caseStudy presets with CLI commands and smoke tests. npm test passed; npm run build passed after CLI type narrowing.

---

## CC-023 · Add brand, logo, and watermark presets
type: Task | status: Done | priority: High
blocks: [CC-024] | blocked_by: [CC-021]
tags: [area.presets, media, branding, brand-presets]

## What & why

Add built-in presets that are explicitly designed for branded assets: logos in corners, large faint logo marks in the background, watermark overlays, and repeatable brand announcement layouts. This addresses use cases like partner announcements, release banners, sponsorship cards, hiring posts, and branded quote cards.

The goal is to make common branded social-image patterns available without custom templates.

## Where

Preset modules, shared preset media utilities, preset exports/metadata, CLI `preset` commands, tests, and README generated examples.

## How

Build several brand-focused presets using the shared media utilities. Suggested presets:

- `brandAnnouncement`: title/subtitle/CTA with logo in a corner and optional faint logo watermark behind the content.
- `logoBackdrop`: large centered or tiled background logo watermark with foreground headline and metadata.
- `partnerCard`: two-logo layout for integrations, partnerships, or co-marketing posts.
- `watermarkQuote`: quote or testimonial card with text watermark or logo watermark treatment.
- `badgeGrid`: repeated logo or badge pattern background with foreground announcement copy.

Expose options for logo source, logo placement, watermark opacity, watermark scale, background/text/accent colors, and typography. Keep defaults visually distinct from existing flat presets.

Add CLI commands and tests for each preset. Tests should prove that logos/watermarks are included safely and that text content remains escaped.

## Acceptance criteria

- [ ] At least five brand/logo/watermark-oriented presets are exported from the library.
- [ ] Each preset has CLI command coverage and preset metadata.
- [ ] Options include logo placement and watermark controls where appropriate.
- [ ] Tests cover escaping, media serialization, metadata ordering, and representative option combinations.
- [ ] Rendered outputs are visually distinct from the existing `solid`, `gradient`, `minimal`, and `quote` presets.
- [ ] The implementation reuses the shared media utilities rather than duplicating CSS/string-building logic per preset.

### History
- created · 2026-07-16T14:54:10Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-16T15:10:52Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-16T15:15:40Z · mauro.goncalo@gmail.com
- handoff · 2026-07-16T15:15:40Z · mauro.goncalo@gmail.com
  Added brandAnnouncement, logoBackdrop, partnerCard, watermarkQuote, and badgeGrid presets with CLI commands and tests. npm run build and npm test passed.

---

## CC-024 · Document media-rich presets with rendered examples
type: Task | status: Done | priority: Medium
blocks: [] | blocked_by: [CC-022, CC-023]
tags: [area.docs, media, presets, media-preset-docs]

## What & why

The README is expected to stay complete for built-in presets: every preset should include an example CLI command, example library usage, and the resulting image. Once the media-rich presets land, the documentation must be expanded so users can see the photo, logo, corner-mark, and watermark use cases immediately.

This ticket keeps the package documentation aligned with the richer preset surface and avoids repeating the earlier gap where useful workflows existed but were not illustrated.

## Where

README, examples directory, generated preset images, and any lightweight checked-in media assets needed for deterministic docs renders.

## How

After the media foundation, photo presets, and brand presets are implemented, update the README preset section and use-case gallery. For every built-in preset, including all new media-rich presets, include:

- a CLI command;
- equivalent library usage;
- the resulting image checked into the repository.

Add a dedicated section for media-bearing presets that shows background photos, corner logos, logo backdrops, and watermarks. Use checked-in example assets or generated placeholder assets so docs can be regenerated without relying on remote URLs. If a live URL screenshot is needed, use `https://www.anthropic.com/` as the screenshot target.

Ensure generated images are stable dimensions, nonblank, and reasonably compressed. Keep README examples accurate against the real CLI flags and exported option names.

## Acceptance criteria

- [ ] README lists every built-in preset currently exported by the library.
- [ ] Every preset has a CLI example, library example, and checked-in resulting image.
- [ ] Media-rich examples visibly include background photos, corner logos, logo backdrops, and watermarks.
- [ ] The examples directory includes any local media assets needed to regenerate the images deterministically.
- [ ] README URL screenshot examples use `https://www.anthropic.com/` if a live site capture is included.
- [ ] `npm run build`, `npm run check`, and `npm test` pass after the docs/examples update.

### History
- created · 2026-07-16T14:54:24Z · mauro.goncalo@gmail.com
- handoff · 2026-07-16T15:21:16Z · mauro.goncalo@gmail.com
  Documented all 18 built-in presets with CLI/library examples and result images for the new media-rich presets. npm run build, npm run check, and npm test passed.
- Backlog → Done · 2026-07-16T15:21:16Z · mauro.goncalo@gmail.com

---

## CC-025 · Add README examples for advanced output modes
type: Task | status: Done | priority: Medium
blocks: [] | blocked_by: []
tags: [area.docs, examples, output, readme-examples-coverage]

## What & why

The README examples show basic PNG rendering, but the tool also supports JPEG output, JPEG quality, selector-only screenshots, full-page URL screenshots, transparent PNG backgrounds, locale selection, wait events, and render delays. These features are currently mentioned mostly as flag lists, which makes them easy to miss and hard to copy.

Add example coverage so users can see when and how to use each output mode.

## Where

README use-case gallery, examples directory, generated output images, and any small local HTML/CSS fixtures needed to produce deterministic results.

## How

Add a README section with CLI and library examples for advanced output/capture modes. Cover at least:

- JPEG output with `--format jpeg` and `--quality`, plus library `output.format` and `quality`;
- selector-only rendering with `render.selector` / `--selector`;
- URL selector screenshots and full-page screenshots;
- transparent PNG capture using `omitBackground` / `--omit-background`;
- `waitUntil`, `delay`, and `locale` on URL screenshots.

Use local HTML/data URLs for deterministic examples where possible. If a live URL screenshot is needed, use `https://www.anthropic.com/`. Include resulting images for the examples that produce visual output.

## Acceptance criteria

- [ ] README includes copy-pasteable CLI examples for JPEG quality, selector screenshots, full-page screenshots, and transparent PNG output.
- [ ] README includes equivalent library examples for the same features.
- [ ] Resulting images are checked into the examples directory and referenced from README.
- [ ] Examples avoid network dependency except for any intentionally included Anthropic screenshot.
- [ ] The documented commands run successfully against the current CLI.

### History
- created · 2026-07-16T14:55:26Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-16T15:21:58Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-16T15:29:03Z · mauro.goncalo@gmail.com
- handoff · 2026-07-16T15:29:04Z · mauro.goncalo@gmail.com
  Added advanced output mode README examples, JPEG/selector/transparent fixtures and outputs, exposed render --omit-background, and added CLI coverage. npm run build, npm run check, and npm test passed.

---

## CC-026 · Add README examples for renderer lifecycle APIs
type: Task | status: Done | priority: Medium
blocks: [] | blocked_by: []
tags: [area.docs, examples, library, readme-examples-coverage]

## What & why

The README briefly mentions `createRenderer()`, but it does not show the library-only workflows that make ClickClick useful in real automation: reusing one browser for many renders, passing an externally managed Playwright browser, using the `beforeScreenshot` hook, reading the returned buffer, and handling structured warnings/errors.

These are important API features that are not represented by the current examples section.

## Where

README library/use-case examples and any examples scripts added for documentation validation.

## How

Add a library-focused examples section that covers:

- `createRenderer()` for batch rendering multiple images in one process, including `close()`;
- passing an externally managed Playwright `Browser` so ClickClick does not own browser shutdown;
- `beforeScreenshot` to mutate or wait on the page before capture;
- rendering without `output.path` and using the returned `buffer`, `format`, dimensions, path, and warnings;
- catching `ClickClickError` and checking stable error codes;
- warning handling for `TEXT_FIT_OVERFLOW`.

Prefer concise TypeScript examples over long prose. Where an example produces an image, include a checked-in result if it belongs in the visual gallery. For nonvisual examples like error handling, a code snippet is enough.

## Acceptance criteria

- [ ] README shows a complete `createRenderer()` batch rendering example.
- [ ] README shows an externally managed Playwright browser example.
- [ ] README shows `beforeScreenshot` usage.
- [ ] README shows buffer-return usage when no output path is provided.
- [ ] README shows structured warning and `ClickClickError` handling.
- [ ] Examples compile conceptually against the exported public types and current API names.

### History
- created · 2026-07-16T14:55:38Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-16T15:29:21Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-16T15:30:02Z · mauro.goncalo@gmail.com
- handoff · 2026-07-16T15:30:02Z · mauro.goncalo@gmail.com
  Added README renderer lifecycle examples for createRenderer batching, external browser ownership, beforeScreenshot, buffer returns, warnings, and ClickClickError handling. npm run check passed.

---

## CC-027 · Add README examples for advanced template features
type: Task | status: Done | priority: Medium
blocks: [] | blocked_by: []
tags: [area.docs, examples, templates, readme-examples-coverage]

## What & why

The README shows a basic template modification, but many template features are only listed in prose: `modify-file`, image layers, effects, hide/show, arbitrary attributes/styles, positioning, custom fonts, missing/duplicate layer warning behavior, `--strict`, and debug bundle generation.

Users need concrete examples for these features because they are the closest equivalent to Bannerbear-style template workflows.

## Where

README template/use-case examples, examples directory, local template fixtures, generated images, and debug-output documentation snippets.

## How

Add a richer template examples section with CLI and library usage covering:

- `--modify-file` and a checked-in modifications JSON file;
- image layer updates via `src` / `image_url`, `fit`, and `anchor`;
- effects such as `grayscale`, `blur`, or `invert`;
- `hide`/`show`, `style`, `className`, `attributes`, `x`, `y`, `border`, and `shadow` where practical;
- custom fonts through `--font "Family=path-or-url"` and library/config `fonts`;
- `--on-missing-layer`, `--on-duplicate-layer`, and `--strict` warning behavior;
- `--debug-dir` output and what files it writes.

Keep the examples deterministic with local assets. Include rendered images for visual template examples and concise output snippets for warning/debug examples.

## Acceptance criteria

- [ ] README includes a `modify-file` example with a checked-in JSON file.
- [ ] README includes at least one rendered example using an image layer plus fit/anchor.
- [ ] README includes at least one rendered example using a CSS effect or visibility change.
- [ ] README includes a custom font example for CLI and library/config usage.
- [ ] README documents warning modes, strict behavior, and debug bundle output through concrete examples.
- [ ] Generated example images and fixtures are checked in and paths are accurate.

### History
- created · 2026-07-16T14:55:51Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-16T15:30:19Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-16T15:31:43Z · mauro.goncalo@gmail.com
- handoff · 2026-07-16T15:31:43Z · mauro.goncalo@gmail.com
  Added advanced template README examples, modify-file JSON fixture, image-layer template fixture, and rendered output. npm run check passed.

---

## CC-028 · Add README examples for fit-text edge cases
type: Task | status: Done | priority: Medium
blocks: [] | blocked_by: []
tags: [area.docs, examples, fit-text, readme-examples-coverage]

## What & why

The README shows the `data-clickclick-fit` attribute, but it does not fully demonstrate programmatic `fitText` targets, min/max font size controls, overflow warning versus error behavior, or how the CLI `--strict` flag changes warning handling.

Text fitting is a core differentiator for social image generation with variable copy, so the examples should make the failure modes and controls obvious.

## Where

README text-fitting section, use-case gallery, examples directory, and rendered fit-text fixtures.

## How

Expand the text-fitting examples with both HTML attribute and programmatic API coverage. Include:

- `data-clickclick-fit`, `data-clickclick-min-font-size`, and `data-clickclick-on-overflow` examples;
- library `fitText: [{ selector, minFontSize, maxFontSize, onOverflow }]` example;
- one example that fits successfully and one deliberately long-copy example that produces a `TEXT_FIT_OVERFLOW` warning;
- CLI `--strict` behavior for warnings where applicable;
- a short explanation that the fitter changes font size only, not text, box size, line height, or transforms.

Use small deterministic HTML/CSS fixtures and include resulting images where visual comparison helps.

## Acceptance criteria

- [ ] README includes programmatic `fitText` usage with selector, min/max font size, and overflow mode.
- [ ] README includes attribute-based overflow mode usage.
- [ ] README shows how to inspect or handle `TEXT_FIT_OVERFLOW` warnings.
- [ ] README shows CLI strict behavior for renderer warnings.
- [ ] At least one rendered fit-text example image is checked in and linked.

### History
- created · 2026-07-16T14:56:02Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-16T15:32:01Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-16T15:32:40Z · mauro.goncalo@gmail.com
- handoff · 2026-07-16T15:32:40Z · mauro.goncalo@gmail.com
  Added README fit-text examples for data attributes, programmatic fitText, TEXT_FIT_OVERFLOW handling, and CLI --strict behavior. npm run check passed.

---

## CC-029 · Add README examples for preview and config authoring workflows
type: Task | status: Done | priority: Low
blocks: [] | blocked_by: []
tags: [area.docs, examples, preview, config, readme-examples-coverage]

## What & why

The README mentions `clickclick preview`, `config templates`, `config recipe`, and `config set`, but the examples section does not show the authoring workflow end to end: preview an HTML/CSS template while editing it, list registered templates, override recipe output/modifications from the CLI, and render a set into a target directory.

These workflows are useful for local template development and CI integration, and they deserve concrete examples.

## Where

README config/preview sections, examples directory, config fixture, and any generated preview/config outputs used by the docs.

## How

Add examples that show:

- `clickclick preview <html> --css <css> --out-dir ...` for a one-shot preview;
- `clickclick preview ... --watch` as the local authoring loop, documented without requiring the example test command to run forever;
- `clickclick config templates` output for a sample config;
- `clickclick config recipe` with CLI overrides such as `--modify-json`, `--out`, `--width`, and `--height`;
- `clickclick config set --out-dir` and the resulting generated paths.

Include equivalent library examples for `listConfigTemplates`, `renderRecipe`, and `renderTemplateSet`. Use checked-in fixtures and rendered images where the workflow produces visual output.

## Acceptance criteria

- [ ] README includes one-shot preview and watch-mode examples with expected output path behavior.
- [ ] README includes config template listing with a sample output snippet.
- [ ] README includes recipe override examples for CLI and library usage.
- [ ] README includes template-set output directory examples with resulting image links.
- [ ] Examples are deterministic and avoid long-running commands in automated verification.

### History
- created · 2026-07-16T14:56:19Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-16T15:32:54Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-16T15:33:37Z · mauro.goncalo@gmail.com
- handoff · 2026-07-16T15:33:37Z · mauro.goncalo@gmail.com
  Added README preview/config authoring examples for one-shot preview, watch mode, config templates output, recipe overrides, config set outputs, and library equivalents. Verified config templates output and npm run check passed.
