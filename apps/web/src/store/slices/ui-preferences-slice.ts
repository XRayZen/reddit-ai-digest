import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ThemeSortOrder = "newest" | "points";

export type UiPreferencesState = {
  themeSortOrder: ThemeSortOrder;
  themeFilterBySlug: Record<string, string>;
  adminActionPending: boolean;
  adminMessage: string;
};

export const initialUiPreferencesState: UiPreferencesState = {
  themeSortOrder: "newest",
  themeFilterBySlug: {},
  adminActionPending: false,
  adminMessage: "待機中",
};

const uiPreferencesSlice = createSlice({
  name: "uiPreferences",
  initialState: initialUiPreferencesState,
  reducers: {
    setThemeSortOrder(state, action: PayloadAction<ThemeSortOrder>) {
      // データ自体はサーバー由来なので、Redux には一覧表示の選好だけを置く。
      state.themeSortOrder = action.payload;
    },
    setThemeFilterLabel(
      state,
      action: PayloadAction<{ slug: string; label: string }>,
    ) {
      // テーマ別に保持して、別テーマ遷移時に前画面の絞り込みが混線しないようにする。
      state.themeFilterBySlug[action.payload.slug] = action.payload.label;
    },
    startAdminAction(state, action: PayloadAction<string>) {
      // 管理操作は mock 段階でも pending / done の手触りを再現する。
      state.adminActionPending = true;
      state.adminMessage = action.payload;
    },
    finishAdminAction(state, action: PayloadAction<string>) {
      state.adminActionPending = false;
      state.adminMessage = action.payload;
    },
  },
});

export const {
  finishAdminAction,
  setThemeFilterLabel,
  setThemeSortOrder,
  startAdminAction,
} = uiPreferencesSlice.actions;

export const uiPreferencesReducer = uiPreferencesSlice.reducer;
