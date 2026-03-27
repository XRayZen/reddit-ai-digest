# apps/api バックエンド E2E 導入プラン

## Summary

- `apps/api/e2e` はすでに導入済みで、Compose または CI 上で起動した実 API と MySQL を相手に E2E を実行できる。
- 対象は read 系 Connect API 4 本と管理 REST 3 本で、レスポンス確認に加えて DB 整合性、`trace_id` 伝播、cleanup まで検証している。
- `apps/api/scripts/check-all-local.sh`、root `package.json`、`.github/workflows/ci-backend.yml` まで接続済みで、ローカルと CI の導線は成立している。
- 本文書は未着手計画ではなく、現状コードを確認したうえでの導入結果整理と残課題メモとして扱う。

## Validation Result

確認した実装:

- `apps/api/e2e`
  - `connect_scenarios_test.go`
  - `admin_scenarios_test.go`
  - `config.go`
  - `clients.go`
  - `db_assertions.go`
  - `cleanup.go`
  - `suite_test.go`
- `apps/api/scripts/check-all-local.sh`
- `apps/api/cmd/seed/main.go`
- `apps/api/internal/transport/http/admin_handler.go`
- `.github/workflows/ci-backend.yml`
- `package.json`
- `apps/api/README.md`
- `apps/api/AGENTS.md`
- `docs/operations/local-development.md`

確認結果:

- E2E 配置は `apps/api/e2e` に固定されている。
- `check-all-local.sh` は存在し、proto lint、gofmt check、Go test、Compose reset、migrate、seed、API 起動、health check、E2E、cleanup を一括実行する。
- root `package.json` には `test:e2e:api` が追加済みで、`go test -tags=e2e ./apps/api/e2e/...` を呼び出す。
- `ci-backend` は MySQL service container 上で migrate、seed、API 起動、E2E 実行まで行う。
- `apps/api/README.md` と `apps/api/AGENTS.md` には E2E / 一括チェック導線が反映済みである。

## Implemented Scope

### 1. apps/api/e2e

E2E は責務分割された構成で実装済みである。

- `config.go`
  - `API_E2E_*` と既存 `DATABASE_*` / `ADMIN_API_TOKEN` から接続先を解決する。
- `clients.go`
  - Connect client と管理 REST client をまとめる。
- `db_assertions.go`
  - DB 期待値を直接組み立て、API レスポンスとの整合を確認する。
- `cleanup.go`
  - 管理 REST E2E で追加した `job_executions` を `t.Cleanup` で削除する。
- `*_scenarios_test.go`
  - テーブルドリブンでシナリオを実行する。

### 2. Connect read API

実装済みシナリオ:

- `ListThemes`
  - seed データの並び順、件数、`next_page_token`、DB 上の説明文と件数を確認する。
- `GetTheme`
  - 指定テーマの詳細を DB スナップショットと照合する。
- `ListArticles`
  - `ai_summaries` の最新 `completed` レコードが一覧へ反映されることを確認する。
- `GetArticle`
  - 翻訳、要約、論点、stance、source site label を DB と照合する。

### 3. 管理 REST

実装済みシナリオ:

- `GET /api/admin/jobs`
  - seed ジョブが返ることと `trace_id` ヘッダー返却を確認する。
- `POST /api/admin/ingestions/run`
  - queued job のレスポンス、`trace_id`、`idempotency_key`、DB 永続化結果を確認する。
- `POST /api/admin/summaries/rerun`
  - 再要約 job でも同様に queued 状態と DB 永続化結果を確認する。

補足:

- ローカル一括チェックでは `worker` を起動しない。
- 理由は、queue 済み job を worker が消費すると queued 状態の E2E が不安定になるため。

## Verified Execution Paths

### 1. ローカル一括チェック

`apps/api/scripts/check-all-local.sh` は次の順で動作する。

- `corepack pnpm proto:lint`
- Go format check
- `corepack pnpm test:go`
- Compose `down -v`
- MySQL 起動
- migrate
- seed
- API 起動
- `/healthz` wait
- `go test -tags=e2e ./apps/api/e2e/...`
- DB cleanup と Compose cleanup

