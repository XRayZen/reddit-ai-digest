import { notFound } from "next/navigation";

import { ArticleDetailView } from "@/features/articles/components/article-detail-view";
import { getArticleDetail } from "@/lib/api/client";
import { ApiNotFoundError } from "@/lib/api/errors";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 動的 segment の解決を page で吸収し、詳細表示側は記事データだけを受け取る。
  const { id } = await params;
  let article;

  try {
    // 存在しない記事だけを not-found に寄せ、それ以外の取得失敗は
    // App Router の error boundary で扱えるように残す。
    article = await getArticleDetail(id);
  } catch (error) {
    if (error instanceof ApiNotFoundError) {
      notFound();
    }

    throw error;
  }

  // 記事詳細は読み取り専用なので、表示 component には取得ロジックを持たせない。
  return <ArticleDetailView article={article} />;
}
