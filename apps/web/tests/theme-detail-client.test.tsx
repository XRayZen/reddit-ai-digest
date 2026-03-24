import { Provider } from "react-redux";
import { fireEvent, render, screen } from "@testing-library/react";

import { ThemeDetailClient } from "@/features/themes/components/theme-detail-client";
import { getThemeFixture } from "@/mocks/fixtures/content-fixtures";
import { makeStore } from "@/store";

describe("ThemeDetailClient", () => {
  it("filters the article list by stance label", () => {
    const theme = getThemeFixture("software-engineering");

    expect(theme).not.toBeNull();

    // Redux を経由した filter 操作が一覧表示に反映される契約を見る。
    const store = makeStore();

    render(
      <Provider store={store}>
        <ThemeDetailClient theme={theme!} />
      </Provider>,
    );

    fireEvent.change(screen.getByLabelText("記事のフィルタ"), {
      target: { value: "品質戦略" },
    });

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
    const theme = getThemeFixture("software-engineering");

    expect(theme).not.toBeNull();

    const store = makeStore();

    render(
      <Provider store={store}>
        <ThemeDetailClient theme={theme!} />
      </Provider>,
    );

    fireEvent.change(screen.getByLabelText("記事の並び替え"), {
      target: { value: "points" },
    });

    const headings = screen.getAllByRole("heading", { level: 3 });

    expect(headings[0]).toHaveTextContent(
      "Architecture docs are back because AI tools need explicit context",
    );
  });
});
