import { defineConfig, devices } from "@playwright/test";

// Run from the repo root: npm run test:e2e (playwright test -c tests/e2e).
// Browser tests run against the Supabase project in .env.local. They create
// their own `test-` drives and `test+` accounts and delete them afterwards;
// global setup also reseeds the demo data (skip with E2E_SKIP_SEED=1).
export default defineConfig({
  testDir: ".",
  globalSetup: "./global-setup.ts",
  globalTeardown: "./global-teardown.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 3,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5188",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
  },
  projects: [
    {
      name: "desktop",
      testIgnore: /mobile\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile",
      testMatch: /mobile\.spec\.ts/,
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: "npx vite --port 5188 --strictPort",
    cwd: "../..",
    url: "http://localhost:5188/login",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
