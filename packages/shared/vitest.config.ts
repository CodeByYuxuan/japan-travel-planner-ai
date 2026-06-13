import { defineConfig, mergeConfig } from "vitest/config";

import { baseVitestConfig } from "../config/vitest/base";

export default mergeConfig(
  baseVitestConfig,
  defineConfig({
    test: {
      include: ["src/**/*.test.ts"]
    }
  })
);
