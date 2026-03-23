import { configureStore } from "@reduxjs/toolkit";

import { uiPreferencesReducer } from "@/store/slices/ui-preferences-slice";

export const makeStore = () =>
  configureStore({
    reducer: {
      uiPreferences: uiPreferencesReducer,
    },
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
