import { expect, test } from "@playwright/test";

test.describe("apps/web user flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({
      colorScheme: "dark",
      reducedMotion: "reduce",
    });
    await page.addInitScript(() => {
      // 日付表示や乱数由来の揺れを止め、スクリーン差分と導線確認を安定させる。
      Date.now = () => new Date("2026-03-24T00:00:00.000Z").getTime();
      Math.random = () => 0.123456789;
    });
  });

  test("home から theme detail と article detail へ遷移できる", async ({
    page,
  }) => {
    // MVP の公開導線として、ホーム -> テーマ -> 記事詳細の最短経路を守る。
    await page.goto("/", { waitUntil: "networkidle" });

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Reddit の技術議論を、整理された読み物へ。",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "テーマ一覧" }),
    ).toBeVisible();

    await page
      .getByRole("link", { name: /Software Engineering/i })
      .first()
      .click();

    await expect(page).toHaveURL(/\/themes\/software-engineering$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Software Engineering" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "記事一覧" }),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "記事の並び替え" }),
    ).toContainText("新着順");
    await expect(
      page.getByRole("combobox", { name: "記事のフィルタ" }),
    ).toContainText("すべて");
    await expect(
      page.getByRole("link", {
        name: "Senior engineers are replacing endless sprint churn with release trains",
      }),
    ).toBeVisible();

    await page
      .getByRole("link", {
        name: "Senior engineers are replacing endless sprint churn with release trains",
      })
      .click();

    await expect(page).toHaveURL(/\/articles\/se-001$/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Senior engineers are replacing endless sprint churn with release trains",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "原文スレッド" }),
    ).toBeVisible();
    await expect(page.getByText("翻訳", { exact: true })).toBeVisible();
    await expect(page.getByText("要約", { exact: true })).toBeVisible();
    await expect(page.getByText("主要論点", { exact: true })).toBeVisible();
    await expect(
      page.getByText(
        "スプリント速度より、リリース意図の共有が重視されている。",
      ),
    ).toBeVisible();
  });

  test("admin 画面で管理操作 UI とジョブ一覧を確認できる", async ({ page }) => {
    // 管理画面は実操作ではなく、ボタンと履歴確認の導線が崩れていないことを見る。
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByRole("link", { name: "Admin" }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "収集と再要約の操作" }),
    ).toBeVisible();
    await expect(page.getByText("管理操作", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "収集実行" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "再要約実行" }),
    ).toBeVisible();
    await expect(page.getByText("ジョブ一覧", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "job-20260323-001" }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "r/softwareengineering" }),
    ).toBeVisible();
  });

  test("スクロールプログレスがページ遷移後にリセットされる", async ({
    page,
  }) => {
    // スクロールでバーが伸び、ページ遷移直後に 0 に戻ることを確認する。
    await page.goto("/", { waitUntil: "networkidle" });

    const progressBar = page.locator(".fixed.top-0.z-50.h-1");

    // 下へスクロール → バーが伸びる
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(300);

    const scrolledWidth = await progressBar.evaluate(
      (el) => el.getBoundingClientRect().width,
    );
    expect(scrolledWidth).toBeGreaterThan(0);

    // 最下部までスクロール → バーが 100% に到達する
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    await page.waitForTimeout(300);

    const viewportWidth = page.viewportSize()!.width;
    const fullWidth = await progressBar.evaluate(
      (el) => el.getBoundingClientRect().width,
    );
    expect(fullWidth).toBe(viewportWidth);

    // 別ページへ遷移 → バーがリセットされる
    await page.getByRole("link", { name: "Admin" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await page.waitForTimeout(200);

    const afterNavWidth = await progressBar.evaluate(
      (el) => el.getBoundingClientRect().width,
    );
    expect(afterNavWidth).toBe(0);
  });

  test("mobile admin 画面でも状態と実行時刻を確認できる", async ({ page }) => {
    // mobile ではテーブル横スクロールに頼らず、カード表示だけで履歴確認を完了させる。
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin", { waitUntil: "networkidle" });

    await expect(page.getByText("モバイル履歴", { exact: true })).toBeVisible();
    const mobileHistory = page.getByRole("list", {
      name: "モバイル履歴カード",
    });

    await expect(mobileHistory.getByText("job-20260323-001")).toBeVisible();
    await expect(mobileHistory.getByText("completed")).toBeVisible();
    await expect(mobileHistory.getByText("2026年3月23日 09:10")).toBeVisible();
  });
});