### 2. 単体 E2E 実行

root `package.json` から次を実行できる。

- `corepack pnpm test:e2e:api`

前提:

- API が `http://127.0.0.1:8080` で起動していること
- MySQL が `127.0.0.1:3306` で利用できること
- 必要に応じて `API_E2E_BASE_URL`、`API_E2E_DATABASE_DRIVER`、`API_E2E_DATABASE_DSN`、`API_E2E_ADMIN_TOKEN` で上書きできること

### 3. CI

`.github/workflows/ci-backend.yml` では次を実施している。

- Buf lint / breaking / codegen 差分確認
- `corepack pnpm test:go`
- MySQL service container に対する migration / seed
- `go run ./apps/api/cmd/api` で API 起動
- `corepack pnpm test:e2e:api`
- 後始末として API プロセス停止とログ出力

## Doc Consistency Check

現状の整合:

- `apps/api/README.md`
  - `apps/api/e2e` と `check-all-local.sh` の説明あり
- `apps/api/AGENTS.md`
  - 完了前に `apps/api/scripts/check-all-local.sh` を実行するルールあり
- `docs/operations/local-development.md`
  - バックエンド変更時は `apps/api/scripts/check-all-local.sh` を通す導線あり

今回の確認で判明した修正点:

- 旧計画文書に残っていた「`apps/api/e2e` は未作成」「`check-all-local.sh` は未存在」「CI 未接続」という記述は現状と不一致だった。
- seed データの配置は旧記述の `apps/api/seeds/seed_data.sql` ではなく、現在は `apps/api/sql/seeds/seed_data.sql` である。

## Remaining Gaps

今回の確認時点で、E2E 導線そのものの大きな未接続箇所は見当たらなかった。

残課題候補:

- seed データや DB 期待値の変更時に、E2E シナリオの期待が暗黙に崩れないようレビュー観点を維持する。
- 管理 REST の対象が増える場合は、レスポンス確認だけでなく DB 永続化と cleanup をセットで追加する。
- worker を含む非同期完了状態までを見る別系統の統合テストが必要なら、この queued 状態固定 E2E とは分けて設計する。

## Acceptance Criteria Status

- `apps/api/e2e` にテーブルドリブンの E2E テスト群が追加されている
  - 済み
- seed 済み MySQL と実 API を使って read API と管理 REST を自動検証できる
  - 済み
- レスポンス検証だけでなく DB 検証と cleanup が含まれている
  - 済み
- `apps/api/scripts/check-all-local.sh` でローカル一括チェックが回せる
  - 済み
- `package.json` と `ci-backend` から E2E を呼び出せる
  - 済み
- 関連ドキュメントに導線が反映されている
  - 済み

## Completion Record

- 完了日
  - 2026-03-26
- 完了判定
  - `apps/api/e2e`、ローカル一括チェック、CI 導線、関連ドキュメントがそろっており、当初の導入対象は実装済みと判断した。
- 対象範囲
  - Connect read API E2E
  - 管理 REST E2E
  - `check-all-local.sh`
  - `package.json` の `test:e2e:api`
  - `ci-backend` の API E2E 実行

## Verification Record

- 実施確認
  - `apps/api/e2e` 配下のシナリオ、設定、DB 検証、cleanup 実装を読んで確認した。
  - `apps/api/scripts/check-all-local.sh` の実行順と cleanup 方針を確認した。
  - `.github/workflows/ci-backend.yml` の E2E 実行導線を確認した。
  - `package.json` の `test:e2e:api` を確認した。
  - `apps/api/README.md`、`apps/api/AGENTS.md`、`docs/operations/local-development.md` の導線反映を確認した。
- 補足
  - 今回は文書整理が目的のため、追加のテスト実行は行っていない。

## Self Review

- 旧計画文書に残っていた未導入前提の記述を除去し、現状コードに一致する内容へ更新した。
- 完了済みプラン運用に合わせて、完了記録、検証記録、セルフレビュー記録を追記した。
- 旧パス参照は検索した範囲では見つからず、移動に伴う追加修正は不要と判断した。
