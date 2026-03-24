import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Reveal } from "@/components/reveal";
import { SectionHeader } from "@/components/section-header";
import { Tag } from "@/components/tag";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ThemeGrid } from "@/features/themes/components/theme-grid";
import type { Theme } from "@/types/content";

export function HomeScreen({ themes }: { themes: Theme[] }) {
  const totalArticles = themes.reduce(
    (currentTotal, theme) => currentTotal + theme.articleCount,
    0,
  );
  const primaryThemeSlug = themes[0]?.slug;
  const focusNotes = [
    "テーマ単位で議論を束ね、検索より先に文脈を掴める構成。",
    "翻訳、要約、主要論点を同じ画面で追える公開導線。",
    "管理画面は収集と再要約の状態確認を優先する運用ビュー。",
  ];

  return (
    <div className="page-grid">
      <Reveal>
        <section className="grid gap-5">
          {/* ホーム上部はサービスの読後感と導線を一度で伝える editorial hero に寄せる。 */}
          <Card className="py-0">
            <CardHeader className="gap-5 border-b pb-6 md:pb-7">
              <div className="cluster items-center">
                <Tag variant="outline">Frontend First</Tag>
                <Tag>Dark Editorial UI</Tag>
              </div>
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
                <div className="flex flex-col gap-4">
                  <h1 className="font-display max-w-[11ch] text-[clamp(2.9rem,7vw,5.2rem)] leading-none tracking-tight">
                    Reddit の技術議論を、整理された読み物へ。
                  </h1>
                  <p className="editorial-copy max-w-2xl text-base md:text-lg">
                    MVP では Reddit の議論を収集し、日本語要約と翻訳付きで
                    テーマ別に読めることを目指します。現在は公開導線と管理導線を
                    モックで先に固め、最初の一読で何を読めるサービスか伝わる構成に
                    調整しています。
                  </p>
                </div>
                <div className="surface-inline flex flex-col gap-3 rounded-3xl p-4 md:p-5">
                  <p className="eyebrow">Reading Focus</p>
                  <div className="grid gap-3">
                    {focusNotes.map((note) => (
                      <p
                        key={note}
                        className="text-sm leading-7 text-muted-foreground"
                      >
                        {note}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="surface-inline rounded-2xl p-4">
                  <p className="eyebrow">Themes</p>
                  <p className="mt-3 font-display text-3xl leading-none">
                    {themes.length}
                  </p>
                </div>
                <div className="surface-inline rounded-2xl p-4">
                  <p className="eyebrow">Topics</p>
                  <p className="mt-3 font-display text-3xl leading-none">
                    {totalArticles}
                  </p>
                </div>
                <div className="surface-inline rounded-2xl p-4">
                  <p className="eyebrow">Reading Mode</p>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    Translate + Summary
                  </p>
                </div>
              </div>
              <div className="cluster items-center lg:justify-end">
                {/* ヒーロー CTA は固定 slug に依存させず、取得できたテーマだけを案内する。 */}
                {primaryThemeSlug ? (
                  <Button asChild size="lg">
                    <Link href={`/themes/${primaryThemeSlug}`}>
                      テーマを読む
                    </Link>
                  </Button>
                ) : null}
                <Button asChild variant="outline" size="lg">
                  <Link href="/admin">管理画面へ</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </Reveal>

      <Reveal delay={0.06}>
        <section>
          {/* テーマ一覧は下位 component に閉じ、ホームは紹介文と導線の構成だけを持つ。 */}
          <SectionHeader
            eyebrow="Topics"
            title="テーマ一覧"
            description="ソフトウェアエンジニアリング、Local LLM、画像生成 AI、AMD ROCm を初期対象にします。"
          />
          {themes.length === 0 ? (
            <EmptyState
              title="テーマはまだありません"
              description="取得層が空レスポンスを返しても、ホーム画面の構造は維持されます。"
            />
          ) : (
            <ThemeGrid themes={themes} />
          )}
        </section>
      </Reveal>
    </div>
  );
}
