import Link from "next/link";

import { Reveal } from "@/components/reveal";
import { Tag } from "@/components/tag";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/format";
import type { ArticleDetail } from "@/types/content";

export function ArticleDetailView({ article }: { article: ArticleDetail }) {
  return (
    <div className="page-grid">
      <Reveal>
        <section aria-label="記事ヘッダー">
          <Card className="py-0">
            <CardHeader className="gap-5 border-b pb-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex flex-col gap-4">
                  <div className="cluster items-center">
                    <Tag variant="outline">{article.sourceSiteLabel}</Tag>
                    <Tag>{article.stanceLabel}</Tag>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(article.publishedAt)}
                    </span>
                  </div>
                  <h1 className="font-display max-w-[18ch] text-[clamp(2.8rem,7vw,4.8rem)] leading-none tracking-tight">
                    {article.title}
                  </h1>
                </div>
                <div className="flex flex-wrap gap-3 lg:justify-end">
                  <Button asChild variant="outline" size="lg">
                    <a
                      href={article.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      原文スレッド
                    </a>
                  </Button>
                  <Button asChild variant="secondary" size="lg">
                    <Link href={`/themes/${article.themeSlug}`}>
                      テーマ一覧へ戻る
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        </section>
      </Reveal>

      <Reveal delay={0.05}>
        <section className="grid gap-5 xl:grid-cols-2">
          {/* 翻訳と要約を横並びにして、原文を読まなくても差分を掴みやすくする。 */}
          <Card className="py-0">
            <CardHeader className="gap-3 border-b pb-5">
              <p className="eyebrow">Japanese Translation</p>
              <CardTitle className="font-display text-3xl leading-none">
                <h2>翻訳</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="py-6">
              <p className="editorial-copy">{article.translation}</p>
            </CardContent>
          </Card>
          <Card className="py-0">
            <CardHeader className="gap-3 border-b pb-5">
              <p className="eyebrow">Summary</p>
              <CardTitle className="font-display text-3xl leading-none">
                <h2>要約</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="py-6">
              <p className="editorial-copy">{article.summary}</p>
            </CardContent>
          </Card>
        </section>
      </Reveal>

      <Reveal delay={0.08}>
        <Card className="py-0">
          <CardHeader className="gap-3 border-b pb-5">
            <p className="eyebrow">Key Points</p>
            <CardTitle className="font-display text-3xl leading-none">
              <h2>主要論点</h2>
            </CardTitle>
            <CardDescription className="leading-7">
              長文でも視線が切れやすいよう、論点ごとに小さな面を分けて表示します。
            </CardDescription>
          </CardHeader>
          <CardContent className="py-6">
            {/* key points は文量が読めないため、区切り線で長文でも視線を切りやすくする。 */}
            <ul className="grid gap-4">
              {article.keyPoints.map((point, index) => (
                <li
                  key={point}
                  className="flex flex-col gap-4 rounded-2xl border border-border bg-muted/30 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start">
                    <Tag variant="outline" className="w-fit">
                      Point {index + 1}
                    </Tag>
                    <p className="text-base leading-8 text-foreground">
                      {point}
                    </p>
                  </div>
                  {index < article.keyPoints.length - 1 ? <Separator /> : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.1}>
        <Card size="sm" className="py-0">
          <CardHeader className="gap-3 border-b pb-5">
            <p className="eyebrow">Continue Reading</p>
            <CardTitle className="font-display text-2xl leading-none">
              <h2>同テーマの議論へ戻る</h2>
            </CardTitle>
          </CardHeader>
          <CardFooter className="justify-between gap-4">
            <p className="text-sm leading-7 text-muted-foreground">
              翻訳や要約を読んだ後、そのままテーマ一覧で関連トピックを比較できます。
            </p>
            {/* 詳細からテーマ文脈へ戻し、ホームまで戻らなくても次の記事探索を続けられるようにする。 */}
            <Button asChild variant="secondary" size="lg">
              <Link href={`/themes/${article.themeSlug}`}>
                テーマ一覧へ戻る
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </Reveal>
    </div>
  );
}
