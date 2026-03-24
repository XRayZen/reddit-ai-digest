import { notFound } from "next/navigation";

import { ThemeDetailClient } from "@/features/themes/components/theme-detail-client";
import { ApiNotFoundError } from "@/lib/api/errors";
import { getThemeDetail } from "@/lib/api/client";

export default async function ThemePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // App Router の params 解決は page に閉じ、下位 component へ Promise を渡さない。
  const { slug } = await params;
  let theme;

  try {
    // 404 と transport / 設定ミスを分離し、テーマ未存在だけを not-found に変換する。
    theme = await getThemeDetail(slug);
  } catch (error) {
    if (error instanceof ApiNotFoundError) {
      notFound();
    }

    throw error;
  }

  // 一覧の操作状態は client component 側で扱うため、page は取得済みデータだけを渡す。
  return <ThemeDetailClient theme={theme} />;
}
