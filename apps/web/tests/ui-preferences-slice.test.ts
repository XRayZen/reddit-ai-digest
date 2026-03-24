import {
  initialUiPreferencesState,
  setThemeFilterLabel,
  setThemeSortOrder,
  uiPreferencesReducer,
} from "@/store/slices/ui-preferences-slice";

describe("ui preferences slice", () => {
  it("stores theme filters by slug", () => {
    // フィルタをテーマ単位で持つ前提が崩れると、別テーマ遷移時に空一覧が起きうる。
    const state = uiPreferencesReducer(
      initialUiPreferencesState,
      setThemeFilterLabel({
        slug: "software-engineering",
        label: "品質戦略",
      }),
    );

    expect(state.themeFilterBySlug).toEqual({
      "software-engineering": "品質戦略",
    });
  });

  it("keeps sort order as a global preference", () => {
    // 並び替えはテーマ横断で共有するため、単一値で保持する。
    const state = uiPreferencesReducer(
      initialUiPreferencesState,
      setThemeSortOrder("points"),
    );

    expect(state.themeSortOrder).toBe("points");
  });
});
