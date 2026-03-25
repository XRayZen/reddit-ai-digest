# apps/api バックエンド E2E 導入プラン

## Summary

- `apps/api` には usecase / repository / transport の個別テストはあるが、Compose 上で seed 済み MySQL と実 API をつないで確認する固定 E2E は未整備である。
- 今回は `apps/api/e2e` を追加し、`seed -> 各 EP 呼び出し -> レスポンス検証 -> DB 検証 -> cleanup` をテーブルドリブンで自動化する。
- E2E は read 系 Connect API と管理 REST の両方を対象にし、レスポンスだけでなく DB 内の実データとの整合も見る。
- ローカルでは `apps/api/scripts/check-all-local.sh` から Compose 起動、migrate、seed、API 起動、E2E 実行、cleanup までを一括で回せるようにする。

## Current State

- `infra/compose/docker-compose.yml` には `mysql`、`migrate`、`seed`、`api`、`worker` の導線がある。
- `apps/api/seeds/seed_data.sql` に read API 用の seed データがあり、テーマ、記事、要約、ジョブの初期状態を再現できる。
- `.github/workflows/ci-backend.yml` では proto lint、Go test、migration / seed 検証までは実施しているが、起動済み API を叩く E2E はない。
- `apps/api` には `scripts/check-all-local.sh` が存在せず、ローカルの一括確認は手順ベースになっている。

## Decision Notes

- E2E の配置は `apps/api/e2e` に固定する。
  - 理由: API 実装と近い位置に置いて、transport 追加時の追従を単純にするため。
- シナリオは責務ごとに分割する。
  - `config`: 接続先設定
  - `clients`: Connect / REST 呼び出し
  - `db_assertions`: DB スナップショット取得
  - `cleanup`: 後片付け
  - `*_scenarios_test.go`: テーブルドリブンのケース本体
- ローカル一括チェックでは `worker` を起動しない。
  - 理由: 管理 REST で enqueue したジョブが worker に消費されると、queued 状態の検証が不安定になるため。
- cleanup は 2 段で行う。
  - シナリオ内 cleanup: 管理 API で追加した `job_executions` を削除
  - スクリプト cleanup: `docker compose down -v` で DB volume を破棄

## Implementation Changes

### 1. apps/api/e2e の追加

- `apps/api/e2e` を追加する。
- Connect read API:
  - `ListThemes`
  - `GetTheme`
  - `ListArticles`
  - `GetArticle`
- 管理 REST:
  - `GET /api/admin/jobs`
  - `POST /api/admin/ingestions/run`
  - `POST /api/admin/summaries/rerun`
- 各ケースで API レスポンスを確認し、同じ内容を DB クエリでも確認する。

### 2. ローカル一括チェックの追加

- `apps/api/scripts/check-all-local.sh` を追加する。
- 実行順:
  - proto lint
  - gofmt check
  - Go test
  - Compose reset
  - MySQL 起動
  - migrate
  - seed
  - API 起動
  - `/healthz` wait
  - `go test ./apps/api/e2e/...`
  - Compose cleanup

### 3. npm / CI 接続

- root `package.json` に `test:e2e:api` を追加し、E2E パッケージを直接実行できるようにする。
- `ci-backend` では既存の mysql service を使って API を起動し、同じ `apps/api/e2e` を流す。

### 4. ドキュメント更新

- `apps/api/README.md`
  - `apps/api/e2e` の役割とローカル実行コマンドを追記する。
- `docs/operations/local-development.md`
  - バックエンドの一括チェックと E2E 導線を追記する。
- `apps/api/AGENTS.md`
  - 完了前に `apps/api/scripts/check-all-local.sh` を実行することを 1 行追加する。

## Test Plan

- `corepack pnpm test:go`
- `corepack pnpm test:e2e:api`
- `apps/api/scripts/check-all-local.sh`

## Acceptance Criteria

- `apps/api/e2e` にテーブルドリブンの E2E テスト群が追加されている。
- seed 済み Compose 環境で read API と管理 REST を自動検証できる。
- レスポンス検証だけでなく DB 検証と cleanup が含まれている。
- `apps/api/scripts/check-all-local.sh` でローカル一括チェックが回せる。
- `apps/api/AGENTS.md` と関連ドキュメントに導線が追記されている。
