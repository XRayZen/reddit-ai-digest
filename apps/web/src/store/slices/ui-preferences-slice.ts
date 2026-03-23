import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type ThemeSortOrder = "newest" | "points";

type UiPreferencesState = {
  themeSortOrder: ThemeSortOrder;
  themeFilterLabel: string;
  adminActionPending: boolean;
  adminMessage: string;
};

const initialState: UiPreferencesState = {
  themeSortOrder: "newest",
  themeFilterLabel: "all",
  adminActionPending: false,
  adminMessage: "待機中",
};

const uiPreferencesSlice = createSlice({
  name: "uiPreferences",
  initialState,
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
