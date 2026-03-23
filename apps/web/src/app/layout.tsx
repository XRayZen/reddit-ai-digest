import type { Metadata } from "next";

import { Header } from "@/components/header";
import { appFontClassName } from "@/lib/fonts";
import { StoreProvider } from "@/store/provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Reddit AI Digest",
  description:
    "Reddit 技術議論を翻訳・要約して読むためのフロントエンドモック。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${appFontClassName} min-h-screen bg-background text-foreground antialiased`}
      >
        <StoreProvider>
          <main className="page-shell">
            <Header />
            <div className="shell">{children}</div>
          </main>
        </StoreProvider>
      </body>
    </html>
  );
}
