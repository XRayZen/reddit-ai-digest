import Link from "next/link";

import { Tag } from "@/components/tag";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import type { ArticleCardItem } from "@/types/content";

export function ArticleCard({ article }: { article: ArticleCardItem }) {
  return (
    <article>
      <Card className="h-full">
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>{formatDate(article.publishedAt)}</span>
            <Tag>{article.stanceLabel}</Tag>
          </div>
          <CardTitle className="text-xl leading-tight">
            <h3>
              <Link
                href={`/articles/${article.id}`}
                className="transition-colors hover:text-primary"
              >
                {article.title}
              </Link>
            </h3>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm leading-7 text-muted-foreground">
            {article.summary}
          </p>
        </CardContent>
        <CardFooter className="mt-auto justify-between gap-3 bg-transparent text-sm text-muted-foreground">
          <span>{article.pointCount} key points</span>
          <Button asChild variant="link" size="sm">
            <Link href={`/themes/${article.themeSlug}`}>テーマへ戻る</Link>
          </Button>
        </CardFooter>
      </Card>
    </article>
  );
}
