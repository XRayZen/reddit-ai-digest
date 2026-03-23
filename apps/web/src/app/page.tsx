import { SectionHeader } from "@/components/section-header";
import { ThemeGrid } from "@/features/themes/components/theme-grid";
import { getThemes } from "@/lib/api/client";

export default async function HomePage() {
  const themes = await getThemes();

  return (
    <div className="stack-xl">
      <section className="landing-grid">
        <div className="hero-card">
          <p className="eyebrow">Frontend First</p>
          <h1>Reddit の技術議論を、整理された読み物へ。</h1>
          <p className="hero-copy">
            MVP では Reddit
            の議論を収集し、日本語要約と翻訳付きでテーマ別に読めることを目指します。
            現在は FE
            先行フェーズとして、すべてモックデータで画面構造を固めています。
          </p>
        </div>

        <div className="panel">
          <p className="eyebrow">MVP Focus</p>
          <h2>いま固めるもの</h2>
          <p className="section-copy">
            ホーム、テーマ詳細、記事詳細、管理画面の 4 画面と、将来の実 API
            へ差し替えやすい取得境界を先に整えます。
          </p>
        </div>
      </section>

      <section>
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
