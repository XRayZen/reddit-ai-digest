# Docker Compose ローカルバックエンド計画・現状検証

## 1. この文書の目的
この文書は、`infra/compose` を中心にしたローカル backend 動作環境の計画を、2026-03-28 時点の実装に照らして更新したものである。

この文書で扱うこと:
- Compose ベースのローカル導線がどこまで実装済みか
- MySQL / migration / seed / Web 接続がどこまで揃っているか
- まだ未完了の項目がどこに残っているか

関連ドキュメント:
- `AGENTS.md`
- `README.md`
- `docs/product/mvp-scope.md`
- `docs/architecture/overview.md`
- `docs/operations/local-development.md`
- `infra/compose/README.md`
- `docs/plans/Complete/backend-api-e2e-plan.md`
- `docs/plans/backend-implementation-plan.md`

---

## 2. 今回の検証範囲
今回の更新では、以下をコードベースで確認した。

- `Makefile`
- `package.json`
- `infra/compose/docker-compose.yml`
- `infra/compose/docker-compose.override.yml`
- `infra/compose/.env.example`
- `infra/compose/README.md`
- `apps/api/scripts/check-all-local.sh`
- `apps/api/e2e/config.go`
- `apps/web/src/lib/api/live-content-api.ts`
- `apps/web/src/lib/api/resolve-content-api.ts`
- `.github/workflows/ci-backend.yml`
- `internal/platform/jobs/jobs.go`
- `internal/platform/jobs/jobs_test.go`
- `internal/platform/migrate/runner.go`
- `internal/platform/migrate/runner_test.go`（2026-03-28 追加確認）
- `internal/platform/database/database.go`（2026-03-28 追加確認）
- `internal/platform/traceutil/trace.go`（2026-03-28 追加確認）

補足:
- `make compose-config` は実行し、Compose 定義が解決できることを確認した
- Docker socket 制約のため、この環境では `docker compose up` の実起動までは実施できていない
- 代わりに `apps/api` と `apps/web` をローカル直接起動し、`CONTENT_API_MODE=live` で公開画面と管理画面の疎通を実測した

検証時の commit 範囲:
- 2026-03-26 以降の commit（`6ee5ac9` 〜 `b0cbed5`）を `git log` で確認した
- 最大の変更は `b0cbed5`（"Implement job management system with database integration"）である

---

## 3. 結論サマリ
現状は「Compose の土台と MySQL 前提の backend 導線は概ね実装済み」であり、`web` の live 読み取り導線と admin live 操作も実装済みである。2026-03-27 の commit `b0cbed5` で job management system が大きく前進し、`ClaimNextQueued` の transaction 化と並行 claim テストが追加された。一方で、「Compose 実起動の最終記録」と「Go テスト完全 MySQL 化」と「複数 worker 実起動検証」は未完了である。

ステータス要約:
- Phase 0: 完了
- Phase 1: 完了
- Phase 2: 完了
- Phase 3: 完了
- Phase 4: 概ね完了
- Phase 5: 未完了
- Phase 6: 概ね完了
- Phase 7: 一部完了（transaction 化と並行テスト追加で前進、MySQL ロック実証と複数 worker 実起動は残り）
- Phase 8: 一部完了

---

## 4. 実装済みと確認できた事項

### 4.1 DB 方針は MySQL を正本として揃っている
- `infra/compose/docker-compose.yml` の共通 env は `DATABASE_DRIVER=mysql`
- `DATABASE_DSN` は `mysql:3306` を向く
- `mysql` service は MySQL 8.4 を使う
- `.github/workflows/ci-backend.yml` も MySQL service container を使う
- `apps/api/e2e/config.go` の既定値も MySQL DSN である

### 4.2 Compose のコア構成は実装済み
- `mysql`、`api`、`worker`、`web` が profile なしで定義されている
- `migrate`、`seed` は one-off 前提で `tools` profile に切られている
- `minio` は `storage` profile で optional になっている
- `mysql-data` と `minio-data` の named volume がある

### 4.3 起動順と healthcheck は実装済み
- `api` と `worker` は `mysql` の `service_healthy` に依存する
- `web` は `api` の `service_healthy` に依存する
- `mysql`、`api`、`worker`、`web` に healthcheck がある
- `make compose-config` は成功し、定義解決できることを確認した

### 4.4 migration / seed 導線は Compose 経由で揃っている
- `Makefile` に `migrate` と `seed` がある
- どちらも `docker compose ... run --rm migrate|seed` を呼ぶ
- `infra/compose/.env.example` に MySQL 初期化用 env が整理されている
- `docs/operations/local-development.md` と `infra/compose/README.md` もこの導線を前提に更新済み

