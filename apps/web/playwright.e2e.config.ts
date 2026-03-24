import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report/e2e" }],
  ],
  outputDir: "test-results/e2e",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:3100",
    browserName: "chromium",
    colorScheme: "light",
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1440, height: 1200 },
  },
  webServer: {
    command:
      "CONTENT_API_MODE=mock corepack pnpm build && CONTENT_API_MODE=mock corepack pnpm start:e2e",
    cwd: __dirname,
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
