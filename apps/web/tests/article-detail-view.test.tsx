import { render, screen, within } from "@testing-library/react";

import { ArticleDetailView } from "@/features/articles/components/article-detail-view";
import { getArticleFixture } from "@/mocks/fixtures/content-fixtures";

describe("ArticleDetailView", () => {
  it("prioritizes translation and summary immediately after the hero", () => {
    // 固定説明カードを挟まず、記事詳細の本体をすぐ読み始められる構成を固定する。
    const article = getArticleFixture("se-001");

    expect(article).not.toBeNull();

    render(<ArticleDetailView article={article!} />);

    expect(
      screen.queryByRole("heading", {
        level: 2,
        name: "このページで読めるもの",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "翻訳" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "要約" }),
    ).toBeVisible();
  });

  it("keeps the hero focused on source metadata and primary navigation", () => {
    const article = getArticleFixture("se-001");

    expect(article).not.toBeNull();

    render(<ArticleDetailView article={article!} />);

    const hero = screen.getByRole("region", { name: "記事ヘッダー" });

    expect(
      within(hero).getByText("Reddit / r/softwareengineering"),
    ).toBeVisible();
    expect(within(hero).getByText("運用改善")).toBeVisible();
    expect(
      within(hero).getByRole("link", { name: "原文スレッド" }),
    ).toBeVisible();
    expect(
      within(hero).getByRole("link", { name: "テーマ一覧へ戻る" }),
    ).toBeVisible();
  });
});
