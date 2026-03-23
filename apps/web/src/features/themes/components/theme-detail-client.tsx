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
  const sortedArticles = sortArticles(filteredArticles, sortOrder);

  return (
    <div className="stack-xl">
      <section className="hero-card">
        <p className="eyebrow">Theme Overview</p>
        <h1>{theme.name}</h1>
        <p className="hero-copy">{theme.description}</p>
      </section>

      <section className="panel">
        <div className="toolbar">
          <div>
            <p className="eyebrow">List Controls</p>
            <h2>記事一覧</h2>
          </div>
          <label className="select-field">
            <span>並び替え</span>
            <select
              aria-label="記事の並び替え"
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
          <label className="select-field">
            <span>フィルタ</span>
            <select
              aria-label="記事のフィルタ"
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
        <ArticleList articles={sortedArticles} />
      </section>
    </div>
  );
}
