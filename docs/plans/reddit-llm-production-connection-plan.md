# Reddit / LLM 本接続プラン

## 1. この文書の目的
この文書は、Reddit 収集、raw snapshot 保存、OpenAI 互換 LLM による要約、worker 実行導線を MVP 向けに本接続するための実装計画をまとめるものである。

この plan の主眼は、既存の read 系 API と `job_executions` 基盤を崩さずに、`apps/worker` を dummy 実装から本処理へ差し替えることである。

関連ドキュメント:
- `AGENTS.md`
- `docs/product/mvp-scope.md`
- `docs/architecture/overview.md`
- `docs/architecture/api.md`
- `docs/architecture/data-model.md`
- `docs/architecture/observability.md`
- `docs/adr/architecture-decisions.md`
- `docs/plans/backend-implementation-plan.md`
- `apps/worker/README.md`
- `.ai/skills/reddit-ingestion-debug/SKILL.md`
- `.ai/skills/prompt-regression-check/SKILL.md`

---

## 2. 現状確認 (2026-03-28 時点)

このセクションは計画ではなく、コードベースの現状と本 plan で必要な差分を整理する。

### 2.1 実装済みの基盤

| 対象 | 状態 | 参照 |
|------|------|------|
| Worker 骨格 | **実装済み** | `apps/worker/cmd/worker/main.go` |
| Job claim / complete / fail | **実装済み** | `apps/worker/internal/runner/runner.go` |
| GORM job repository | **実装済み** | `internal/platform/jobs/jobs.go` |
| idempotency / unique 制約 | **実装済み** | `jobs.Enqueue` の unique key ハンドリング |
| DB migration (6テーブル) | **実装済み** | `apps/api/sql/migrations/0001_initial.up.sql` |
| trace_id 発行・伝播 | **実装済み** | `internal/platform/traceutil/trace.go` |
| read 系 Connect API | **実装済み** | `apps/api/internal/transport/connect/` |
| 管理 REST (ingestions/run, summaries/rerun) | **実装済み** | `apps/api/internal/transport/http/admin_handler.go` |
| Worker runner test | **実装済み** | `apps/worker/internal/runner/runner_test.go` |
| Job repository test | **実装済み** | `internal/platform/jobs/jobs_test.go` |

### 2.2 未実装・本 plan で必要な差分

| 対象 | 現状 | 必要な差分 |
|------|------|-----------|
| `theme_subreddits` テーブル | migration に存在しない | 新規 migration 追加が必要 |
| Worker config (Reddit/LLM/S3) | `DATABASE_*` のみ | Reddit / S3 / LLM 向け env 読み込みを追加 |
| `packages/schemas/` | ディレクトリ自体が存在しない | `ai/summary-output.schema.json` を新規作成 |
| Reddit adapter | 存在しない | `internal/ingestion/` を新規作成 |
| SnapshotStore | 存在しない | `internal/snapshot/` を新規作成 |
| Summarizer | 存在しない | `internal/summarization/` を新規作成 |
| Worker interfaces (RedditClient, SnapshotStore, Summarizer) | 存在しない | runner への DI 設計と interface 定義が必要 |
| Worker main.go の DI 組立 | repo + logger のみ | Reddit / S3 / LLM クライアントの初期化と注入 |
| `execute()` 本処理 | `time.Sleep(10ms)` の dummy | job type ごとの処理分岐を実装 |
| Compose (MinIO) | `infra/compose/` が存在しない | docker-compose.yml + .env.example に MinIO を追加 |
| `.ai/skills/reddit-ingestion-debug/` | 存在しない | Phase 5 で整備 |
| `.ai/skills/prompt-regression-check/` | 存在しない | Phase 4 で整備 |
| source_threads / source_comments の write repository | read repository のみ | upsert / insert 導線を worker 側に追加 |

### 2.3 既存コードの制約

- `runner.Runner` 構造体は `repo JobRepository` と `logger *slog.Logger` のみを持つ。本処理の依存注入にあたっては、構造体の拡張または handler パターンへの変更が必要。
- `Job.Type` は `adminv1.JobType` enum (`JOB_TYPE_INGEST` / `JOB_TYPE_RESUMMARIZE`) で既に定義済み。`execute()` 内で `job.Type` による分岐が可能。
- `Job.TargetID` は ingestion で `theme_slug`、resummarization で `article_id` を格納する設計で、admin handler 側もこの前提で実装済み。
- `job_executions.error_code` / `error_message` は `MarkFailed` 経由で記録でき、失敗分類の記録先として利用可能。

