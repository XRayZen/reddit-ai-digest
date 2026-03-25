# Docker Compose ローカル動作環境導入プラン

## 1. この文書の目的
この文書は、`apps/web`、`apps/api`、`apps/worker`、MySQL、必要に応じて MinIO を Docker Compose で一括起動し、ローカルで Web と BE が疎通する開発・検証環境を導入するための計画書である。

今回の主眼は、次を同時に満たすことにある。

- migration を MySQL 専用として扱う
- ローカル、テスト、CI、本番で同じ SQL を使う
- Web も含めた主要導線をローカルで再現できる
- API / Worker の DB 依存テストを MySQL で確認できる
- 複数 worker 前提の job queue をローカルでも再現・検証できる

関連ドキュメント:
- `AGENTS.md`
- `README.md`
- `docs/product/mvp-scope.md`
- `docs/architecture/overview.md`
- `docs/architecture/api.md`
- `docs/architecture/data-model.md`
- `docs/architecture/observability.md`
- `docs/operations/local-development.md`
- `docs/plans/backend-implementation-plan.md`
- `infra/compose/README.md`
- `apps/web/README.md`
- `apps/api/README.md`
- `apps/worker/README.md`

---

## 2. 背景と基本方針
現状の backend 差分では、migration は MySQL 方言を使っている一方で、ローカル確認・テスト・CI が SQLite 前提になっている。

この状態の問題:
- migration が SQLite で通らず、Go テストが落ちる
- 本番で使う SQL と、ローカル/CI で検証している SQL が一致しない
- MySQL 依存の index、lock、transaction、`SELECT ... FOR UPDATE` 系の挙動を検証できない
- job queue を複数 worker 前提で安全に作る上で必要な DB 排他制御をローカルで再現しにくい

この計画の基本方針:
- DB は MySQL を唯一の正本として扱う
- migration は MySQL 専用 SQL に固定する
- ローカル開発は Docker Compose を正規導線にする
- Web も Compose に含め、`apps/web` から実 API に疎通できる状態を標準にする
- Go の DB 結合テストは MySQL に対して実行する
- CI も MySQL service container か Compose で同一 migration / seed / test を回す
- job queue は複数 worker を前提に、DB ロック込みで設計・検証する

---

## 3. この計画のゴール
この計画の達成ゴールは以下。

- `docker compose up --build` で `web`、`api`、`worker`、`mysql`、必要なら `minio` が起動する
- Web がローカルで実 API を読み、テーマ一覧、記事一覧、記事詳細、管理画面の最低限導線を確認できる
- `make migrate` と `make seed` が Compose / ローカル MySQL 前提で動く
- Go の DB 結合テストが SQLite ではなく MySQL で動く
- GitHub Actions でも MySQL を立ち上げ、同じ migration / seed / test を実行できる
- job queue の enqueue / claim が複数 worker 前提で破綻しない
- `docs/operations/local-development.md` と `infra/compose/README.md` が新導線へ更新されている

補足:
- 本番 IaC の正本は Terraform のままとする
- Compose はローカル開発・CI 検証の再現性を高めるための導線として整備する
- この計画では Reddit 本接続や LLM 本接続の完成までは要求しない

---

## 4. 先に固定する判断

### 4.1 DB 方針
- migration は MySQL 専用にする
- SQLite 互換 migration は持たない
- `internal/platform/database` の標準経路は MySQL 前提へ寄せる

### 4.2 ローカル起動方針
- ローカル確認の標準導線は Docker Compose に統一する
- `web` も Compose に含める
- 開発都合で `apps/web` 単体起動を残してよいが、標準確認導線は `web + api + worker + mysql` とする

### 4.3 Web と API の接続方針
- `apps/web` は server-side で `CONTENT_API_BASE_URL` を読む
- Compose 内の `web` からは `http://api:8080` を使う
- ブラウザに `api:8080` を直接見せる前提にはしない
- `NEXT_PUBLIC_*` で API 接続先をばらまかず、サーバー側 env に閉じる

理由:
- 現在の `apps/web/src/lib/api/live-content-api.ts` は `process.env.CONTENT_API_BASE_URL` をサーバー側で読む実装だから
- Next.js の runtime env を使えば、同じ web image を環境ごとに異なる接続先で再利用しやすいから

