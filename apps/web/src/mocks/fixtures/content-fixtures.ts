import type {
  AdminArticleOptionsByTheme,
  AdminJob,
  ArticleDetail,
  Theme,
  ThemeDetail,
} from "@/types/content";

const themes: Theme[] = [
  {
    slug: "software-engineering",
    name: "Software Engineering",
    description: "設計、保守、レビュー文化の変化を追うテーマ。",
    articleCount: 3,
  },
  {
    slug: "local-llm",
    name: "Local LLM",
    description: "個人環境での推論、量子化、運用知見を扱うテーマ。",
    articleCount: 2,
  },
  {
    slug: "image-generation",
    name: "Image Generation AI",
    description: "画像生成ワークフローとモデル比較を扱うテーマ。",
    articleCount: 1,
  },
  {
    slug: "amd-rocm",
    name: "AMD ROCm",
    description: "ROCm の導入、検証、実運用の情報をまとめるテーマ。",
    articleCount: 1,
  },
];

const themeDetails: Record<string, ThemeDetail> = {
  "software-engineering": {
    ...themes[0],
    articles: [
      {
        id: "se-001",
        themeSlug: "software-engineering",
        title:
          "Senior engineers are replacing endless sprint churn with release trains",
        summary:
          "スプリントを細かく回すより、意図を揃えたリリース単位で進める方が認知負荷を下げるという議論。",
        sourceUrl: "https://reddit.com/r/softwareengineering/comments/se001",
        publishedAt: "2026-03-20T10:00:00Z",
        stanceLabel: "運用改善",
        pointCount: 4,
      },
      {
        id: "se-002",
        themeSlug: "software-engineering",
        title:
          "Teams are deleting flaky integration tests faster than fixing them",
        summary:
          "不安定な統合テストを減らし、契約テストと監視で補完する流れが支持されている。",
        sourceUrl: "https://reddit.com/r/softwareengineering/comments/se002",
        publishedAt: "2026-03-18T09:00:00Z",
        stanceLabel: "品質戦略",
        pointCount: 3,
      },
      {
        id: "se-003",
        themeSlug: "software-engineering",
        title:
          "Architecture docs are back because AI tools need explicit context",
        summary:
          "AI コーディング支援の普及で、暗黙知を減らす設計文書の価値が再評価されている。",
        sourceUrl: "https://reddit.com/r/softwareengineering/comments/se003",
        publishedAt: "2026-03-14T03:00:00Z",
        stanceLabel: "設計文化",
        pointCount: 5,
      },
    ],
  },
  "local-llm": {
    ...themes[1],
    articles: [
      {
        id: "llm-001",
        themeSlug: "local-llm",
        title:
          "People are standardizing on 4-bit models for daily coding assistants",
        summary:
          "ローカル常用では 4-bit 量子化と VRAM 節約の実務バランスが重視されている。",
        sourceUrl: "https://reddit.com/r/LocalLLaMA/comments/llm001",
        publishedAt: "2026-03-19T05:00:00Z",
        stanceLabel: "推論最適化",
        pointCount: 4,
      },
      {
        id: "llm-002",
        themeSlug: "local-llm",
        title: "Context window benchmarks still mislead desktop users",
        summary:
          "単純な最大コンテキスト長より、実運用では速度低下や応答品質の落ち方が重要だという整理。",
        sourceUrl: "https://reddit.com/r/LocalLLaMA/comments/llm002",
        publishedAt: "2026-03-16T02:00:00Z",
        stanceLabel: "評価観点",
        pointCount: 3,
      },
    ],
  },
  "image-generation": {
    ...themes[2],
    articles: [
      {
        id: "img-001",
        themeSlug: "image-generation",
        title: "Studios are treating prompt presets like LUT packs",
        summary:
          "プロンプトと設定プリセットを資産化して再利用する制作フローが共有されている。",
        sourceUrl: "https://reddit.com/r/StableDiffusion/comments/img001",
        publishedAt: "2026-03-17T08:00:00Z",
        stanceLabel: "制作フロー",
        pointCount: 4,
      },
    ],
  },
  "amd-rocm": {
    ...themes[3],
    articles: [
      {
        id: "rocm-001",
        themeSlug: "amd-rocm",
        title:
          "ROCm users are documenting kernel pinning to avoid surprise regressions",
        summary:
          "カーネル更新とドライバ整合性を運用ルールで吸収する知見が蓄積している。",
        sourceUrl: "https://reddit.com/r/ROCm/comments/rocm001",
        publishedAt: "2026-03-15T12:00:00Z",
        stanceLabel: "運用ノウハウ",
        pointCount: 4,
      },
    ],
  },
};

