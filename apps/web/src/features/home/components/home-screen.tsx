import { SectionHeader } from "@/components/section-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ThemeGrid } from "@/features/themes/components/theme-grid";
import type { Theme } from "@/types/content";

export function HomeScreen({ themes }: { themes: Theme[] }) {
  return (
    <div className="grid gap-6">
      <section className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader className="gap-4">
            <p className="eyebrow">Frontend First</p>
            <h1 className="font-display max-w-[14ch] text-[clamp(2.6rem,6vw,5.5rem)] leading-none">
              Reddit の技術議論を、整理された読み物へ。
            </h1>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="max-w-2xl text-sm leading-8 text-muted-foreground md:text-base">
              MVP では Reddit
              の議論を収集し、日本語要約と翻訳付きでテーマ別に読めることを目指します。
              現在は FE
              先行フェーズとして、すべてモックデータで画面構造を固めています。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-3">
            <p className="eyebrow">MVP Focus</p>
            <h2 className="font-display text-3xl leading-none">
              いま固めるもの
            </h2>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm leading-8 text-muted-foreground md:text-base">
              ホーム、テーマ詳細、記事詳細、管理画面の 4 画面と、将来の実 API
              へ差し替えやすい取得境界を先に整えます。
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        {/* テーマ一覧は下位 component に閉じ、ホームは紹介文と導線の構成だけを持つ。 */}
        <SectionHeader
          eyebrow="Topics"
          title="テーマ一覧"
          description="ソフトウェアエンジニアリング、Local LLM、画像生成 AI、AMD ROCm を初期対象にします。"
        />
        <ThemeGrid themes={themes} />
      </section>
    </div>
  );
}