### 4.5 Web の API 接続は server-side env 前提で揃っている
- `apps/web/src/lib/api/live-content-api.ts` は `CONTENT_API_BASE_URL` を必須で読む
- `apps/web/src/lib/api/resolve-content-api.ts` は `live` と `mock` の切替境界を 1 箇所に寄せている
- Compose の `web` service は `CONTENT_API_MODE=live`
- Compose の `web` service は `CONTENT_API_BASE_URL=http://api:8080`
- `CONTENT_API_ADMIN_TOKEN` と `ADMIN_API_TOKEN` の両方を注入している
- admin live 操作は Next.js server action 経由で管理 REST を呼び、token と内部 URL を browser に出していない
- admin page は server 側で `jobs + themes + theme ごとの article 候補` を事前取得する

### 4.6 backend CI は MySQL 前提に切り替わっている
- `.github/workflows/ci-backend.yml` は MySQL 8.4 service container を定義している
- migration と seed は `DATABASE_DRIVER=mysql` / `127.0.0.1:3306` で実行している
- API E2E も MySQL DSN を使っている
- CI は SQLite service を前提にしていない

### 4.7 `apps/api/scripts/check-all-local.sh` は Docker 不可環境でも継続できる
- Docker Compose が使える環境では、従来どおり `mysql -> migrate -> seed -> api -> e2e` を実行する
- Docker が使えない環境では、sqlite の一時 DB とローカル API 起動へ fallback し、API E2E まで継続できる
- Compose / MySQL が正本である前提は維持しつつ、権限制約のある環境でも transport / usecase / persistence の回帰を止めない

### 4.8 `CONTENT_API_MODE=live` の実疎通はローカル直接起動で確認済み
Docker Compose の実起動はこの環境で行えなかったが、`apps/api` と `apps/web` をローカル直接起動し、以下を実測した。

- home が実 API を読める
- theme detail が実 API を読める
- article detail が実 API を読める
- admin でテーマ選択、記事選択、`収集実行`、`再要約実行`、一覧 refresh ができる
- API ログに `trace_id` が出る

確認メモ:
- queued job は `ingest` と `resummarize` の両方で追加された
- queued 状態確認のため、worker は起動していない

### 4.9 DB 接続の共通化モジュールが追加された（2026-03-28 確認）
- `internal/platform/database/database.go` が新設され、mysql / sqlite の接続切替を一元化している
- 各テストの `setupRepository` 等はこのモジュールを使って SQLite in-memory を開いている
- 正本である MySQL と fallback である SQLite の分岐が 1 箇所に集約されている

### 4.10 trace ID ヘルパーが追加された（2026-03-28 確認）
- `internal/platform/traceutil/trace.go` が新設され、`NewID`、`WithTraceID`、`FromContext`、`FromHeaderOrNew` を提供している
- API ログに出る `trace_id` の生成元として機能する

### 4.11 migration runner テストが追加された（2026-03-28 確認）
- `internal/platform/migrate/runner_test.go` が新設された
- MySQL DDL と SQLite DDL の両方で `schema_migrations` テーブルが正しく作れることを検証している
- SQLite テストで本番用 migration を直接適用し、方言差分の取りこぼしを防いでいる

---

## 5. 未完了または要再確認の事項

### 5.1 Compose 実起動の最終記録は未了
`CONTENT_API_MODE=live` の公開画面と管理画面の疎通自体は、ローカル直接起動で確認済みである。一方で、Docker Compose で `web -> api -> mysql` を同時起動した状態の最終記録は、この環境の Docker socket 制約で未了である。

未了の確認:

- `docker compose up` 相当での browser 手動確認記録
- Compose service 名経由の `CONTENT_API_BASE_URL=http://api:8080` を使った実測記録

このため Phase 4 は「機能疎通は確認済み、Compose 実起動の記録だけ残り」とする。

### 5.2 Go テストはまだ完全には MySQL 統一されていない
以下のコードが残っているため、Phase 5 は未完了と判断する。

- `internal/platform/jobs/jobs_test.go` は SQLite in-memory を使う
- `apps/api/internal/transport/http/admin_handler_test.go` は SQLite を使う
- `apps/api/internal/adapter/db/content_repository_test.go` は SQLite を使う
- `internal/platform/migrate/runner.go` は SQLite 用の `stripMySQLComments` 分岐を持つ
- `apps/api/cmd/seed/main.go` にも SQLite 互換の分岐が残っている

補足:
- CI の migration / seed / API E2E は MySQL 化されている
- ただし `corepack pnpm test:go` の全体は、依然として SQLite ベース unit test を含む

### 5.3 job queue の複数 worker 前提検証は前進したが未完了
2026-03-27 の commit `b0cbed5` で job management system が実装され、前進した。

