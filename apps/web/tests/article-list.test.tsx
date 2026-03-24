import { createElement } from "react";
import { render, screen } from "@testing-library/react";

import { ArticleList } from "@/features/articles/components/article-list";

describe("ArticleList", () => {
  it("renders the empty state when there are no articles", () => {
    // 親画面ごとに空配列分岐を実装しなくて済むことを保証する。
    render(createElement(ArticleList, { articles: [] }));

    expect(screen.getByText("表示できる記事がありません")).toBeInTheDocument();
  });
});