const articleDetails: Record<string, ArticleDetail> = {
  "se-001": {
    id: "se-001",
    themeSlug: "software-engineering",
    title: themeDetails["software-engineering"].articles[0].title,
    sourceUrl: themeDetails["software-engineering"].articles[0].sourceUrl,
    sourceSiteLabel: "Reddit / r/softwareengineering",
    publishedAt: themeDetails["software-engineering"].articles[0].publishedAt,
    translation:
      "多くのチームが、二週間スプリントを盲目的に回すより、リリース単位で機能を束ねて合意形成した方が、依存関係と説明コストを減らせると報告している。",
    summary:
      "議論では、細かい反復そのものより、いつ何を出すのかを共有できる運用形の方が価値を生むという意見が優勢だった。特に複数チームが関わる環境では、レビュー待ちや調整待ちをスプリント目標に押し込むより、リリース列車の方が現実に合うという声が多い。",
    keyPoints: [
      "スプリント速度より、リリース意図の共有が重視されている。",
      "依存チームが多い環境では、固定 cadence の方が説明しやすい。",
      "完了条件を小さなタスクではなく出荷可能性で見る傾向がある。",
    ],
    stanceLabel: "運用改善",
  },
  "se-002": {
    id: "se-002",
    themeSlug: "software-engineering",
    title: themeDetails["software-engineering"].articles[1].title,
    sourceUrl: themeDetails["software-engineering"].articles[1].sourceUrl,
    sourceSiteLabel: "Reddit / r/softwareengineering",
    publishedAt: themeDetails["software-engineering"].articles[1].publishedAt,
    translation:
      "壊れやすい統合テストを守るコストが高すぎるため、契約テストと実運用監視へ責任を分散する流れが語られている。",
    summary:
      "参加者は、CI を不安定にする統合テストを無理に延命させるより、境界契約の保証と本番観測の強化で品質を保つ方が現実的だと述べている。",
    keyPoints: [
      "テストの数ではなく信頼度を重視する傾向がある。",
      "契約テストとアラート設計の組み合わせが代替策として挙がった。",
      "不安定テストの維持コストを定量化すべきという声が多い。",
    ],
    stanceLabel: "品質戦略",
  },
  "se-003": {
    id: "se-003",
    themeSlug: "software-engineering",
    title: themeDetails["software-engineering"].articles[2].title,
    sourceUrl: themeDetails["software-engineering"].articles[2].sourceUrl,
    sourceSiteLabel: "Reddit / r/softwareengineering",
    publishedAt: themeDetails["software-engineering"].articles[2].publishedAt,
    translation:
      "AI ツールに正しい文脈を渡すため、設計意図を文章で残す重要性が再確認されている。",
    summary:
      "過去には更新されない設計書が軽視されていたが、AI 支援開発では暗黙知が誤生成の原因になるため、軽量でも明示的な文書が必要という意見が多かった。",
    keyPoints: [
      "AI 利用が設計文書の必要性を押し上げている。",
      "巨大文書より、更新しやすい短い文書が好まれている。",
      "オンボーディング効率の改善も副次効果として挙がった。",
    ],
    stanceLabel: "設計文化",
  },
  "llm-001": {
    id: "llm-001",
    themeSlug: "local-llm",
    title: themeDetails["local-llm"].articles[0].title,
    sourceUrl: themeDetails["local-llm"].articles[0].sourceUrl,
    sourceSiteLabel: "Reddit / r/LocalLLaMA",
    publishedAt: themeDetails["local-llm"].articles[0].publishedAt,
    translation:
      "日常的なコーディング支援では、最大性能よりも VRAM 使用量と応答速度の釣り合いが重視され、4-bit 量子化モデルに運用が収束しつつあるという報告が共有されている。",
    summary:
      "議論では、高精度モデルを常時動かすより、即応性の高い 4-bit 構成を日々の補助に使い、重い検証だけ別系統に逃がす運用が支持されていた。開発者体験の観点では、待ち時間の短さが継続利用を左右するという意見が多い。",
    keyPoints: [
      "常用アシスタントでは応答速度と VRAM 節約の両立が重視されている。",
      "重いモデルは常用ではなく、必要時だけ使う分離運用が好まれている。",
      "量子化による精度低下より、待ち時間短縮の便益が大きいという見方が多い。",
    ],
    stanceLabel: "推論最適化",
  },
  "llm-002": {
    id: "llm-002",
    themeSlug: "local-llm",
    title: themeDetails["local-llm"].articles[1].title,
    sourceUrl: themeDetails["local-llm"].articles[1].sourceUrl,
    sourceSiteLabel: "Reddit / r/LocalLLaMA",
    publishedAt: themeDetails["local-llm"].articles[1].publishedAt,
    translation:
      "最大コンテキスト長だけを比較しても、デスクトップ実運用では速度低下や文脈保持の劣化を説明できないという指摘が共有されている。",
    summary:
      "参加者は、長大コンテキストの宣伝値よりも、一定長を超えたあとの速度低下や回答の崩れ方を評価すべきだと述べている。とくに個人 GPU 環境では、カタログスペックだけでモデルを選ぶと期待外れになりやすいという整理だった。",
    keyPoints: [
      "最大値より、長文入力時の品質低下カーブを測るべきという意見が多い。",
      "デスクトップ環境ではスループット低下が実用性を左右する。",
      "ベンチマーク表の数値だけでは常用体験を予測しにくい。",
    ],
    stanceLabel: "評価観点",
  },
  "img-001": {
    id: "img-001",
    themeSlug: "image-generation",
    title: themeDetails["image-generation"].articles[0].title,
    sourceUrl: themeDetails["image-generation"].articles[0].sourceUrl,
    sourceSiteLabel: "Reddit / r/StableDiffusion",
    publishedAt: themeDetails["image-generation"].articles[0].publishedAt,
    translation:
      "制作現場では、よく使うプロンプトと生成設定を LUT パックのような再利用資産として管理する運用が広がっている。",
    summary:
      "議論では、単発の良いプロンプトを探すより、スタイルごとに再利用可能なプリセット群を整備する方がチーム制作に向くという意見が目立った。これにより担当者が変わっても画作りの再現性を保ちやすいとされている。",
    keyPoints: [
      "プロンプトは都度作るものではなく、再利用可能な資産として扱われている。",
      "設定と組み合わせて保存することで再現性が上がる。",
      "チーム制作では属人化の抑制に寄与するという見方がある。",
    ],
    stanceLabel: "制作フロー",
  },
  "rocm-001": {
    id: "rocm-001",
    themeSlug: "amd-rocm",
    title: themeDetails["amd-rocm"].articles[0].title,
    sourceUrl: themeDetails["amd-rocm"].articles[0].sourceUrl,
    sourceSiteLabel: "Reddit / r/ROCm",
    publishedAt: themeDetails["amd-rocm"].articles[0].publishedAt,
    translation:
      "ROCm 利用者のあいだで、予期しない性能劣化を避けるためにカーネル更新を固定し、既知の組み合わせを文書化する運用が共有されている。",
    summary:
      "参加者は、ドライバやカーネルを無条件で最新に追従するより、安定動作した組み合わせをチームで共有して維持する方が実務的だと述べている。特にローカル LLM や推論用途では、細かな更新が突然の不具合につながる点が強調されていた。",
    keyPoints: [
      "既知の安定構成を固定することが運用負荷の低減につながる。",
      "カーネルと ROCm の互換性を文書化する重要性が高い。",
      "最新追従より再現可能性を優先する姿勢が支持されている。",
    ],
    stanceLabel: "運用ノウハウ",
  },
};

