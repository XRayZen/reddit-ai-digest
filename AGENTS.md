## 目的
このリポジトリは、技術系 Reddit 議論を収集し、
OpenAI 互換 LLM で翻訳・要約し、
テーマ別に読めるニュースサイト風サービスを作るための
ポートフォリオ用モノレポです。

対象テーマ:
- ソフトウェアエンジニアリング
- ローカル LLM
- 画像生成 AI
- AMD ROCm

このファイルは AI エージェント向けの短い入口資料です。
詳細ルールは `docs/` と `.ai/` を参照してください。

## 作業ルール
1. 実装前に必ず短い作業計画を提示し、OK を得てから着手する。
2. 可能な限りテストファーストで進める。
3. 実装後は必ずセルフコードレビューを行う。
4. アーキテクチャ変更時は `docs/architecture/overview.md` を先に読む。
5. MVP 範囲の確認は `docs/product/mvp-scope.md` を参照する。
6. ローカル開発手順は `docs/operations/local-development.md` を参照する。
7. Reddit 収集まわりは `.ai/skills/reddit-ingestion-debug/SKILL.md` を参照する。
8. プロンプトや要約品質は `.ai/skills/prompt-regression-check/SKILL.md` を参照する。
9. デプロイや運用は `.ai/skills/ecs-deploy-check/SKILL.md` を参照する。
10. 本番ログ調査は `.ai/skills/cloudwatch-log-search/SKILL.md` を参照する。

## ディレクトリ別ルール
- `apps/web` 配下では `apps/web/AGENTS.md` を優先して参照する。
- `apps/api` 配下では `apps/api/AGENTS.md` を優先して参照する。
- `apps/worker` 配下では `apps/worker/AGENTS.md` を優先して参照する。
- 共通ルールは `docs/development/*.md` を参照する。

## 完了条件
作業完了の条件:
- 承認済みの計画に沿って実装されている
- 関連テストが通っている
- lint / format が通っている
- 影響のあるドキュメントが更新されている
- セルフレビューが完了している
- proto / prompt / schema 変更時は関連テストと eval も更新されている

## 技術スタック
- フロントエンド: Next.js / React / Redux Toolkit
- バックエンド: Go
- ワーカー: Go
- API: gRPC を主軸、REST は管理者用など一部用途で使用
- スキーマ: Protocol Buffers
- DB: MySQL（MVP）
- インフラ: AWS ECS / RDS / S3 / CloudFront / WAF
- CI/CD: GitHub Actions
- 監視: CloudWatch / Sentry
- AI: OpenAI 互換 API

## アーキテクチャマップ
- `apps/web`: 公開 UI / 管理 UI
- `apps/api`: Go gRPC サーバーと一部 REST エンドポイント
- `apps/worker`: 収集 / 要約 / 再試行ジョブ
- `packages/proto`: gRPC / Protocol Buffers 定義
- `packages/schemas`: REST / AI 出力スキーマ
- `infra/compose`: ローカル Docker 環境
- `infra/terraform`: AWS IaC
- `docs/architecture/*`: 詳細設計
- `docs/operations/*`: 開発・デプロイ・運用手順
- `.ai/prompts/*`: AI 用プロンプト
- `.ai/skills/*`: 作業別ガイド
- `.ai/evals/*`: 回帰テスト / golden set

## 重要制約
- `AGENTS.md` 自体は短く保ち、詳細は別ファイルへ分離する。
- 明示的な依頼がない限り MVP 範囲を超えて拡張しない。
- 生データは保持し、破壊的に上書きしない。
- 内部契約は proto を正本として扱う。
- REST は管理者用・補助用途に限定し、主処理は gRPC を優先する。
- API / Worker / LLM 呼び出しは trace_id で相関可能にする。

## 最初に読むもの
- `README.md`
- `docs/product/mvp-scope.md`
- `docs/architecture/overview.md`
- `docs/operations/local-development.md`
