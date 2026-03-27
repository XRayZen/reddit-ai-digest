# apps/api

## 目的
このディレクトリは、Go による
gRPC 主体の API サーバーと
一部 REST エンドポイントを実装する層です。

この層の責務:
- gRPC サービスの公開
- 管理用途の一部 REST 提供
- usecase 呼び出し
- 認証、認可、入力変換
- レスポンス整形
- API 側の可観測性

詳細ルール:
- `./AGENTS.md`
- `../../docs/development/coding-rules-common.md`
- `../../docs/development/coding-rules-backend.md`
- `../../docs/development/code-review-checklist.md`
- `../../.ai/skills/proto-schema-review/SKILL.md`

---

## 基本方針
- `.proto` を契約の正本として扱う
- 主処理は gRPC を優先する
- REST は管理用途や補助用途に限定する
- handler に業務ロジックを書かない
- domain から adapter を参照しない
- `trace_id` と構造化ログを前提にする

---

## 想定ディレクトリ
- `cmd/api/`
  - エントリーポイント
- `e2e/`
  - Compose 起動済み API を叩く E2E シナリオ
- `internal/domain/`
  - エンティティ、値オブジェクト、interface
- `internal/usecase/`
  - 業務フロー
- `internal/adapter/`
  - gRPC、REST、DB、外部 API
- `internal/infra/`
  - config、logger、trace、sentry
- `migrations/`
  - DB migration

---

## このディレクトリでよく触るファイル
- `cmd/api/main.go`
- `internal/adapter/grpc/`
- `internal/adapter/http/`
- `internal/usecase/`
- `internal/domain/`
- `migrations/`

---

## 作業前に確認すること
- API 方針は `../../docs/architecture/api.md`
- データモデルは `../../docs/architecture/data-model.md`
- 可観測性は `../../docs/architecture/observability.md`
- 重要判断は `../../docs/adr/architecture-decisions.md`

---

## 実装ルール要約
- 実装前に短い計画を提示する
- 承認後に着手する
- 可能な限りテストファーストで進める
- proto 変更時は生成コード、実装、テスト、docs を更新する
- context を適切に伝播する
- エラーを握りつぶさない
- 実装後はセルフレビューを行う

---

## 完了条件
- Go テストが通る
- proto 変更時は生成コード更新済み
- lint / format が通る
- `trace_id` とログ文脈が確認できる
- 必要な docs 更新がある
- セルフレビュー済みである

---

## ローカル起動

標準導線は root の Compose です。

```bash
cp infra/compose/.env.example infra/compose/.env
make migrate
docker compose -f infra/compose/docker-compose.yml -f infra/compose/docker-compose.override.yml --env-file infra/compose/.env up -d api
```

補足:
- `DATABASE_DRIVER` は `mysql` を標準とする
- `DATABASE_DSN` は Compose 内では `mysql:3306` を向く
- health check は `http://127.0.0.1:8080/healthz` で確認できる

## ローカルチェック

バックエンドの一括チェックは次で実行する。

```bash
./apps/api/scripts/check-all-local.sh
```

補足:
- スクリプトは proto lint、Go test、Compose 上の migrate / seed / API 起動、`apps/api/e2e` 実行までをまとめて行う
- E2E の管理ジョブ検証を安定させるため、ローカル一括チェックでは `worker` は起動しない
