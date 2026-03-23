# ローカル開発

## 1. この文書の目的
この文書は、本プロジェクトをローカル環境で起動し、
最低限の開発・確認作業を行うための手順を整理するための資料である。

関連ドキュメント:
- `AGENTS.md`
- `docs/architecture/overview.md`
- `docs/architecture/api.md`
- `docs/product/mvp-scope.md`

---

## 2. ローカル開発の方針
ローカル開発では、Docker Compose により
フロントエンド、API、ワーカー、DB などを一括で起動する。

目的:
- ローカルで MVP の主要フローを再現できるようにする
- 収集 → 保存 → 要約 → 表示 を一通り確認できるようにする
- 実装前後のテストと動作確認をしやすくする

補足:
- ローカル環境は本番完全再現ではなく、主要フローの確認と開発速度を優先する
- raw データ、AI 出力、ジョブ状態を追えることを重視する
- 依存サービスが未実装でも、将来の構成を見据えた責務分離は維持する
- フロントエンド先行フェーズでは API 全モックで UI 実装を進めてもよい

---

## 3. 想定する起動対象
ローカルでは以下を起動対象とする。

- `apps/web`
  - Next.js による公開 UI / 管理 UI
- `apps/api`
  - Go gRPC サーバー
  - 一部 REST エンドポイント
- `apps/worker`
  - Reddit 収集 / AI 要約 / 再試行処理
- `mysql`
  - MVP 用 DB
- `minio`
  - S3 互換のローカルストレージ
- 必要に応じて補助コンテナ
  - migration 実行用
  - proto 生成用
  - test 用

将来的な補足:
- Web からの主データ取得は gRPC-Web、Connect、Gateway、または BFF 経由を想定する
- 監視補助としてローカル向けのログビューアやテスト専用コンテナを追加してもよい
- UI 先行時は `apps/web` 単体起動とモック API の組み合わせを許容する

---

## 4. 前提ツール
ローカル開発では以下を前提とする。

- Docker
- Docker Compose
- Go
- Node.js
- pnpm
- Protocol Buffers 関連ツール
- Make

詳細なバージョンは `README.md` または
将来の `docs/operations/tool-versions.md` に定義する。

前提:
- チーム内で主要ツールの大きなバージョン差を作らない
- `make` などの共通コマンドで起動・生成・テストを統一する

---

## 5. 初回セットアップ
初回セットアップの基本手順は以下。

1. 環境変数ファイルを作成する
2. Docker Compose を起動する
3. migration を実行する
4. seed データを投入する
5. proto 生成が必要なら生成する
6. Web / API / Worker の起動を確認する

例:
```bash
cp infra/compose/.env.example infra/compose/.env
make up
make migrate
make seed
make test
```

補足:
- 実際のコマンド名は将来の `Makefile` 実装に合わせる
- `.env` には API キーや DB 接続情報など、ローカルに必要な最小値のみを入れる
- 初回セットアップ手順は README と重複させすぎず、開発運用の観点に寄せる

---

## 6. 日常的な開発フロー
通常の開発は以下の流れで行う。

1. 変更前に短い作業計画を作る
2. 承認後に実装する
3. 可能な限りテストファーストで進める
4. ローカルで関連テストを実行する
5. 必要なら Web / API / Worker を手動確認する
6. 実装後にセルフレビューする
7. 関連ドキュメントを更新する

詳細ルールは `AGENTS.md` を参照する。

運用メモ:
- 変更が proto や prompt に及ぶ場合は専用 Skill を先に確認する
- 1 回の変更で複数レイヤに波及する場合は、UI より契約変更の確認を先に行う
- フロントエンド先行で進める場合は `docs/plans/frontend-first-mock-api-plan.md` を参照する

---

## 7. 動作確認の最小チェック
ローカルで最低限確認すべきことは以下。

### 7.1 起動確認
- web が起動する
- api が起動する
- worker が起動する
- mysql に接続できる
- minio が起動する

フロントエンド先行フェーズでの補足:
- `apps/web` 単体で起動できる
- モック経由で主要画面が表示できる

### 7.2 機能確認
- テーマ一覧が表示できる
- 記事一覧が取得できる
- 記事詳細が取得できる
- 収集ジョブを実行できる
- 要約ジョブを実行できる

### 7.3 品質確認
- 関連テストが通る
- lint / format が通る
- 必要なドキュメント更新が行われている

追加観点:
- 主要ログに `trace_id`、`job_id`、対象 subreddit が出る
- 再要約や再試行の手動確認が可能なら最低 1 回は通す

---

## 8. gRPC / proto 変更時の確認
proto を変更した場合は以下を行う。

1. `.proto` を更新する
2. 生成コードを更新する
3. API / Worker 実装を更新する
4. 関連テストを更新する
5. Web 側の影響を確認する
6. API ドキュメントを更新する

詳細は `.ai/skills/proto-schema-review/SKILL.md` を参照する。

---

## 9. プロンプト変更時の確認
プロンプトを変更した場合は以下を行う。

1. 変更理由を明確にする
2. `prompt_version` を更新する
3. 出力スキーマへの影響を確認する
4. golden test / eval を更新する
5. 既存 UI 表示への影響を確認する

詳細は `.ai/skills/prompt-regression-check/SKILL.md` を参照する。

---

## 10. ログ確認
ローカルでは、API / Worker のログを確認できるようにする。

確認対象:
- `trace_id`
- `job_id`
- `subreddit`
- `topic_id`
- `model_name`
- `prompt_version`
- error message

本番ログ調査の詳細は
`.ai/skills/cloudwatch-log-search/SKILL.md` を参照する。

補足:
- 収集、要約、保存の各段階で同一 `trace_id` を追えることが望ましい
- LLM 呼び出し失敗時は model 名と prompt version が追えることを重視する

---

## 11. トラブルシュートの入口
問題が起きたら、まず以下を確認する。

- コンテナが正常起動しているか
- migration が適用されているか
- 環境変数が不足していないか
- proto 生成漏れがないか
- prompt / schema の不整合がないか
- DB 接続情報が正しいか

個別の問題は以下を参照する。

- Reddit 収集:
  - `.ai/skills/reddit-ingestion-debug/SKILL.md`
- proto 変更:
  - `.ai/skills/proto-schema-review/SKILL.md`
- prompt 品質:
  - `.ai/skills/prompt-regression-check/SKILL.md`

---

## 12. ローカル完了条件
ローカルでの作業完了条件は以下。

- 対象コンテナが正常起動している
- 関連機能がローカルで確認できている
- 関連テストが通っている
- lint / format が通っている
- セルフレビューが完了している
- 必要な docs / proto / eval 更新が反映されている

補足:
- 文書だけの変更でも、参照関係が壊れていないことは確認する
- 実装未着手の部分がある場合は、未確認事項を明示して終える
