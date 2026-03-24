"use client";

import { ArticleList } from "@/features/articles/components/article-list";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setThemeFilterLabel,
  setThemeSortOrder,
} from "@/store/slices/ui-preferences-slice";
import type { ThemeDetail } from "@/types/content";

function sortArticles(
  articles: ThemeDetail["articles"],
  sortOrder: "newest" | "points",
) {
  // 元配列を破壊せず、UI 状態に応じた並び替え結果だけを派生させる。
  return [...articles].sort((left, right) => {
    if (sortOrder === "points") {
      return right.pointCount - left.pointCount;
    }

    return (
      new Date(right.publishedAt).getTime() -
      new Date(left.publishedAt).getTime()
    );
  });
}

export function ThemeDetailClient({ theme }: { theme: ThemeDetail }) {
  const dispatch = useAppDispatch();
  const sortOrder = useAppSelector(
    (state) => state.uiPreferences.themeSortOrder,
  );
  const filterLabel = useAppSelector(
    (state) => state.uiPreferences.themeFilterLabel,
  );
  const filterOptions = [
    { value: "all", label: "すべて" },
    ...Array.from(
      new Set(theme.articles.map((article) => article.stanceLabel)),
    ).map((label) => ({
      value: label,
      label,
    })),
  ];
  const filteredArticles = theme.articles.filter(
    (article) => filterLabel === "all" || article.stanceLabel === filterLabel,
  );
  // フィルタと並び替えは Redux に寄せ、画面を離れても UI 選好を再利用しやすくする。
  const sortedArticles = sortArticles(filteredArticles, sortOrder);

  return (
    <div className="grid gap-6">
      <section className="rounded-[calc(var(--radius)+10px)] border border-border bg-card px-7 py-7 shadow-[var(--shadow)] backdrop-blur-xl">
        <p className="eyebrow">Theme Overview</p>
        <h1 className="font-display mt-3 text-[clamp(2.8rem,7vw,5rem)] leading-none">
          {theme.name}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground md:text-base">
          {theme.description}
        </p>
      </section>

      <section className="rounded-[calc(var(--radius)+10px)] border border-border bg-card px-7 py-7 shadow-[var(--shadow)] backdrop-blur-xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="eyebrow">List Controls</p>
            <h2 className="font-display text-3xl leading-none">記事一覧</h2>
          </div>
          {/* sort / filter UI はローカル state に閉じず、他画面でも再利用できる store 更新に合わせる。 */}
          <label className="grid gap-2 text-sm text-muted-foreground">
            <span>並び替え</span>
            <select
              aria-label="記事の並び替え"
              className="min-w-40 rounded-lg border border-input bg-popover px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20"
              value={sortOrder}
              onChange={(event) =>
                dispatch(
                  setThemeSortOrder(
                    event.currentTarget.value as "newest" | "points",
                  ),
                )
              }
            >
              <option value="newest">新着順</option>
              <option value="points">論点数順</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-muted-foreground">
            <span>フィルタ</span>
            <select
              aria-label="記事のフィルタ"
              className="min-w-40 rounded-lg border border-input bg-popover px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20"
              value={filterLabel}
              onChange={(event) =>
                dispatch(setThemeFilterLabel(event.currentTarget.value))
              }
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-6">
          {/* 空状態の表現は ArticleList に集約し、この画面では一覧条件だけを決める。 */}
          <ArticleList articles={sortedArticles} />
        </div>
      </section>
    </div>
  );
}
