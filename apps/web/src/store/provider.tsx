"use client";

import { useState } from "react";
import { Provider } from "react-redux";

import { makeStore, type AppPreloadedState, type AppStore } from "@/store";

export function StoreProvider({
  children,
  preloadedState,
}: {
  children: React.ReactNode;
  preloadedState?: AppPreloadedState;
}) {
  const [store] = useState<AppStore>(() => makeStore(preloadedState));

  return <Provider store={store}>{children}</Provider>;
}
