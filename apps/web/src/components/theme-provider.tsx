"use client";

import type { ThemeProviderProps } from "next-themes";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: ThemeProviderProps & {
  children: React.ReactNode;
}) {
  // 初期表示を dark token と一致させ、hydration 時のちらつきを抑える。
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
