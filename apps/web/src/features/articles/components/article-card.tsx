import Link from "next/link";

import { Tag } from "@/components/tag";
import { formatDate } from "@/lib/format";
import type { ArticleCardItem } from "@/types/content";

export function ArticleCard({ article }: { article: ArticleCardItem }) {
  return (
    <article className="article-card">
      <div className="article-card-meta">
        <span>{formatDate(article.publishedAt)}</span>
        <Tag>{article.stanceLabel}</Tag>
      </div>
      <h3>
        <Link href={`/articles/${article.id}`}>{article.title}</Link>
      </h3>
      <p>{article.summary}</p>
      <div className="article-card-footer">
        <span>{article.pointCount} key points</span>
        <Link href={`/themes/${article.themeSlug}`}>テーマへ戻る</Link>
      </div>
    </article>
  );
}
