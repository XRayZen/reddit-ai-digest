import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ThemeSortOrder = "newest" | "points";

export type UiPreferencesState = {
  themeSortOrder: ThemeSortOrder;
  themeFilterLabel: string;
  adminActionPending: boolean;
  adminMessage: string;
};

export const initialUiPreferencesState: UiPreferencesState = {
  themeSortOrder: "newest",
  themeFilterLabel: "all",
  adminActionPending: false,
  adminMessage: "待機中",
};

const uiPreferencesSlice = createSlice({
  name: "uiPreferences",
  initialState: initialUiPreferencesState,
  reducers: {
    setThemeSortOrder(state, action: PayloadAction<ThemeSortOrder>) {
      state.themeSortOrder = action.payload;
    },
    setThemeFilterLabel(state, action: PayloadAction<string>) {
      state.themeFilterLabel = action.payload;
    },
    startAdminAction(state, action: PayloadAction<string>) {
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
