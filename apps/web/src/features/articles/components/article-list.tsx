import { EmptyState } from "@/components/empty-state";
import { ArticleCard } from "@/features/articles/components/article-card";
import type { ArticleCardItem } from "@/types/content";

export function ArticleList({ articles }: { articles: ArticleCardItem[] }) {
  if (articles.length === 0) {
    return (
      <EmptyState
        title="記事はまだありません"
        description="収集対象を追加するか、モックデータを見直してください。"
      />
    );
  }

  return (
    <div className="article-list">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}
