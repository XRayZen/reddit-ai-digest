# infra/compose

## 目的
このディレクトリは、本プロジェクトの
ローカル開発用 Docker Compose 構成を管理する場所です。

対象:
- Web
- API
- Worker
- MySQL
- MinIO
- 必要に応じた補助サービス

関連ドキュメント:
- `../../AGENTS.md`
- `../../docs/operations/local-development.md`
- `../../docs/architecture/overview.md`
- `../../apps/web/README.md`
- `../../apps/api/README.md`
- `../../apps/worker/README.md`

---

## 基本方針
- ローカルでは Docker Compose で主要サービスを一括起動する
- MVP の主要フローをローカルで再現できることを重視する
- Compose 定義はローカル開発用途に絞る
- 本番構成の正本は Terraform 側とし、Compose は開発効率を優先する
- 必要に応じて複数 Compose ファイルを重ねて使えるようにする

---

## このディレクトリで管理するもの
- `docker-compose.yml`
  - 基本構成
- `docker-compose.override.yml`
  - ローカル上書き設定
- `.env.example`
  - 環境変数サンプル
- 補助的な compose ファイル
  - 必要なら追加

---

## 想定する起動対象
- `web`
  - Next.js フロントエンド
- `api`
  - Go gRPC サーバー / 一部 REST
- `worker`
  - 収集 / 要約 / 再試行
- `mysql`
  - MVP 用 DB
- `minio`
  - raw snapshot 保存用の S3 互換ストレージ

必要に応じて追加:
- migration 実行用コンテナ
- test 用コンテナ
- proto 生成用コンテナ

---

## 基本コマンド
例:

```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.override.yml --env-file .env up -d --build mysql
docker compose -f docker-compose.yml -f docker-compose.override.yml --env-file .env run --rm migrate
docker compose -f docker-compose.yml -f docker-compose.override.yml --env-file .env run --rm seed
docker compose -f docker-compose.yml -f docker-compose.override.yml --env-file .env up -d web api worker
docker compose -f docker-compose.yml -f docker-compose.override.yml --env-file .env logs -f api worker web
docker compose -f docker-compose.yml -f docker-compose.override.yml --env-file .env ps
```

複数ファイルを使う場合の例:

`docker-compose.yml` は Compose の正規導線、`docker-compose.override.yml` はローカル固有の bind mount を置くための上書きファイルです。

---

## 使い方の方針
- まず基本構成で全体を起動する
- ローカル固有設定は override 側へ寄せる
- サービス追加時は、依存関係と責務を明確にする
- 永続化が必要なものは volume を明示する
- 開発の都合で追加した設定を本番前提と混同しない

---

## 設計ルール
- 1サービス1責務を基本とする
- 役割の違うプロセスを1コンテナに無理に詰め込まない
- サービス名は責務が分かる名前にする
- 環境変数は `.env.example` に整理する
- 秘匿情報を compose ファイルへ直書きしない
- ローカルで必要な port のみ公開する
- `web` は browser から直接 `api` に向けず、server-side env の `CONTENT_API_BASE_URL` で接続する
- `mysql`、`api`、`worker`、`web` は core service として profile なしで起動する
- `minio` は `storage` profile、`migrate` と `seed` は one-off service として扱う

---

## よくある変更
- 新しい開発用サービスの追加
- 環境変数の追加
- volume の追加
- healthcheck の追加
- worker の起動条件調整
- ローカルデバッグ用の上書き設定追加
- MySQL volume の初期化

初期化例:

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml --env-file .env down -v
```

---

## やってはいけないこと
- 本番用 IaC の代わりに Compose を正本として扱うこと
- 秘匿情報をコミットすること
- 責務の異なる複数プロセスを無秩序に1コンテナへ詰め込むこと
- 開発都合の設定を本番前提として設計に混ぜること

---

## 完了条件
- ローカルで主要サービスが起動する
- MVP の主要フローが再現できる
- 必要な環境変数が整理されている
- docs 更新が反映されている
- セルフレビュー済みである
