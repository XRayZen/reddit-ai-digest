import { IBM_Plex_Sans_JP, Space_Grotesk } from "next/font/google";

export const bodyFont = IBM_Plex_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
});

export const displayFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
});

export const appFontClassName = `${bodyFont.variable} ${displayFont.variable}`;