確認できたこと:
- `internal/platform/jobs/jobs.go` で enqueue 時の idempotency 競合は既存 job 再取得に寄せている
- `ClaimNextQueued` は **transaction 内**で claim を行い、`RowsAffected == 0` を競合として最大 8 回リトライする
- `TestClaimNextQueuedOnlyClaimsJobOnce` で並行 claim のテストが追加された（2 goroutine で同時 claim → 1 件だけ成功、もう 1 件は `ErrNoQueuedJobs` を確認）
- `List`、`FindByIdempotencyKey`、`MarkCompleted`、`MarkFailed` も実装済み

未完了と判断した理由:
- `ClaimNextQueued` は `SELECT ... FOR UPDATE` を使っておらず、transaction 内の `First` + `Updates` の optimistic な排他に頼っている
- 並行テストは SQLite in-memory 上で実行されており、MySQL の InnoDB ロック挙動を直接検証していない
- `apps/api/scripts/check-all-local.sh` は worker を起動せず、queued 状態固定の E2E に寄せている
- 複数 worker コンテナを同時起動しての重複処理防止確認までは入っていない

Phase 7 を「一部完了」とする根拠:
- transaction 化と並行テストで単一 DB 接続での排他は検証された
- MySQL ロック実証と複数 worker 実起動検証が残る

### 5.4 ドキュメント更新は概ね完了
以下は今回の実装結果に合わせて更新済み、または現行導線と整合している。

- `docs/operations/local-development.md`
- `apps/web/README.md`
- `infra/compose/README.md`
- `.github/workflows/ci-backend.yml`
- `apps/api/scripts/check-all-local.sh`

一方で、Compose 実起動の最終確認記録だけは残っている。

- `README.md` に Compose 実起動結果の追記が必要かの最終判断
- 実起動記録を踏まえた最終 wording 調整

そのため Phase 8 は概ね完了とする。

---

## 6. フェーズ別の現状判定

### Phase 0: 前提整理
ステータス: 完了

根拠:
- MySQL 正本の前提が Compose / CI / E2E で揃っている
- Web の接続先が `CONTENT_API_BASE_URL` に寄っている

### Phase 1: Compose 基本構成
ステータス: 完了

根拠:
- `infra/compose/docker-compose.yml`
- `infra/compose/docker-compose.override.yml`
- `infra/compose/.env.example`
- コア service、profiles、healthcheck、volume が存在する

### Phase 2: コンテナ build / 実行導線
ステータス: 完了

根拠:
- `apps/api/Dockerfile`
- `apps/worker/Dockerfile`
- `apps/web/Dockerfile`
- root context を前提に Compose build される

### Phase 3: migration / seed の Compose 統合
ステータス: 完了

根拠:
- `make migrate`
- `make seed`
- `migrate` / `seed` one-off service
- volume 初期化手順が docs にある

### Phase 4: Web を含むローカル疎通確認
ステータス: 概ね完了

根拠:
- 接続設定は実装済み
- ローカル直接起動では browser 疎通を実測済み
- Compose 実起動の最終記録だけが未了

### Phase 5: Go テストの MySQL 統一
ステータス: 未完了

根拠:
- SQLite 前提の unit test と互換コードが残っている

### Phase 6: CI の MySQL 対応
ステータス: 概ね完了

根拠:
- backend CI は MySQL service container を使う
- migration / seed / API E2E まで MySQL 化されている

残件:
- `go test ./...` 自体はまだ SQLite ベース test を含むため、Phase 5 と連動して最終完了にする

### Phase 7: job queue の複数 worker 対応
ステータス: 一部完了

根拠:
- idempotency 再取得は実装済み
- `ClaimNextQueued` は transaction 内で claim し、`RowsAffected == 0` で競合リトライする
- 並行 claim テスト `TestClaimNextQueuedOnlyClaimsJobOnce` が SQLite 上で存在する
- ただし MySQL ロックベースの claim 実証と複数 worker 実起動実証が不足している

### Phase 8: docs / 運用導線更新
ステータス: 概ね完了

根拠:
- ローカル運用 docs と `apps/web/README.md` は更新済み
- Compose 実起動の最終記録を反映する微修正だけが残る

---

## 7. 現在の標準コマンド

### 7.1 Compose 標準導線
```bash
cp infra/compose/.env.example infra/compose/.env
make compose-config
make migrate
make seed
make up
make ps
make logs
```

補足:
- `make up` は `docker compose ... up --build` を呼ぶ
- `migrate` と `seed` は one-off service を使う

### 7.2 backend ローカル検証導線
```bash
./apps/api/scripts/check-all-local.sh
```