---

## 3. スコープ要約
この plan で決めること:
- Reddit adapter の取得方針
- raw snapshot の保存方針
- OpenAI 互換 LLM の要約方針
- worker の責務境界
- 失敗分類、環境変数、可観測性、テスト戦略

この plan で増やさないもの:
- 公開 read API endpoint
- 管理 REST endpoint
- cross-service RPC を前提にした proto 追加

補足:
- MVP の本接続は既存の `POST /api/admin/ingestions/run` と `POST /api/admin/summaries/rerun` を維持したまま進める
- `packages/proto/ingestion` と `packages/proto/summarization` は、cross-service RPC が必要になった時点で追加判断する

---

## 4. 実装対象の 4 本柱

### 4.1 Reddit adapter
方針:
- public subreddit の server-to-server 取得から始める
- confidential client 前提の OAuth token 取得を使う
- Reddit listing / thread 取得では `raw_json=1` を付ける
- listing pagination は `after` / `count` / `limit` を使う
- Reddit 固有型は adapter に閉じ込め、domain / usecase へ持ち込まない

対象正本:
- `theme -> subreddit` の対応は DB 正本にする
- 新規 runtime 契約として `theme_subreddits` テーブルを追加する
- ingestion job は `theme_slug` を target に持ち、worker が DB から対象 subreddit 群を展開する

最小収集対象:
- subreddit 一覧
- thread 本体
- 上位コメント
- permalink / external_url / score / num_comments / author / created_at_source

実装場所:
- `apps/worker/internal/ingestion/reddit_client.go` — RedditClient interface と HTTP 実装
- `apps/worker/internal/ingestion/reddit_client_test.go`
- `apps/worker/internal/ingestion/types.go` — Reddit 固有型

### 4.2 Raw snapshot
方針:
- raw snapshot は S3 / MinIO に保存する
- object key は immutable にし、再実行時も上書きしない
- bucket は versioning を前提にする
- lifecycle では noncurrent versions の整理方針を併記する
- `source_threads.raw_snapshot_s3_key` は最新成功 snapshot 参照として更新する

key 設計:
```
raw/{source_type}/{theme_slug}/{subreddit}/{source_thread_id}/{fetched_at}_{trace_id}.json
```

保存責務:
- raw 保存成功後にのみ normalize を進める
- raw 保存失敗時は `snapshot_store_error` で job を失敗扱いにする

実装場所:
- `apps/worker/internal/snapshot/store.go` — SnapshotStore interface と S3 実装
- `apps/worker/internal/snapshot/store_test.go`
- `apps/worker/internal/snapshot/key_builder.go` — object key 構築
- `apps/worker/internal/snapshot/key_builder_test.go`

### 4.3 Summarization
方針:
- OpenAI 互換 provider は `Responses API` を使う
- 出力は `text.format.type=json_schema` + `strict=true` を前提に固定する
- AI 出力 schema は `packages/schemas/ai/summary-output.schema.json` を正本にする
- `translation_ja` / `summary_ja` / `key_points` / `stance_label` を 1 schema へまとめる
- model 指定は alias ではなく pinned snapshot を env で渡す

保存方針:
- `provider_name`
- `model_name`
- `prompt_version`
- token usage
- latency
- request / response 失敗の分類

再要約:
- resummarization job は `article_id` を target に持つ
- raw / normalized は再利用し、AI 出力だけを追加保存する
- 既存 `ai_summaries` を消さず、比較可能な履歴として残す

実装場所:
- `packages/schemas/ai/summary-output.schema.json` — AI 出力 schema 正本 (**新規作成**)
- `apps/worker/internal/summarization/summarizer.go` — Summarizer interface と OpenAI 実装
- `apps/worker/internal/summarization/summarizer_test.go`
- `apps/worker/internal/summarization/schema.go` — schema validation

### 4.4 Worker orchestration
方針:
- 既存 `job_executions` と admin REST を維持する
- worker は `theme_slug` または `article_id` を起点に内部処理を展開する
- ingest と summarize を 1 巨大 job にせず段階責務を保つ
- runner は job type ごとに `RedditClient` / `SnapshotStore` / `Summarizer` を差し替え可能な構造にする

予定 runtime 契約:
- DB: `theme_subreddits`
- Worker interfaces:
  - `RedditClient`
  - `SnapshotStore`
  - `Summarizer`
- AI schema:
  - `packages/schemas/ai/summary-output.schema.json`

