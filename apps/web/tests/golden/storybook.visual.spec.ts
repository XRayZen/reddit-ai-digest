import { expect, test } from "@playwright/test";

const visualCases = [
  {
    id: "pages-homescreen--default",
    name: "home-screen-default.png",
    viewport: { width: 1440, height: 1800 },
  },
  {
    id: "features-themecard--default",
    name: "theme-card-default.png",
    viewport: { width: 600, height: 520 },
  },
  {
    id: "features-articlecard--long-summary",
    name: "article-card-long-summary.png",
    viewport: { width: 700, height: 760 },
  },
  {
    id: "features-articlelist--default",
    name: "article-list-default.png",
    viewport: { width: 1440, height: 1200 },
  },
  {
    id: "features-themedetailclient--filtered-by-quality",
    name: "theme-detail-filtered.png",
    viewport: { width: 1440, height: 1600 },
  },
  {
    id: "features-articledetailview--long-copy",
    name: "article-detail-long-copy.png",
    viewport: { width: 1440, height: 1800 },
  },
  {
    id: "features-admindashboard--pending-action",
    name: "admin-dashboard-pending.png",
    viewport: { width: 1440, height: 1400 },
  },
  {
    id: "states-errormessage--default",
    name: "error-message-default.png",
    viewport: { width: 760, height: 520 },
  },
  {
    id: "states-loadingskeleton--article-list",
    name: "loading-skeleton-article-list.png",
    viewport: { width: 760, height: 520 },
  },
];

test.describe("storybook visual golden", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({
      colorScheme: "light",
      reducedMotion: "reduce",
    });
    await page.addInitScript(() => {
      Date.now = () => new Date("2026-03-23T00:00:00.000Z").getTime();
      Math.random = () => 0.123456789;
    });
  });

  for (const visualCase of visualCases) {
    test(visualCase.name, async ({ page }) => {
      await page.setViewportSize(visualCase.viewport);
      await page.goto(`/iframe.html?id=${visualCase.id}&viewMode=story`, {
        waitUntil: "networkidle",
      });

      await page.addStyleTag({
        content: `
          /* CI とローカルで文字のアンチエイリアス差分が出るため、golden 時だけ描画を固定する。 */
          *,
          *::before,
          *::after {
            animation: none !important;
            transition: none !important;
            caret-color: transparent !important;
            -webkit-font-smoothing: none !important;
            -moz-osx-font-smoothing: grayscale !important;
            text-rendering: geometricPrecision !important;
          }

          /* display font は日本語 glyph を OS fallback に任せるため、
             CI とローカルで改行位置がズレやすい。golden では body font に寄せて比較を安定させる。 */
          .font-display {
            font-family: var(--font-body), sans-serif !important;
          }
        `,
      });

      const root = page.locator("#storybook-root");
      await expect(root).toBeVisible();
      await expect(root).toHaveScreenshot(visualCase.name, {
        animations: "disabled",
        // GitHub Actions の Playwright コンテナでは文字メトリクス差が残るため、
        // 環境由来の微差だけを吸収し、構図や大きな崩れは引き続き検知する。
        maxDiffPixelRatio: 0.03,
        scale: "css",
      });
    });
  }
});
