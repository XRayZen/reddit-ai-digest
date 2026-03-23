import Link from "next/link";

import { Tag } from "@/components/tag";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/format";
import type { ArticleDetail } from "@/types/content";

export function ArticleDetailView({ article }: { article: ArticleDetail }) {
  return (
    <div className="grid gap-6">
      <section className="rounded-[calc(var(--radius)+10px)] border border-border bg-card px-7 py-7 shadow-[var(--shadow)] backdrop-blur-xl">
        <p className="eyebrow">{article.sourceSiteLabel}</p>
        <h1 className="font-display mt-3 max-w-[14ch] text-[clamp(2.8rem,7vw,5rem)] leading-none">
          {article.title}
        </h1>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>{formatDate(article.publishedAt)}</span>
          <Tag>{article.stanceLabel}</Tag>
          <Button asChild variant="outline" size="sm">
            <a href={article.sourceUrl} target="_blank" rel="noreferrer">
              原文スレッド
            </a>
          </Button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader className="gap-3">
            <p className="eyebrow">Japanese Translation</p>
            <CardTitle className="font-display text-3xl leading-none">
              翻訳
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm leading-8 text-muted-foreground md:text-base">
              {article.translation}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="gap-3">
            <p className="eyebrow">Summary</p>
            <CardTitle className="font-display text-3xl leading-none">
              要約
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm leading-8 text-muted-foreground md:text-base">
              {article.summary}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="gap-3">
          <p className="eyebrow">Key Points</p>
          <CardTitle className="font-display text-3xl leading-none">
            主要論点
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="grid gap-4">
            {article.keyPoints.map((point, index) => (
              <li key={point} className="space-y-4">
                <p className="text-sm leading-7 text-muted-foreground md:text-base">
                  {point}
                </p>
                {index < article.keyPoints.length - 1 ? <Separator /> : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div>
        <Button asChild variant="secondary" size="lg">
          <Link href={`/themes/${article.themeSlug}`}>テーマ一覧へ戻る</Link>
        </Button>
      </div>
    </div>
  );
}
