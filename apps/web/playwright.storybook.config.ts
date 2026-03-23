import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/golden",
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "test-results/storybook-golden",
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:6006",
    browserName: "chromium",
    colorScheme: "light",
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    viewport: { width: 1440, height: 1600 },
  },
  webServer: {
    command: "corepack pnpm storybook",
    cwd: __dirname,
    url: "http://127.0.0.1:6006",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
