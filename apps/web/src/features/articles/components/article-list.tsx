import { EmptyState } from "@/components/empty-state";
import { Reveal } from "@/components/reveal";
import { ArticleCard } from "@/features/articles/components/article-card";
import type { ArticleCardItem } from "@/types/content";

export function ArticleList({ articles }: { articles: ArticleCardItem[] }) {
  if (articles.length === 0) {
    // 収集前・絞り込み結果ゼロの両方を同じ UI で扱い、親側に分岐を増やさない。
    return (
      <EmptyState
        title="表示できる記事がありません"
        description="収集前、または現在の絞り込み条件に一致する記事がありません。"
      />
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {articles.map((article, index) => (
        <Reveal key={article.id} delay={index * 0.04} offset={18}>
          <ArticleCard article={article} />
        </Reveal>
      ))}
    </div>
  );
}
