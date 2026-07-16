# Contributing

ClickClick is a small Node.js TypeScript package. Use Node 20 or newer.

```bash
npm install
npm test
npm run check
npm run build
```

Install Chromium for local rendering and browser-backed tests:

```bash
npx playwright install chromium
```

Keep changes focused and add tests for renderer behavior, CLI behavior, or preset output shape when
the public contract changes.