このスクリプトで確認すること:
- proto lint
- gofmt check
- Go test
- Compose での MySQL / migrate / seed / API 起動
- API E2E

制約:
- worker は起動しない
- job queue の queued 状態を固定した API / DB 一貫性確認に寄せている

### 7.3 backend CI 導線
```bash
corepack pnpm install --frozen-lockfile
corepack pnpm proto:lint
corepack pnpm proto:generate
git diff --exit-code
corepack pnpm test:go
corepack pnpm migrate:api
corepack pnpm seed:api
corepack pnpm test:e2e:api
```

環境前提:
- MySQL service container
- `DATABASE_DRIVER=mysql`
- `DATABASE_DSN=app:app@tcp(127.0.0.1:3306)/reddit_ai_digest?parseTime=true&multiStatements=true`

---

## 8. 未完了項目 TODO
未完了または要再確認の事項を、実作業用の TODO として整理する。

### 8.1 Web 実疎通確認
- [ ] `docker compose up` 相当で `web`、`api`、`mysql` を起動し、`http://127.0.0.1:3000` を表示確認する
- [x] ローカル直接起動でテーマ一覧が実 API を読めることを確認した
- [x] ローカル直接起動で記事一覧が実 API を読めることを確認した
- [x] ローカル直接起動で記事詳細が実 API を読めることを確認した
- [x] ローカル直接起動で管理画面からの実操作確認を行った
- [x] ローカル直接起動で `trace_id` を追えることを確認し、この文書へ反映した

対応する未完了判定:
- Phase 4: 概ね完了

### 8.2 Go テストの MySQL 統一方針
- [ ] `internal/platform/jobs/jobs_test.go` をどう扱うか決める
- [ ] `apps/api/internal/transport/http/admin_handler_test.go` をどう扱うか決める
- [ ] `apps/api/internal/adapter/db/content_repository_test.go` をどう扱うか決める
- [ ] `internal/platform/migrate/runner.go` の SQLite 互換分岐を残すか削るか決める
- [ ] `apps/api/cmd/seed/main.go` の SQLite 互換分岐を残すか削るか決める
- [ ] `corepack pnpm test:go` に SQLite 前提を残すか、MySQL ベースへ寄せるか方針を確定する

対応する未完了判定:
- Phase 5: 未完了
- Phase 6: 概ね完了だが Phase 5 と連動

### 8.3 job queue の複数 worker 検証
- [ ] `ClaimNextQueued` を MySQL ロック前提で再設計するか判断する
- [ ] 現方式を維持するなら、その根拠を文書かテストで補強する
- [ ] MySQL 前提の並行 claim テストを追加する
- [ ] MySQL 前提の並行 enqueue テストを追加する
- [ ] 複数 worker 実起動で job claim の重複防止を確認する検証を追加する
- [ ] `apps/api/scripts/check-all-local.sh` の守備範囲と、worker 実起動検証の分担を明確にする
- [x] `ClaimNextQueued` を transaction 内で実行し `RowsAffected == 0` で競合リトライする（b0cbed5）
- [x] 並行 claim テスト `TestClaimNextQueuedOnlyClaimsJobOnce` を追加する（b0cbed5）

対応する未完了判定:
- Phase 7: 一部完了

### 8.4 README / docs の最終整合
- [ ] `README.md` のローカル Compose 導線に Compose 実起動記録の追記が要るか最終確認する
- [x] `apps/api/README.md` のローカル導線が現実装と大きく矛盾しないことを確認した
- [x] `apps/worker/README.md` のローカル導線が現実装と大きく矛盾しないことを確認した
- [x] `apps/web/README.md`、`docs/operations/local-development.md`、`infra/compose/README.md` の分担を整理した

対応する未完了判定:
- Phase 8: 概ね完了

### 8.5 この文書自体の更新
- [ ] 上記 TODO を実施したら `3. 結論サマリ` のステータス要約を更新する
- [ ] `6. フェーズ別の現状判定` のステータスを更新する
- [ ] `9. この計画の完了条件` の未達補足を更新する

---

## 9. この計画の完了条件
この文書の観点で完了とみなす条件は以下である。

- Compose で `web`、`api`、`worker`、`mysql` が安定起動する
- Web が実 API を読めることを手動確認済みである
- migration / seed が MySQL に対して動く
- Go テストから SQLite 互換前提を外す方針が確定している
- job queue が複数 worker 前提で検証済みである
- 関連 docs と README 群が最新導線に揃っている

補足:
- 2026-03-28 時点では、このうち未達は「Compose 実起動の確認記録」「Go テストの MySQL 統一」「複数 worker 実起動検証」である
- Phase 7 は transaction 化と SQLite 並行テストで前進したが、MySQL ロック実証と複数 worker 実起動検証が残る
