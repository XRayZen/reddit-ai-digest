import { render, screen } from "@testing-library/react";

import { HomeScreen } from "@/features/home/components/home-screen";
import { listThemes } from "@/mocks/fixtures/content-fixtures";

describe("HomeScreen", () => {
  it("links the primary CTA to the first available theme", () => {
    // 固定 slug ではなく取得済みテーマから遷移先を作る契約を固定する。
    const themes = listThemes();

    render(<HomeScreen themes={themes} />);

    expect(screen.getByRole("link", { name: "テーマを読む" })).toHaveAttribute(
      "href",
      `/themes/${themes[0].slug}`,
    );
  });

  it("omits the primary theme CTA when there are no themes", () => {
    // 空配列時に 404 を指す CTA を出さず、empty state だけで成立させる。
    render(<HomeScreen themes={[]} />);

    expect(
      screen.queryByRole("link", { name: "テーマを読む" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("テーマはまだありません")).toBeInTheDocument();
  });
});