### 4.4 Compose 構成方針
- コアサービスは profile なしで常時起動対象にする
- 補助サービスだけ `profiles` で分ける
- 具体的には `mysql`、`api`、`worker`、`web` は常時対象とし、`minio`、`migration`、`seed`、`mysql-cli`、`adminer` などは profile 候補にする

### 4.5 job queue 方針
- 複数 worker 起動を許容する
- claim は DB ロックを使って原子的に行う
- enqueue は unique 制約前提で冪等に扱う
- `check-then-insert` のみではなく、競合時の再取得まで含めて成立させる

---

## 5. ローカル動作環境の目標構成

### 5.1 サービス一覧
- `mysql`
  - MySQL 8 系
  - named volume でデータ保持
  - healthcheck あり
- `api`
  - Go API サーバー
  - `mysql` の healthy 後に起動
  - Connect / 管理 REST を公開
- `worker`
  - Go worker
  - `mysql` の healthy 後に起動
  - 複数インスタンス起動を想定できる構成にする
- `web`
  - Next.js サーバー
  - `CONTENT_API_MODE=live`
  - `CONTENT_API_BASE_URL=http://api:8080`
  - `ADMIN_API_TOKEN` または `CONTENT_API_ADMIN_TOKEN` を注入する
- `minio`
  - raw snapshot 検証が必要になった時点で追加
  - 初期フェーズでは optional profile 扱いでもよい
- `migrate`
  - one-off 実行用
  - `docker compose run --rm migrate`
- `seed`
  - one-off 実行用
  - `docker compose run --rm seed`

### 5.2 ネットワークと公開ポート
- Compose 内部通信は service name で行う
- `web -> api` は `http://api:8080`
- `api -> mysql`、`worker -> mysql` は `mysql:3306`
- ホスト公開は最低限に絞る
  - `web:3000`
  - `api:8080`
  - `mysql:3306` は必要なときだけ公開するか、ローカル用に固定公開するかを決める

### 5.3 Web 疎通の設計メモ
- Web はブラウザから直接 API を叩く前提ではなく、Next.js サーバーが API と通信する
- このため Compose 内では `CONTENT_API_BASE_URL=http://api:8080` がそのまま使える
- ブラウザから見えるのは `web:3000` のみでよい
- 管理画面の REST も Web サーバー経由で取得する前提を維持できる

---

## 6. Web 検索で反映するベストプラクティス

### 6.1 Docker Compose の起動順
Docker Docs では、Compose は単に container start 順だけでなく、`depends_on` に `condition: service_healthy` を付けて依存先の health 完了を待つ構成を案内している。

この計画への反映:
- `api` と `worker` は `mysql` の health 完了を待って起動する
- `migrate` と `seed` も `mysql` healthy 依存にする
- `web` は `api` healthy 依存にするか、少なくとも `api` 起動後に開始する

### 6.2 Docker Compose profiles
Docker Docs では、profiles は optional service を同一 compose ファイルで切り替える用途に向いており、コアサービスは profile を付けずに常時有効とするのが推奨される。

この計画への反映:
- `web`、`api`、`worker`、`mysql` は core service とする
- `minio`、`adminer`、`mysql-cli`、`storybook`、`e2e-runner` は profile で切り分ける
- `docker compose up` の標準で主要フローが立ち上がる構成にする

### 6.3 GitHub Actions の service containers
GitHub Docs では、service container は Linux runner 前提で、runner 上で動く job から `localhost:<port>` で接続するか、container job なら同一 Docker network 上の service 名で接続できると案内している。

この計画への反映:
- backend CI は `ubuntu-latest` 上で MySQL service container を立てる
- workflow では MySQL port を host に publish し、`127.0.0.1:3306` または `localhost:3306` で接続する
- migration、seed、Go test をその MySQL に対して実行する

### 6.4 Next.js の self-hosting / Docker 運用
Next.js 公式 docs では、self-hosting 時は reverse proxy を推奨しつつ、server-side の runtime env を使えば同じ Docker image を複数環境へ昇格しやすいと案内している。また `NEXT_PUBLIC_*` は build 時に bundle へ埋め込まれるため、サーバー側 env と用途を分けるべきである。

