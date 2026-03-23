import type { Metadata } from "next";
import { IBM_Plex_Sans_JP, Space_Grotesk } from "next/font/google";

import { Header } from "@/components/header";
import { StoreProvider } from "@/store/provider";

import "./globals.css";

const bodyFont = IBM_Plex_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
});

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
});

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
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>
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
