import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.PRODUCTION_SMOKE_BASE_URL?.trim().replace(
  /\/$/,
  ""
);
const localWebOrigin = "http://127.0.0.1:4173";
const localApiOrigin = "http://127.0.0.1:3101";
const localDatabaseUrl =
  "postgresql://postgres:postgres@127.0.0.1:5432/japan_travel_planner_ai?schema=public";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "production-smoke.spec.ts",
  timeout: 120_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: externalBaseUrl || localWebOrigin,
    trace: "on-first-retry"
  },
  ...(externalBaseUrl
    ? {}
    : {
        webServer: [
          {
            command:
              "pnpm --filter @japan-travel-planner/api exec prisma migrate deploy && pnpm --filter @japan-travel-planner/api dev",
            env: {
              API_PORT: "3101",
              DATABASE_URL:
                process.env.PRODUCTION_SMOKE_DATABASE_URL?.trim() ||
                localDatabaseUrl,
              JWT_SECRET: "production-smoke-session-secret-value",
              WEB_ORIGIN: localWebOrigin
            },
            reuseExistingServer: false,
            timeout: 120_000,
            url: `${localApiOrigin}/api/health`
          },
          {
            command:
              "pnpm build && pnpm exec vite preview --host 127.0.0.1 --port 4173 --strictPort",
            env: {
              VITE_API_BASE_URL: localApiOrigin,
              VITE_TRIP_DATA_MODE: "api"
            },
            reuseExistingServer: false,
            timeout: 120_000,
            url: localWebOrigin
          }
        ]
      }),
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