この計画への反映:
- `CONTENT_API_BASE_URL` は server-side env のまま維持する
- Compose の `web` は build 後 image を runtime env で差し替え可能な設計にする
- ローカル段階では reverse proxy を必須にしない
- 将来 ECS / CloudFront / ALB 構成に乗せるときも、Web image を再利用しやすい形を維持する

### 6.5 MySQL official image の使い方
MySQL official image は `MYSQL_ROOT_PASSWORD` などの env による初期化を前提にしている。Compose の標準導線でもこの初期化方式に合わせる。

この計画への反映:
- `.env.example` に MySQL 初期化用 env を整理する
- 初回起動時の DB 作成と app user 作成方針を明文化する
- 永続 volume 利用時に env を変えても既存 DB は再初期化されない点を docs に書く

参照ソース:
- Docker Docs: startup order  
  `https://docs.docker.com/compose/how-tos/startup-order/`
- Docker Docs: profiles  
  `https://docs.docker.com/compose/how-tos/profiles/`
- GitHub Docs: service containers  
  `https://docs.github.com/en/actions/tutorials/using-containerized-services`
- GitHub Docs: communicating with service containers  
  `https://docs.github.com/en/actions/tutorials/use-containerized-services/use-docker-service-containers`
- Next.js Docs: self-hosting  
  `https://nextjs.org/docs/app/guides/self-hosting`
- Docker Hub: mysql official image  
  `https://hub.docker.com/_/mysql`

---

## 7. フェーズ別 TODO

### Phase 0: 前提整理
- [ ] DB 方針を MySQL 専用に固定する
- [ ] SQLite 前提のローカル手順を廃止する方針を合意する
- [ ] ローカル標準導線を `docker compose up --build` に固定する
- [ ] Web の API 接続先を `CONTENT_API_BASE_URL` で server-side 注入する方針を明文化する
- [ ] CI でも MySQL を使う方針を確定する
- [ ] job queue を複数 worker 前提で扱うことを docs に反映する

完了条件:
- DB とローカル環境の前提がぶれない
- SQLite を残すかどうかの曖昧さが消えている
- Web を含む Compose 標準導線が合意されている

### Phase 1: Compose 基本構成
- [ ] `infra/compose/docker-compose.yml` を作る
- [ ] `infra/compose/docker-compose.override.yml` を作る
- [ ] `infra/compose/.env.example` を作る
- [ ] `mysql` service を追加する
- [ ] `api` service を追加する
- [ ] `worker` service を追加する
- [ ] `web` service を追加する
- [ ] named volume を定義する
- [ ] core service に healthcheck / depends_on を入れる
- [ ] optional profile のひな形を入れる

設計メモ:
- service 名は責務が分かる名前にする
- コアサービスは profile なしにする
- one-off service は profile 付きか `docker compose run` 対象にする

完了条件:
- Compose 定義ファイルが存在する
- `docker compose config` が通る
- `mysql`、`api`、`worker`、`web` の依存順が定義されている

### Phase 2: コンテナ build / 実行導線
- [ ] `apps/api` 用 Dockerfile を用意する
- [ ] `apps/worker` 用 Dockerfile を用意する
- [ ] `apps/web` 用 Dockerfile を用意する
- [ ] root workspace 前提で build context を整理する
- [ ] proto 生成済みコードを build に含める方針を固定する
- [ ] 開発用 bind mount と production-like build の使い分けを決める
- [ ] hot reload が必要なら override 側へ寄せる

設計メモ:
- ベース image の固定タグを使う
- local dev と CI で極端に別の起動方法にしない
- `web` は同じ image に対して runtime env で接続先を差し替えられる構成を優先する

完了条件:
- 各サービスを container として起動できる
- `docker compose up --build` で Web を含む主要サービスが立ち上がる

### Phase 3: migration / seed の Compose 統合
- [ ] `migrate` service または `make migrate` から Compose 経由で migration を流せるようにする
- [ ] `seed` service または `make seed` から Compose 経由で seed を流せるようにする
- [ ] 初回起動手順を docs に反映する
- [ ] migration 後に seed を流す標準手順を決める
- [ ] DB volume 初期化手順を docs に書く

