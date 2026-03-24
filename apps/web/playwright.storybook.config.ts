import { defineConfig, devices } from "@playwright/test";

// package.json の script と Playwright 設定で同じ port を使い、参照先を固定する。
const storybookPort = 6006;
// CI では build 済み Storybook を使い回し、ローカルでは従来どおり dev server を起動する。
const staticDir = process.env.STORYBOOK_STATIC_DIR;

export default defineConfig({
  testDir: "./tests/golden",
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "test-results/storybook-golden",
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${storybookPort}`,
    browserName: "chromium",
    colorScheme: "light",
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    viewport: { width: 1440, height: 1600 },
  },
  webServer: {
    // CI では build 済み Storybook を配信し、dev server 起動の重複を避ける。
    command: staticDir
      ? `python3 -m http.server ${storybookPort} --directory ${staticDir} --bind 127.0.0.1`
      : "corepack pnpm storybook",
    cwd: __dirname,
    url: `http://127.0.0.1:${storybookPort}`,
    reuseExistingServer: false,
    timeout: 120000,
  },
});
