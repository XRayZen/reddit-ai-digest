import { Provider } from "react-redux";
import { render, screen } from "@testing-library/react";

import { ThemeDetailClient } from "@/features/themes/components/theme-detail-client";
import { getThemeFixture } from "@/mocks/fixtures/content-fixtures";
import { makeStore } from "@/store";

describe("ThemeDetailClient", () => {
  it("filters the article list by stance label", () => {
    const theme = getThemeFixture("software-engineering");

    expect(theme).not.toBeNull();

    // Redux を経由した filter 操作が一覧表示に反映される契約を見る。
    const store = makeStore({
      uiPreferences: {
        themeSortOrder: "newest",
        themeFilterBySlug: {
          "software-engineering": "品質戦略",
        },
        adminActionPending: false,
        adminMessage: "待機中",
      },
    });

    render(
      <Provider store={store}>
        <ThemeDetailClient theme={theme!} />
      </Provider>,
    );
    expect(
      screen.getByRole("combobox", { name: "記事のフィルタ" }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Teams are deleting flaky integration tests faster than fixing them",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Senior engineers are replacing endless sprint churn with release trains",
      ),
    ).not.toBeInTheDocument();
  });

  it("sorts articles by point count when requested", () => {
    // 並び替え UI が表示順へ反映されることを、見出しの先頭要素で確認する。
    const theme = getThemeFixture("software-engineering");

    expect(theme).not.toBeNull();

    const store = makeStore({
      uiPreferences: {
        themeSortOrder: "points",
        themeFilterBySlug: {},
        adminActionPending: false,
        adminMessage: "待機中",
      },
    });

    render(
      <Provider store={store}>
        <ThemeDetailClient theme={theme!} />
      </Provider>,
    );
    expect(
      screen.getByRole("combobox", { name: "記事の並び替え" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "記事の並び替え" }),
    ).toHaveTextContent("論点数順");

    const headings = screen.getAllByRole("heading", { level: 3 });

    expect(headings[0]).toHaveTextContent(
      "Architecture docs are back because AI tools need explicit context",
    );
  });

  it("keeps filters scoped to the current theme", () => {
    // 同じ store を共有しても、テーマ別 filter が別キーで保持されることを見る。
    const firstTheme = getThemeFixture("software-engineering");
    const secondTheme = getThemeFixture("local-llm");

    expect(firstTheme).not.toBeNull();
    expect(secondTheme).not.toBeNull();

    const store = makeStore();
    const { rerender } = render(
      <Provider store={store}>
        <ThemeDetailClient theme={firstTheme!} />
      </Provider>,
    );

    rerender(
      <Provider store={store}>
        <ThemeDetailClient theme={secondTheme!} />
      </Provider>,
    );

    expect(
      screen.getByRole("combobox", { name: "記事のフィルタ" }),
    ).toHaveTextContent("すべて");
    expect(
      screen.getByRole("combobox", { name: "記事の並び替え" }),
    ).toHaveTextContent("新着順");
    expect(
      screen.getByText(
        "People are standardizing on 4-bit models for daily coding assistants",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Context window benchmarks still mislead desktop users"),
    ).toBeInTheDocument();
  });
});
