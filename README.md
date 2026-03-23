# Reddit AI Digest

技術系 Reddit 議論を収集し、AI で翻訳・要約して、テーマ別に読めるニュースサイト風サービスを構築するモノレポです。

---

## 概要

このプロジェクトは、海外の技術系 Reddit 議論を対象に、
以下の流れを一気通貫で実現することを目的とします。

- Reddit から議論を収集する
- 生データを保存する
- AI で日本語翻訳・要約する
- テーマ別に記事として閲覧可能にする
- 管理画面から収集・再要約を運用できるようにする

対象テーマ:
- ソフトウェアエンジニアリング
- ローカル LLM
- 画像生成 AI
- AMD ROCm

---

## 主要機能

### MVP で実装するもの
- テーマ一覧表示
- テーマ別記事一覧表示
- 記事詳細表示
  - 元スレタイトル
  - 元 URL
  - 日本語翻訳
  - 日本語要約
  - 主要論点
  - 議論傾向ラベル
- Reddit 収集
- AI 要約
- 管理者向け収集実行
- 管理者向け再要約実行
- 基本的なジョブ履歴確認

### MVP で後回しにするもの
- 一般ユーザー向けアカウント機能
- レコメンド
- ベクトル検索
- 課金
- 高度なランキング
- 複雑なソーシャル機能

詳細は `docs/product/mvp-scope.md` を参照してください。

---

## 技術スタック

- フロントエンド
  - Next.js
  - React
  - Redux Toolkit
- バックエンド
  - Go
- ワーカー
  - Go
- API
  - gRPC を主軸
  - REST は管理者用・補助用途に限定
- スキーマ
  - Protocol Buffers
- DB
  - MySQL（MVP）
- インフラ
  - AWS ECS
  - RDS
  - S3
  - CloudFront
  - WAF
- CI/CD
  - GitHub Actions
- 監視
  - CloudWatch
  - Sentry
- AI
  - OpenAI 互換 API

---

## リポジトリ構成

```text
.
├── AGENTS.md
├── README.md
├── apps/
│   ├── web/
│   ├── api/
│   └── worker/
├── packages/
│   ├── proto/
│   ├── schemas/
│   └── openapi/
├── infra/
│   ├── compose/
│   ├── docker/
│   └── terraform/
├── docs/
│   ├── adr/
│   ├── architecture/
│   ├── development/
│   ├── operations/
│   └── product/
└── .ai/
    ├── prompts/
    ├── evals/
    └── skills/
```

役割:
- `apps/web`
  - 公開 UI / 管理 UI
- `apps/api`
  - Go gRPC サーバー
  - 一部 REST エンドポイント
- `apps/worker`
  - 収集 / 要約 / 再試行ジョブ
- `packages/proto`
  - Protocol Buffers 定義
- `packages/schemas`
  - AI 出力や補助スキーマ
- `infra/compose`
  - ローカル Docker 開発環境
- `infra/terraform`
  - AWS IaC
- `docs/`
  - 設計・運用・スコープ文書
- `.ai/`
  - AI エージェント向け資産

補足:
- 上記は想定構成であり、現時点で未作成のディレクトリも含む
- `packages/openapi` は将来 REST 補助用途や公開仕様が必要になった場合の候補として確保している

---

## 設計方針

- モノレポで Web / API / Worker / IaC / docs / AI 資産を一元管理する
- gRPC を主軸とし、内部契約は `.proto` を正本として扱う
- REST は管理者用・補助用途に限定する
- 生データ、正規化データ、AI 生成データを分離して保存する
- AI プロバイダは抽象化層の背後に置く
- `trace_id` を API / Worker / LLM 呼び出しの相関キーにする
- AGENTS.md は短い入口資料に留め、詳細は docs/ と `.ai/` に分離する

詳細は以下を参照してください。
- `docs/architecture/overview.md`
- `docs/architecture/api.md`
- `docs/architecture/data-model.md`
- `docs/architecture/observability.md`
- `docs/development/coding-rules-common.md`
- `docs/development/coding-rules-frontend.md`
- `docs/development/coding-rules-backend.md`
- `docs/development/code-review-checklist.md`
- `docs/adr/architecture-decisions.md`

---

## 設計文書一覧

このリポジトリでは、AGENTS.md は短い入口資料として保ち、
詳細な設計・運用・AI ワークフローは docs/ と `.ai/` に分離しています。

### まず読む文書
- `AGENTS.md`
  - AI エージェント向けの入口資料
- `docs/product/mvp-scope.md`
  - MVP の範囲
- `docs/architecture/overview.md`
  - 全体構成
- `docs/operations/local-development.md`
  - ローカル開発手順

### アーキテクチャ
- `docs/architecture/overview.md`
- `docs/architecture/api.md`
- `docs/architecture/data-model.md`
- `docs/architecture/observability.md`