実装場所 (既存の修正):
- `apps/worker/internal/runner/runner.go` — 構造体拡張、job type 分岐、dummy 削除
- `apps/worker/internal/runner/runner_test.go` — 本処理のテスト追加
- `apps/worker/cmd/worker/main.go` — DI 組立に Reddit / S3 / LLM クライアントを追加
- `apps/worker/internal/config/config.go` — Reddit / S3 / LLM 向け env 読み込み追加

新規追加:
- `apps/worker/internal/ingestion/` — 収集処理
- `apps/worker/internal/summarization/` — 要約処理
- `apps/worker/internal/snapshot/` — snapshot 保存
- `apps/worker/internal/normalize/` — 正規化・DB 永続化

---

## 5. 失敗分類
job / log / metrics では次の失敗分類を固定する。

- `reddit_auth_error`
- `reddit_rate_limited`
- `reddit_api_error`
- `snapshot_store_error`
- `normalization_error`
- `db_persist_error`
- `llm_request_error`
- `llm_schema_error`
- `llm_rate_limited`

運用ルール:
- `error_code` は上記分類に寄せる
- `error_message` には provider 由来の詳細を残す
- 再試行可否は失敗分類ごとに整理する

初期方針:
- `reddit_rate_limited`
- `reddit_api_error`
- `snapshot_store_error`
- `llm_request_error`
- `llm_rate_limited`
は再試行候補

- `normalization_error`
- `db_persist_error`
- `llm_schema_error`
は実装不整合を疑う失敗として優先調査する

実装メモ:
- 分類値は `runner.execute()` 内の `repo.MarkFailed(ctx, job.ID, errorCode, errorMessage)` 呼び出しに直接渡す
- `job_executions.error_code` カラムは `VARCHAR(191)` で既に存在する
- `job_executions.error_message` カラムは `TEXT` で既に存在する

---

## 6. 環境変数
Reddit:
- `REDDIT_CLIENT_ID`
- `REDDIT_CLIENT_SECRET`
- `REDDIT_USER_AGENT`

Storage:
- `RAW_SNAPSHOT_BUCKET`
- `RAW_SNAPSHOT_ENDPOINT`
- `RAW_SNAPSHOT_REGION`
- `RAW_SNAPSHOT_FORCE_PATH_STYLE`

LLM:
- `OPENAI_BASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_ORGANIZATION` optional
- `OPENAI_PROJECT` optional

補足:
- `OPENAI_MODEL` は repo に固定値を持たず env 必須とする
- docs では pinned snapshot 利用を要求し、alias のみ指定は非推奨とする

現状の config との差分:
- 現在 `apps/worker/internal/config/config.go` は `DATABASE_DRIVER` / `DATABASE_DSN` / `PollInterval` / `ServiceName` のみを読み込む
- 上記 Reddit / Storage / LLM の env を新たに読み込むよう拡張が必要

---

## 7. 可観測性
最低方針:
- Reddit / LLM 呼び出し span を分ける
- `trace_id` を API / Worker / LLM で相関可能にする
- OpenAI には `X-Client-Request-Id=<trace_id or job-scoped id>` を付ける
- `x-request-id` と rate limit headers を記録する

ログ境界:
- Reddit fetch 前後
- raw snapshot 保存前後
- normalization 前後
- DB 保存前後
- LLM request / response 前後
- AI 保存前後

最低限残す項目:
- `trace_id`
- `job_id`
- `subreddit`
- `theme`
- `model_name`
- `prompt_version`
- `latency_ms`

現状との差分:
- 現在 `runner.execute()` は `trace_id` と `job_id` と `job_type` と `target_id` をログ出力している
- `subreddit` / `theme` / `model_name` / `prompt_version` / `latency_ms` は本処理実装時に追加する
- OTel tracer は `apps/worker/jobs` で初期化済み。外部呼び出し単位の span 追加は本処理側で行う

---

## 8. 外部制約と設計反映

### 8.1 Reddit
前提:
- OAuth access info を使う
- レート制限は Reddit 側裁量で変わりうる
- User Content を AI 学習用途へ使う場合は権利者許諾が必要
- Reddit からアクセス停止された場合、保存済み User Content と派生データの削除義務が発生しうる

設計反映:
- adapter を差し替え可能にして provider 固有依存を閉じ込める
- raw / normalized / derived の削除導線を runbook で別途整備する
- subreddit 正本を DB に置き、手動運用と停止対象の切り分けを容易にする

