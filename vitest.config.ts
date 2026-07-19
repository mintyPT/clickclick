import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    globals: true,
    include: ["test/**/*.test.ts"],
    testTimeout: 30000,
  },
});
