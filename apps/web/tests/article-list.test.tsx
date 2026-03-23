import { createElement } from "react";
import { render, screen } from "@testing-library/react";

import { ArticleList } from "@/features/articles/components/article-list";

describe("ArticleList", () => {
  it("renders the empty state when there are no articles", () => {
    render(createElement(ArticleList, { articles: [] }));

    expect(screen.getByText("記事はまだありません")).toBeInTheDocument();
  });
});
