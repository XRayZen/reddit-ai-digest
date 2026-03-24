import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";

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
import type { ArticleCardItem } from "@/types/content";

export function ArticleCard({ article }: { article: ArticleCardItem }) {
  return (
    <article>
      <Card className="h-full justify-between py-0">
        <CardHeader className="gap-4 border-b pb-5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>{formatDate(article.publishedAt)}</span>
            <Tag>{article.stanceLabel}</Tag>
          </div>
          <CardTitle className="font-display text-xl leading-tight tracking-tight md:text-2xl">
            <h3>
              <Link
                href={`/articles/${article.id}`}
                className="transition-colors hover:text-primary"
              >
                {article.title}
              </Link>
            </h3>
          </CardTitle>
          <CardDescription className="leading-7">
            一覧では要約の冒頭だけを見せ、翻訳や論点の全文は詳細に逃がします。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 py-5">
          <p className="text-sm leading-7 text-muted-foreground">
            {article.summary}
          </p>
          <Separator />
          <div className="cluster items-center">
            <Tag variant="outline">{article.pointCount} key points</Tag>
            <Tag variant="outline">Japanese digest</Tag>
          </div>
        </CardContent>
        <CardFooter className="mt-auto justify-between gap-3 text-sm text-muted-foreground">
          {/* 一覧カードでは次の閲覧アクションだけを明確にし、情報密度は本文で稼ぐ。 */}
          <span className="truncate">詳細で翻訳と要約を比較</span>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/articles/${article.id}`}>
              詳細を見る
              <ArrowUpRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </article>
  );
}
