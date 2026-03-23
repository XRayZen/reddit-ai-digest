import { notFound } from "next/navigation";

import { ThemeDetailClient } from "@/features/themes/components/theme-detail-client";
import { getThemeDetail } from "@/lib/api/client";

export default async function ThemePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const theme = await getThemeDetail(slug).catch(() => null);

  if (!theme) {
    notFound();
  }

  return <ThemeDetailClient theme={theme} />;
}