const adminJobs: AdminJob[] = [
  {
    id: "job-20260323-001",
    type: "ingest",
    status: "completed",
    targetLabel: "r/softwareengineering",
    requestedAt: "2026-03-23T00:10:00Z",
  },
  {
    id: "job-20260323-002",
    type: "resummarize",
    status: "running",
    targetLabel: "topic se-001",
    requestedAt: "2026-03-23T00:35:00Z",
  },
  {
    id: "job-20260323-003",
    type: "ingest",
    status: "queued",
    targetLabel: "r/LocalLLaMA",
    requestedAt: "2026-03-23T01:05:00Z",
  },
];

export function listThemes(): Theme[] {
  return themes;
}

export function getThemeFixture(slug: string): ThemeDetail | null {
  return themeDetails[slug] ?? null;
}

export function getArticleFixture(id: string): ArticleDetail | null {
  return articleDetails[id] ?? null;
}

export function listAdminJobs(): AdminJob[] {
  return adminJobs;
}

export function listAdminArticleOptionsByTheme(): AdminArticleOptionsByTheme {
  return Object.fromEntries(
    Object.values(themeDetails).map((theme) => [
      theme.slug,
      theme.articles.map((article) => ({
        id: article.id,
        title: article.title,
        themeSlug: article.themeSlug,
      })),
    ]),
  );
}