### 8.2 OpenAI 互換 LLM
前提:
- `Responses API` を使う
- `Structured Outputs` と schema validation を前提にする
- `x-request-id` と `X-Client-Request-Id` を追跡可能にする
- model は pinned snapshot + eval 前提で扱う

設計反映:
- parse は schema validation を通した後に保存する
- prompt / schema 変更時は `prompt_version` と eval 更新要否をセットで扱う

### 8.3 S3 / MinIO
前提:
- versioning を有効化する
- noncurrent lifecycle を併記する

設計反映:
- immutable object key を正本にし、bucket versioning は保険として併用する
- DB は最新参照だけを持ち、履歴正本は object storage に置く

---

## 9. フェーズ順

### Phase 1: 契約と保存責務の固定

目的: 本実装に必要な runtime 契約を全て固定し、後戻りを防ぐ。

成果物:
- [ ] `theme_subreddits` テーブルを追加する migration (`0002_theme_subreddits.up.sql`)
- [ ] `packages/schemas/ai/summary-output.schema.json` の新規作成
- [ ] `apps/worker/internal/ingestion/reddit_client.go` に `RedditClient` interface を定義
- [ ] `apps/worker/internal/snapshot/store.go` に `SnapshotStore` interface を定義
- [ ] `apps/worker/internal/summarization/summarizer.go` に `Summarizer` interface を定義
- [ ] `apps/worker/internal/config/config.go` に Reddit / S3 / LLM 向け env 読み込みを追加
- [ ] `prompt_version` 運用方針の確定 (初期値・変更トリガー・eval 要否)
- [ ] `packages/schemas/ai/` ディレクトリの新規作成

想定 interface 署名:
```go
// RedditClient — Reddit API へのアクセスを抽象化
type RedditClient interface {
    FetchThreads(ctx context.Context, subreddit string, limit int) ([]RawThread, error)
    FetchComments(ctx context.Context, subreddit, threadID string, limit int) ([]RawComment, error)
}

// SnapshotStore — raw snapshot の保存・取得を抽象化
type SnapshotStore interface {
    Save(ctx context.Context, key string, data []byte) error
}

// Summarizer — LLM による要約を抽象化
type Summarizer interface {
    Summarize(ctx context.Context, input SummarizeInput) (*SummarizeOutput, error)
}
```

完了条件:
- [ ] interface 定義がコンパイル可能な状態で存在する
- [ ] `theme_subreddits` migration が `make migrate` で適用できる
- [ ] `summary-output.schema.json` が JSON Schema として valid である
- [ ] worker config が新規 env を読み込める

### Phase 2: Reddit + snapshot

前提: Phase 1 完了

成果物:
- [ ] `apps/worker/internal/ingestion/reddit_client.go` の本実装 (OAuth token 取得含む)
- [ ] `apps/worker/internal/ingestion/reddit_client_test.go`
- [ ] `apps/worker/internal/snapshot/store.go` の S3/MinIO 実装
- [ ] `apps/worker/internal/snapshot/store_test.go`
- [ ] `apps/worker/internal/snapshot/key_builder.go`
- [ ] `apps/worker/internal/snapshot/key_builder_test.go`
- [ ] Compose に MinIO サービスを追加

完了条件:
- [ ] fake Reddit server に対する RedditClient の unit test が通る
- [ ] MinIO に対する SnapshotStore の integration test が通る
- [ ] key builder の unit test が通る

### Phase 3: normalize + persist

前提: Phase 2 完了

成果物:
- [ ] `apps/worker/internal/normalize/normalizer.go` — Reddit response → domain 型への変換
- [ ] `apps/worker/internal/normalize/normalizer_test.go`
- [ ] `source_threads` / `source_comments` の upsert 導線
- [ ] `raw_snapshot_s3_key` の最新参照更新
- [ ] `theme_subreddits` からの subreddit 群展開ロジック

完了条件:
- [ ] Reddit response の mapping に関する unit test が通る
- [ ] MySQL に対する upsert の integration test が通る
- [ ] 冪等な再実行が確認できる (同じ `source_type + source_thread_id` で二重登録されない)

### Phase 4: LLM + AI persist

前提: Phase 3 完了

成果物:
- [ ] `apps/worker/internal/summarization/summarizer.go` の OpenAI 実装
- [ ] `apps/worker/internal/summarization/summarizer_test.go`
- [ ] `apps/worker/internal/summarization/schema.go` — schema validation
- [ ] `ai_summaries` の履歴保存導線
- [ ] `.ai/skills/prompt-regression-check/SKILL.md` の整備

