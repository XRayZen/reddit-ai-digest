import Link from "next/link";

import { Tag } from "@/components/tag";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Theme } from "@/types/content";

export function ThemeCard({ theme }: { theme: Theme }) {
  return (
    <Link href={`/themes/${theme.slug}`} className="block h-full">
      {/* カード全体をリンクにして、一覧画面でクリックターゲットを広く保つ。 */}
      <Card className="h-full transition-transform duration-200 hover:-translate-y-1 hover:border-primary/30">
        <CardHeader className="gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">Theme</p>
            <Tag>{theme.articleCount} topics</Tag>
          </div>
          <CardTitle className="font-display text-2xl leading-none md:text-[2rem]">
            <h3>{theme.name}</h3>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm leading-7 text-muted-foreground">
            {theme.description}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
