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
  // client component 再描画で store を作り直さないよう、最初の 1 回だけ初期化する。
  // App Router の server/client 境界を越える値は preloadedState に限定する。
  const [store] = useState<AppStore>(() => makeStore(preloadedState));

  return <Provider store={store}>{children}</Provider>;
}
