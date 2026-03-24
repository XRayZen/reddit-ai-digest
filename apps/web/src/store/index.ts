import { configureStore } from "@reduxjs/toolkit";

import {
  initialUiPreferencesState,
  uiPreferencesReducer,
  type UiPreferencesState,
} from "@/store/slices/ui-preferences-slice";

export type AppPreloadedState = {
  uiPreferences?: Partial<UiPreferencesState>;
};

export const makeStore = (preloadedState?: AppPreloadedState) =>
  // story / test ごとの差分指定をしやすいよう、初期 state と部分上書きをここで合成する。
  // サーバーデータは置かず、画面横断の UI 状態だけを単一 slice にまとめる。
  configureStore({
    reducer: {
      uiPreferences: uiPreferencesReducer,
    },
    preloadedState: preloadedState
      ? {
          uiPreferences: {
            ...initialUiPreferencesState,
            ...preloadedState.uiPreferences,
          },
        }
      : undefined,
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