### 開発ルール
- `docs/development/coding-rules-common.md`
- `docs/development/coding-rules-frontend.md`
- `docs/development/coding-rules-backend.md`
- `docs/development/code-review-checklist.md`

### 実装プラン
- `docs/plans/`

### 意思決定ログ
- `docs/adr/architecture-decisions.md`

### AI エージェント向け資料
- `.ai/prompts/README.md`
- `.ai/evals/README.md`
- `.ai/skills/proto-schema-review/SKILL.md`
- `.ai/skills/prompt-regression-check/SKILL.md`
- `.ai/skills/reddit-ingestion-debug/SKILL.md`
- `.ai/skills/cloudwatch-log-search/SKILL.md`

---

## 文書の読み順

### 実装前
1. `AGENTS.md`
2. `docs/product/mvp-scope.md`
3. `docs/architecture/overview.md`
4. `docs/development/coding-rules-common.md`
5. `docs/operations/local-development.md`

### フロントエンドを触るとき
1. `docs/development/coding-rules-common.md`
2. `docs/development/coding-rules-frontend.md`
3. `docs/plans/`
4. `docs/development/code-review-checklist.md`

### バックエンドを触るとき
1. `docs/development/coding-rules-common.md`
2. `docs/development/coding-rules-backend.md`
3. `docs/development/code-review-checklist.md`

### API / proto を触るとき
1. `docs/architecture/api.md`
2. `docs/adr/architecture-decisions.md`
3. `.ai/skills/proto-schema-review/SKILL.md`

### プロンプトを触るとき
1. `.ai/prompts/README.md`
2. `.ai/prompts/`
3. `.ai/skills/prompt-regression-check/SKILL.md`
4. `.ai/evals/README.md`

### 収集障害を追うとき
1. `docs/architecture/data-model.md`
2. `.ai/skills/reddit-ingestion-debug/SKILL.md`
3. `.ai/skills/cloudwatch-log-search/SKILL.md`

---

## ローカル開発

フロントエンド先行フェーズでは、
`apps/web` を App Router 前提で実装しつつ、
API 通信をモックで置き換えて UI を先に進めてもよいです。

補足:
- API 全モックの初期実装プランは `docs/plans/` を参照する
- モック方式は `apps/web` 側で閉じ、本番依存コードへ漏らさない

基本的な流れ:

```bash
cp infra/compose/.env.example infra/compose/.env
make up
make migrate
make seed
make test
```

ローカル開発の詳細は `docs/operations/local-development.md` を参照してください。

---

## 開発ルール

- 実装前に短い作業計画を提示し、承認を得てから着手する
- 可能な限りテストファーストで進める
- 実装後は必ずセルフレビューを行う
- MVP 範囲を勝手に広げない
- proto / prompt / schema を変更した場合は関連文書と評価資産も更新する

詳細は `AGENTS.md` を参照してください。

コーディングルールの詳細は以下を参照してください。
- `docs/development/coding-rules-common.md`
- `docs/development/coding-rules-frontend.md`
- `docs/development/coding-rules-backend.md`
- `docs/development/code-review-checklist.md`

---

## AI エージェント運用

このリポジトリでは、人間と AI エージェントの両方が
同じ文書体系で開発できることを重視します。

方針:
- `AGENTS.md`
  - 入口
- `docs/`
  - 詳細設計と運用文書
- `.ai/prompts/`
  - プロンプト資産
- `.ai/evals/`
  - 回帰評価資産
- `.ai/skills/`
  - 反復作業の標準手順

この構成により、
短い入口資料・詳細設計・再利用可能な作業手順を分離し、
AI エージェントと人間の両方が同じ文書体系で開発できる状態を目指します。

---

## gRPC / Protocol Buffers 方針

- 主処理は gRPC を優先する
- `.proto` を契約の正本とする
- proto 変更時は生成コード、実装、テスト、文書を合わせて更新する
- 互換性を意識し、破壊的変更は慎重に扱う

詳細は以下を参照してください。
- `docs/architecture/api.md`
- `.ai/skills/proto-schema-review/SKILL.md`

---

## プロンプトと評価

- プロンプト資産は `.ai/prompts/` に配置する
- 評価資産は `.ai/evals/` に配置する
- プロンプト変更時は `prompt_version` と評価資産を更新する
- 出力 shape を変える場合は schema と UI の影響を確認する

詳細は以下を参照してください。
- `.ai/prompts/README.md`
- `.ai/evals/README.md`
- `.ai/skills/prompt-regression-check/SKILL.md`

---

## 今後の拡張候補

- topic clustering
- source adapter の追加
- 複数 LLM provider 対応
- CockroachDB 検証
- ベクトル検索
- 管理画面強化
- article view 最適化
