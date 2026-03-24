import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";

import { Tag } from "@/components/tag";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { Theme } from "@/types/content";

export function ThemeCard({ theme }: { theme: Theme }) {
  return (
    // ホームではカード単位で即遷移できることを優先し、
    // CTA を増やさずカード全体をリンクにする。
    <Link href={`/themes/${theme.slug}`} className="block h-full">
      <Card className="h-full justify-between py-0 transition-transform duration-300 hover:-translate-y-1">
        <CardHeader className="gap-5 border-b pb-5">
          <div className="flex items-center justify-between gap-3">
            <Tag variant="outline">Theme</Tag>
            <Tag>{theme.articleCount} topics</Tag>
          </div>
          <CardTitle className="font-display text-2xl leading-tight tracking-tight md:text-[2rem]">
            <h3>{theme.name}</h3>
          </CardTitle>
          <div className="grid gap-3">
            <p className="text-sm leading-7 text-muted-foreground">
              {theme.description}
            </p>
            <div className="cluster items-center">
              <Tag variant="outline">Translate + Summary</Tag>
              <span className="text-sm text-muted-foreground">
                {theme.slug}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardFooter className="justify-between gap-3 py-5">
          <span className="text-sm text-muted-foreground">
            最新の日本語ダイジェストを読む
          </span>
          <ArrowUpRightIcon className="text-primary" />
        </CardFooter>
      </Card>
    </Link>
  );
}
