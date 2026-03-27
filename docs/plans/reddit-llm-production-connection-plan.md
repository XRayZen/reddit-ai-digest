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

## 2. スコープ要約
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

## 3. 実装対象の 4 本柱

### 3.1 Reddit adapter
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

### 3.2 Raw snapshot
方針:
- raw snapshot は S3 / MinIO に保存する
- object key は immutable にし、再実行時も上書きしない
- bucket は versioning を前提にする
- lifecycle では noncurrent versions の整理方針を併記する
- `source_threads.raw_snapshot_s3_key` は最新成功 snapshot 参照として更新する

key 設計:
- source
- theme slug
- subreddit
- source thread id
- fetched at
- trace id または run id

保存責務:
- raw 保存成功後にのみ normalize を進める
- raw 保存失敗時は `snapshot_store_error` で job を失敗扱いにする

### 3.3 Summarization
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

### 3.4 Worker orchestration
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

---

## 4. 失敗分類
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

---

## 5. 環境変数
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

---

## 6. 可観測性
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

---

## 7. 外部制約と設計反映

### 7.1 Reddit
前提:
- OAuth access info を使う
- レート制限は Reddit 側裁量で変わりうる
- User Content を AI 学習用途へ使う場合は権利者許諾が必要
- Reddit からアクセス停止された場合、保存済み User Content と派生データの削除義務が発生しうる

設計反映:
- adapter を差し替え可能にして provider 固有依存を閉じ込める
- raw / normalized / derived の削除導線を runbook で別途整備する
- subreddit 正本を DB に置き、手動運用と停止対象の切り分けを容易にする

### 7.2 OpenAI 互換 LLM
前提:
- `Responses API` を使う
- `Structured Outputs` と schema validation を前提にする
- `x-request-id` と `X-Client-Request-Id` を追跡可能にする
- model は pinned snapshot + eval 前提で扱う

設計反映:
- parse は schema validation を通した後に保存する
- prompt / schema 変更時は `prompt_version` と eval 更新要否をセットで扱う

### 7.3 S3 / MinIO
前提:
- versioning を有効化する
- noncurrent lifecycle を併記する

設計反映:
- immutable object key を正本にし、bucket versioning は保険として併用する
- DB は最新参照だけを持ち、履歴正本は object storage に置く

---

## 8. フェーズ順

### Phase 1: 契約と保存責務の固定
- `theme_subreddits` を含む runtime 契約を固める
- `RedditClient` / `SnapshotStore` / `Summarizer` interface を定義する
- `summary-output.schema.json` と `prompt_version` 方針を確定する

### Phase 2: Reddit + snapshot
- Reddit adapter を実装する
- S3 / MinIO snapshot 保存を実装する
- raw 保存成功時のみ normalize を進める

### Phase 3: normalize + persist
- `source_threads` / `source_comments` 更新導線を実装する
- 冪等な upsert / 重複処理を固める
- `raw_snapshot_s3_key` の最新参照更新を実装する

### Phase 4: LLM + AI persist
- Responses API 呼び出しを実装する
- schema validation とエラー変換を実装する
- `ai_summaries` の履歴保存を実装する

### Phase 5: Worker 結線と運用確認
- ingestion / resummarization job を runner に結線する
- Compose 上で MySQL + MinIO + fake provider 導線を確認する
- runbook / eval / docs を更新する

---

## 9. テスト計画
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

---

## 10. 完了条件
- `theme_subreddits`、worker interfaces、AI schema の runtime 契約が明文化されている
- Reddit / snapshot / normalize / LLM / persist の実装順が固定されている
- 失敗分類、環境変数、可観測性、テスト戦略が決定済みである
- 既存の公開 read API と管理 REST を増やさずに本接続できる見通しが立っている

---

## 11. 参考ソース
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

## 12. 実装メモ
- Reddit 本接続は public subreddit の server-side 取得から始める
- MVP では 1 theme に複数 subreddit を許容する
- 初期 seed は 1 theme 1 subreddit でもよい
- raw snapshot の履歴正本は object storage に置き、DB は最新参照を持つ
