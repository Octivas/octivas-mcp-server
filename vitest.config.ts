import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@octivas/sdk": resolve(__dirname, "../clients/javascript/src/index.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
