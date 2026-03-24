"use client";

import Link from "next/link";

import { Reveal } from "@/components/reveal";
import { Tag } from "@/components/tag";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const storedFilterLabel = useAppSelector(
    (state) => state.uiPreferences.themeFilterBySlug[theme.slug] ?? "all",
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
  const filterLabel = filterOptions.some(
    (option) => option.value === storedFilterLabel,
  )
    ? storedFilterLabel
    : "all";
  // テーマ間で filter 選好を共有しつつ、現在のテーマに存在しない値は
  // 空一覧にせず "all" へフォールバックする。
  const filteredArticles = theme.articles.filter(
    (article) => filterLabel === "all" || article.stanceLabel === filterLabel,
  );
  // フィルタと並び替えは Redux に寄せ、画面を離れても UI 選好を再利用しやすくする。
  const sortedArticles = sortArticles(filteredArticles, sortOrder);
  const sortLabel = sortOrder === "newest" ? "新着順" : "論点数順";
  const activeFilterLabel =
    filterLabel === "all" ? "すべて表示" : `フィルタ: ${filterLabel}`;
  const visibleCountLabel = `${sortedArticles.length} 件を表示中`;

  return (
    <div className="page-grid">
      <Reveal>
        <Card className="py-0">
          <CardHeader className="gap-5 border-b pb-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-4">
                <div className="cluster items-center">
                  <Tag variant="outline">Theme Overview</Tag>
                  <Tag>{theme.articles.length} articles</Tag>
                </div>
                <div className="flex flex-col gap-4">
                  <h1 className="font-display text-[clamp(2.9rem,7vw,5rem)] leading-none tracking-tight">
                    {theme.name}
                  </h1>
                  <p className="editorial-copy max-w-3xl text-base md:text-lg">
                    {theme.description}
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="lg">
                <Link href="/">ホームへ戻る</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 py-6 md:grid-cols-3">
            <div className="surface-inline rounded-2xl p-4">
              <p className="eyebrow">Articles</p>
              <p className="mt-3 font-display text-3xl leading-none">
                {theme.articles.length}
              </p>
            </div>
            <div className="surface-inline rounded-2xl p-4">
              <p className="eyebrow">Reading Mode</p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                記事詳細では翻訳、要約、主要論点を横断して読めます。
              </p>
            </div>
            <div className="surface-inline rounded-2xl p-4">
              <p className="eyebrow">List Goal</p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                一覧で比較し、気になる議論だけを詳細へ深掘りできます。
              </p>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.05}>
        <Card className="py-0">
          <CardHeader className="gap-4 border-b pb-5">
            <div className="flex flex-col gap-2">
              <p className="eyebrow">List Controls</p>
              <CardTitle className="font-display text-3xl leading-none">
                <h2>記事一覧</h2>
              </CardTitle>
              <CardDescription className="leading-7">
                並び順、フィルタ、現在の表示件数を同じツールバーに集約し、
                一覧の読み筋を短くします。
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 py-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="surface-inline rounded-2xl p-4">
                  <p className="eyebrow">Visible</p>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    {visibleCountLabel}
                  </p>
                </div>
                <div className="surface-inline rounded-2xl p-4">
                  <p className="eyebrow">Filter</p>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    {activeFilterLabel}
                  </p>
                </div>
                <div className="surface-inline rounded-2xl p-4">
                  <p className="eyebrow">Sort</p>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    {sortLabel}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:min-w-[360px]">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    並び替え
                  </span>
                  {/* sort はテーマ横断で共有し、どの一覧でも同じ見方を維持できるようにする。 */}
                  <Select
                    value={sortOrder}
                    onValueChange={(value) =>
                      dispatch(setThemeSortOrder(value as "newest" | "points"))
                    }
                  >
                    <SelectTrigger
                      aria-label="記事の並び替え"
                      className="w-full"
                    >
                      <SelectValue aria-label={sortLabel}>
                        {sortLabel}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>並び替え</SelectLabel>
                        <SelectItem value="newest">新着順</SelectItem>
                        <SelectItem value="points">論点数順</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    フィルタ
                  </span>
                  {/* filter はテーマごとに分けて保持し、別テーマへ移ったときの空一覧を避ける。 */}
                  <Select
                    value={filterLabel}
                    onValueChange={(value) =>
                      dispatch(
                        setThemeFilterLabel({
                          slug: theme.slug,
                          label: value,
                        }),
                      )
                    }
                  >
                    <SelectTrigger
                      aria-label="記事のフィルタ"
                      className="w-full"
                    >
                      <SelectValue aria-label={filterLabel}>
                        {filterOptions.find(
                          (option) => option.value === filterLabel,
                        )?.label ?? "すべて"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>フィルタ</SelectLabel>
                        {filterOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {/* 空状態の表現は ArticleList に集約し、この画面では一覧条件だけを決める。 */}
            <ArticleList articles={sortedArticles} />
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