設計メモ:
- migration は API 起動前に明示実行する導線を持つ
- 起動時自動 migration は開発体験と事故リスクを見て判断する
- seed は idempotent に近い挙動へ寄せる

完了条件:
- `make migrate`
- `make seed`
- `docker compose run --rm migrate`
- `docker compose run --rm seed`
のいずれかが標準コマンドとして確立している

### Phase 4: Web を含むローカル疎通確認
- [ ] `CONTENT_API_MODE=live` で `web` を起動する
- [ ] `CONTENT_API_BASE_URL=http://api:8080` を Compose に設定する
- [ ] Web のテーマ一覧が実 API を読めることを確認する
- [ ] テーマ詳細が実 API を読めることを確認する
- [ ] 記事詳細が実 API を読めることを確認する
- [ ] 管理画面が管理 REST と疎通できることを確認する
- [ ] `trace_id` をログで追えることを確認する

設計メモ:
- ローカルでブラウザが触るのは `http://127.0.0.1:3000` の Web だけでよい
- API は Web から server-side に叩く
- CORS を増やす前に server-side fetch で済む導線を優先する

完了条件:
- `http://127.0.0.1:3000` で主要導線が開ける
- Web が実 API を読んでいることを確認できる
- API エラー時のログと画面の挙動を確認できる

### Phase 5: Go テストの MySQL 統一
- [ ] SQLite 前提の DB 結合テストを MySQL 前提へ切り替える
- [ ] テスト用 DB 作成・破棄方法を決める
- [ ] test ごとの isolation 方針を決める
- [ ] migration + seed をテストセットアップで流せるようにする
- [ ] 競合しやすい DB テストの直列 / 並列方針を決める

選択肢:
- test ごとに schema / database を分ける
- suite 単位で共通 DB を使い、truncate で戻す
- Compose で test 専用 mysql service を分ける

現時点の推奨:
- まずは CI とローカルで安定する単純構成を優先し、suite 単位の専用 database を作って migration を流す

完了条件:
- `go test ./...` が MySQL 前提で通る
- migration 方言差分でローカルだけ落ちる問題が消える

### Phase 6: CI の MySQL 対応
- [ ] GitHub Actions で MySQL service container を追加する
- [ ] health 完了待ちを入れる
- [ ] migration を MySQL に対して実行する
- [ ] seed を MySQL に対して実行する
- [ ] Go test を MySQL に対して実行する
- [ ] codegen / buf / migration / Go test の順序を整理する
- [ ] 必要なら compose-based CI 実行と service-container 実行を比較する

設計メモ:
- まずは GitHub Actions native な service container を第一候補にする
- ローカルとの差分が大きすぎる場合のみ Compose を CI に持ち込む
- CI では flaky 要因を減らすため、最小サービスに絞る

完了条件:
- backend CI が MySQL 前提で安定して通る
- SQLite 前提の暫定設定が消える

### Phase 7: job queue の複数 worker 対応
- [ ] `ClaimNextQueued` を DB ロック前提に見直す
- [ ] `SELECT ... FOR UPDATE` 系または同等の claim 実装へ変える
- [ ] `RowsAffected=0` を正常 claim 扱いしない
- [ ] enqueue の unique 制約違反時は既存 job を再取得して返す
- [ ] 並行 enqueue / 並行 claim のテストを追加する
- [ ] worker を複数起動して重複処理が起きないことを確認する

設計メモ:
- MySQL に合わせて排他制御を設計する
- SQLite では再現できなかった race をテストで拾う
- trace_id と job_id をログで相関できる状態を維持する

完了条件:
- 複数 worker 起動でも同じ queued job を二重処理しない
- idempotency key の競合で不正な 400/500 を返しにくくなっている

### Phase 8: docs / 運用導線更新
- [ ] `docs/operations/local-development.md` を MySQL + Compose 前提へ更新する
- [ ] `infra/compose/README.md` を実装内容に合わせて更新する
- [ ] `README.md` の backend 起動手順を更新する
- [ ] `apps/api/README.md` と `apps/worker/README.md` のローカル起動手順を見直す
- [ ] Web のローカル疎通確認手順を docs に追記する

