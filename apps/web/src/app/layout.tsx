import type { Metadata, Viewport } from "next";

import { Header } from "@/components/header";
import { ScrollProgress } from "@/components/scroll-progress";
import { ThemeProvider } from "@/components/theme-provider";
import { appFontClassName } from "@/lib/fonts";
import { StoreProvider } from "@/store/provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Reddit AI Digest",
  description:
    "Reddit 技術議論を翻訳・要約して読むためのフロントエンドモック。",
};

export const viewport: Viewport = {
  themeColor: "#07111e",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        className={`${appFontClassName} min-h-screen bg-background text-foreground antialiased`}
      >
        {/* Server Component の layout で shell を固定し、
            各 page はデータ取得と画面差分だけに集中させる。 */}
        {/* theme と Redux はどちらも client 側状態だが、
            page 自体は server のまま保つため layout 直下でだけ包む。 */}
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <StoreProvider>
            <ScrollProgress />
            <main className="page-shell">
              <Header />
              <div className="shell pb-20">{children}</div>
            </main>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
