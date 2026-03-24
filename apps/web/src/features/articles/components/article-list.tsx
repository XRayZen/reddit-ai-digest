import { EmptyState } from "@/components/empty-state";
import { ArticleCard } from "@/features/articles/components/article-card";
import type { ArticleCardItem } from "@/types/content";

export function ArticleList({ articles }: { articles: ArticleCardItem[] }) {
  if (articles.length === 0) {
    // 収集前・絞り込み結果ゼロの両方を同じ UI で扱い、親側に分岐を増やさない。
    return (
      <EmptyState
        title="記事はまだありません"
        description="収集対象を追加するか、モックデータを見直してください。"
      />
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}