完了条件:
- [ ] fake OpenAI server に対する Summarizer の unit test が通る
- [ ] schema validation の unit test が通る
- [ ] LLM error mapping の unit test が通る

### Phase 5: Worker 結線と運用確認

前提: Phase 4 完了

成果物:
- [ ] `apps/worker/cmd/worker/main.go` の DI 組立 (Reddit / S3 / LLM クライアント注入)
- [ ] `apps/worker/internal/runner/runner.go` の本実装 (dummy 削除、job type 分岐)
- [ ] ingestion job の結線: `JOB_TYPE_INGEST` → Reddit fetch → snapshot → normalize → persist
- [ ] resummarization job の結線: `JOB_TYPE_RESUMMARIZE` → LLM summarize → AI persist
- [ ] `.ai/skills/reddit-ingestion-debug/SKILL.md` の整備
- [ ] docs / runbook / eval の更新

完了条件:
- [ ] Compose 上で `MySQL + MinIO + fake Reddit + fake OpenAI` の end-to-end 導線が通る
- [ ] ingestion job が `queued → running → completed` に遷移する
- [ ] 失敗時に `error_code` / `error_message` が `job_executions` に記録される
- [ ] Web の live read API で取り込んだ記事が表示される
- [ ] resummarization で既存 `ai_summaries` を消さずに新規行が追加される

---

## 10. テスト計画
docs 変更自体の確認:
- `docs/plans/backend-implementation-plan.md` が `Phase A` / `Phase E` 主体に整理されている
- 本 plan に scope、phase、failure taxonomy、env、observability、acceptance criteria、official source links がある

本接続実装時のテスト:
- Unit
  - Reddit response mapping
  - raw key builder
  - schema validation
  - LLM error mapping
- Integration
  - MySQL + MinIO + fake Reddit server + fake OpenAI server
- Worker flow
  - queued ingestion -> raw save -> normalize -> summary -> AI save -> completed
- Regression
  - prompt / schema 変更時の eval 更新
  - Web live read API の article detail 表示確認

既存テストとの関係:
- `apps/worker/internal/runner/runner_test.go` は fake `JobRepository` を使って claim → complete / fail を検証している。本実装後は fake `RedditClient` / `SnapshotStore` / `Summarizer` を使ったテストに拡張する。
- `internal/platform/jobs/jobs_test.go` は job repository のみを検証しており、本 plan の対象外。
- `apps/api/e2e/` は read API + admin REST の E2E であり、worker 本実装後は取り込んだデータが read API で返ることの回帰確認に使う。

---

## 11. 完了条件
- `theme_subreddits`、worker interfaces、AI schema の runtime 契約が明文化されている
- Reddit / snapshot / normalize / LLM / persist の実装順が固定されている
- 失敗分類、環境変数、可観測性、テスト戦略が決定済みである
- 既存の公開 read API と管理 REST を増やさずに本接続できる見通しが立っている
- 各 Phase の成果物と完了条件がコードベース上で確認できる

---

## 12. 参考ソース
- Reddit Data API Terms
  - https://redditinc.com/policies/data-api-terms
- Reddit API docs
  - https://www.reddit.com/dev/api/
- OpenAI Responses API reference
  - https://developers.openai.com/api/reference/resources/responses/methods/create
- OpenAI API overview / debugging requests
  - https://developers.openai.com/api/reference/overview#debugging-requests
- OpenAI Structured Outputs
  - https://openai.com/index/introducing-structured-outputs-in-the-api/
- AWS S3 Versioning
  - https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html

---

## 13. 実装メモ
- Reddit 本接続は public subreddit の server-side 取得から始める
- MVP では 1 theme に複数 subreddit を許容する
- 初期 seed は 1 theme 1 subreddit でもよい
- raw snapshot の履歴正本は object storage に置き、DB は最新参照を持つ

---

## 14. backend-implementation-plan との整合

本 plan は `docs/plans/backend-implementation-plan.md` の以下フェーズと連携する:
- **Phase B** (Worker を本実装へ差し替える準備) → 本 plan の Phase 1 が対応
- **Phase C** (外部連携の本接続) → 本 plan の Phase 2〜5 が対応
- **Phase D** (運用と可観測性の補強) → 本 plan の可観測性方針と並行して進める

本 plan 完了後は `backend-implementation-plan.md` 側の Phase B / C の TODO を checked に更新する。
