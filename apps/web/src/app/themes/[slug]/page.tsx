import { notFound } from "next/navigation";

import { ThemeDetailClient } from "@/features/themes/components/theme-detail-client";
import { getThemeDetail } from "@/lib/api/client";

export default async function ThemePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // notFound へ寄せるため、取得失敗は page 境界で null に正規化する。
  const theme = await getThemeDetail(slug).catch(() => null);

  if (!theme) {
    notFound();
  }

  return <ThemeDetailClient theme={theme} />;
}
