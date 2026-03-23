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
