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
- `apps/web` の既定導線は `CONTENT_API_MODE=mock` とし、live 疎通確認だけ Compose またはローカル起動の API を使う
- 管理ジョブの queued 状態を安定して確認する手動 live チェックでは、`worker` を起動しない

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
make compose-config
docker compose -f infra/compose/docker-compose.yml -f infra/compose/docker-compose.override.yml --env-file infra/compose/.env up -d --build mysql
make migrate
make seed
docker compose -f infra/compose/docker-compose.yml -f infra/compose/docker-compose.override.yml --env-file infra/compose/.env up -d web api worker
make test-go
```

Compose 標準導線:

```bash
cp infra/compose/.env.example infra/compose/.env
make compose-config
make migrate
make seed
make up
make ps
make logs
```

Web live 手動確認の最短導線:

```bash
cp infra/compose/.env.example infra/compose/.env
make compose-config
make migrate
make seed
docker compose -f infra/compose/docker-compose.yml -f infra/compose/docker-compose.override.yml --env-file infra/compose/.env up -d --build web api mysql
```

補足:
- DB は MySQL を唯一の正本とし、migration と seed も MySQL に対して実行する
- `make migrate` と `make seed` は Compose の one-off service を呼び出す
- 初回初期化をやり直す場合は `docker compose -f infra/compose/docker-compose.yml -f infra/compose/docker-compose.override.yml --env-file infra/compose/.env down -v` を使う
- 公開 read API は Connect、管理操作は REST で確認する
- 管理 REST を叩くときは `X-Admin-Token: local-admin-token` を付ける
- migration の正当性確認は unit test ではなく、この Compose 導線や統合テスト / E2E で行う
- `apps/web/scripts/check-all-local.sh` は mock 前提の UI 回帰確認であり、live ブラウザ疎通の代替にはしない
- `apps/api/scripts/check-all-local.sh` は Compose 上の MySQL / migration / seed / 実 API E2E を担い、worker は起動しない
- Docker が使えない環境では `apps/api/scripts/check-all-local.sh` が sqlite + ローカル API 起動へ fallback し、API E2E まで継続する

補足:

- 実際のコマンド名は将来の `Makefile` 実装に合わせる
- `.env` には API キーや DB 接続情報など、ローカルに必要な最小値のみを入れる
- 初回セットアップ手順は README と重複させすぎず、開発運用の観点に寄せる
- Web の実 API 接続先は `NEXT_PUBLIC_*` ではなく `CONTENT_API_BASE_URL` に閉じ込める

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

live 手動確認 checklist:

1. `http://127.0.0.1:3000/` でテーマ一覧が表示できる
2. `http://127.0.0.1:3000/themes/software-engineering` で記事一覧が表示できる
3. `http://127.0.0.1:3000/articles/se-001` で記事詳細が表示できる
4. `http://127.0.0.1:3000/admin` で収集用テーマ選択、再要約用テーマ選択、記事選択ができる
5. `収集実行` で queued ジョブが追加され、画面 refresh 後の一覧に反映される
6. `再要約実行` で queued ジョブが追加され、画面 refresh 後の一覧に反映される
7. API ログで `trace_id` を確認できる

### 7.3 品質確認

- 関連テストが通る
- lint / format が通る
- 必要なドキュメント更新が行われている
- バックエンド変更時は `apps/api/scripts/check-all-local.sh` が通る
- Web 変更時は `./apps/web/scripts/check-all-local.sh` を通す

追加観点:

- 主要ログに `trace_id`、`job_id`、対象 subreddit が出る
- 再要約や再試行の手動確認が可能なら最低 1 回は通す

フロントエンド先行フェーズでの追加確認:

- Browser Use CLI から `apps/web` のローカル画面へアクセスできる
- screenshot を `apps/web/artifacts/` に保存できる
- 確認シナリオが `apps/web/test-scenarios/` に整理されている
- root ベース環境では `apps/web/scripts/browser-use-local.sh` 経由で Browser Use を実行する
- Storybook が `apps/web` 単体で起動できる
- `build-storybook` が成功する
- Playwright visual golden が baseline と一致する
- Playwright E2E が production build ベースで主要導線を通過する

### 7.4 Storybook / visual regression

- Storybook は page 直結ではなく表示コンポーネント単位で story を持つ
- page 相当 story のみ `pageShell` を付け、部品 story は shell なしで比較する
- 見た目回帰は `Storybook + Playwright` で固定する
- `test:golden` と `test:golden:update` は毎回 `storybook-static` を作り直して専用 HTTP server で配信する
- CI では `build-storybook` 済み成果物を golden test で再利用し、build の重複を避ける
- `test:golden:update` は意図した UI 変更時のみ実行する

確認コマンド:

```bash
corepack pnpm --filter @reddit-ai-digest/web storybook
corepack pnpm --filter @reddit-ai-digest/web build-storybook
corepack pnpm --filter @reddit-ai-digest/web test:golden
corepack pnpm --filter @reddit-ai-digest/web test:golden:update
corepack pnpm --filter @reddit-ai-digest/web test:e2e
```

### 7.5 apps/api E2E

- `apps/api/e2e` は seed 済み MySQL と実 API を使って、Connect read API と管理 REST をまとめて確認する
- 基本フローは `seed -> 各 EP 呼び出し -> レスポンス検証 -> DB 検証 -> cleanup`
- 管理ジョブの queued 状態を安定して検証するため、ローカル一括チェックでは `worker` を起動しない

確認コマンド:

```bash
corepack pnpm test:e2e:api
./apps/api/scripts/check-all-local.sh
./apps/web/scripts/check-all-local.sh
```

確認観点:

- `ThemeCard`、`ArticleCard`、`ArticleDetailView`、`ThemeDetailClient`、`AdminDashboard` の主要 state が固定比較できる
- 長文、空状態、エラー状態、ロード状態を story と baseline に含める
- diff は `playwright-report/` と `test-results/` で確認する
- E2E は home -> theme detail -> article detail -> admin の主要導線が通ることを確認する
- `./apps/web/scripts/check-all-local.sh` は mock fixture 前提の導線回帰であり、live の最終確認は上記 manual checklist に分担する

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
