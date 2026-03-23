import { notFound } from "next/navigation";

import { ArticleDetailView } from "@/features/articles/components/article-detail-view";
import { getArticleDetail } from "@/lib/api/client";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getArticleDetail(id).catch(() => null);

  if (!article) {
    notFound();
  }

  return <ArticleDetailView article={article} />;
}