完了条件:
- 新規メンバーが docs を読めばローカル動作環境を立てられる
- Web と BE の確認手順が 1 本化されている

---

## 8. 推奨するローカル確認コマンド

標準導線の想定:

```bash
cp infra/compose/.env.example infra/compose/.env
docker compose -f infra/compose/docker-compose.yml -f infra/compose/docker-compose.override.yml up -d --build mysql
docker compose -f infra/compose/docker-compose.yml -f infra/compose/docker-compose.override.yml run --rm migrate
docker compose -f infra/compose/docker-compose.yml -f infra/compose/docker-compose.override.yml run --rm seed
docker compose -f infra/compose/docker-compose.yml -f infra/compose/docker-compose.override.yml up -d web api worker
docker compose -f infra/compose/docker-compose.yml -f infra/compose/docker-compose.override.yml ps
docker compose -f infra/compose/docker-compose.yml -f infra/compose/docker-compose.override.yml logs -f api worker web
```

確認観点:
- `http://127.0.0.1:3000`
- `http://127.0.0.1:3000/themes/software-engineering`
- `http://127.0.0.1:3000/articles/se-001`
- `http://127.0.0.1:3000/admin`
- `http://127.0.0.1:8080/healthz`

---

## 9. CI の想定コマンド

想定順序:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm proto:lint
corepack pnpm proto:generate
git diff --exit-code
PATH="$HOME/.local/go/bin:$PATH" go run ./apps/api/cmd/migrate
PATH="$HOME/.local/go/bin:$PATH" go run ./apps/api/cmd/seed
PATH="$HOME/.local/go/bin:$PATH" go test ./...
```

環境変数例:

```bash
DATABASE_DRIVER=mysql
DATABASE_DSN=app:app@tcp(127.0.0.1:3306)/reddit_ai_digest?parseTime=true&multiStatements=true
```

---

## 10. リスクと対策

### 10.1 Compose 導線と CI 導線が乖離する
リスク:
- ローカルは Compose、CI は素の runner で、確認内容がずれる

対策:
- DB は両者とも MySQL に揃える
- migration / seed / Go test の実コマンドは同一に近づける

### 10.2 Web の接続先管理が崩れる
リスク:
- `NEXT_PUBLIC_*` と server-side env が混ざり、環境ごとに build し直しが必要になる

対策:
- `CONTENT_API_BASE_URL` は server-side env に固定する
- 公開 env に API の内部接続名を出さない

### 10.3 worker の重複実行
リスク:
- 複数 worker 起動時に同じ job を二重処理する

対策:
- MySQL 前提の排他制御へ実装を切り替える
- race を再現するテストを追加する

### 10.4 DB 初期化の混乱
リスク:
- volume が残っているのに env を変えても反映されず、ローカルで混乱する

対策:
- volume 削除手順を docs に書く
- `.env.example` と初回セットアップ手順を明文化する

---

## 11. 完了条件
この計画における完了条件は以下。

- Compose で `web`、`api`、`worker`、`mysql` が起動する
- Web が実 API と疎通できる
- migration と seed が MySQL に対して動く
- Go の DB 結合テストが MySQL に対して通る
- CI が MySQL 前提で動く
- job queue が複数 worker 前提で成立する
- docs 更新が反映されている
- セルフレビュー済みである

加えて、共通完了条件として以下を守る。

- 承認済みの計画に沿って実装されている
- 関連テストが通っている
- lint / format が通っている
- 影響のあるドキュメントが更新されている

---

## 12. 最初の着手順
最初に着手するなら、順序は以下が妥当である。

1. `infra/compose/docker-compose.yml`、`docker-compose.override.yml`、`.env.example` を作る
2. `mysql` + `migrate` + `seed` を Compose で動かす
3. `api` と `worker` を MySQL 接続で起動する
4. `web` を `CONTENT_API_MODE=live` + `CONTENT_API_BASE_URL=http://api:8080` で起動する
5. DB 結合テストを MySQL へ切り替える
6. CI を MySQL service container 対応にする
7. job queue の排他制御を修正する

最初の成功条件は、`docker compose up --build` 後に `http://127.0.0.1:3000` から実 API を読めることである。
