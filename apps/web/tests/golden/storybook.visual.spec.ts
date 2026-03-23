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
          *,
          *::before,
          *::after {
            animation: none !important;
            transition: none !important;
            caret-color: transparent !important;
          }
        `,
      });

      const root = page.locator("#storybook-root");
      await expect(root).toBeVisible();
      await expect(root).toHaveScreenshot(visualCase.name, {
        animations: "disabled",
        scale: "css",
      });
    });
  }
});
