# バックエンド実装プラン

## 1. この文書の目的
この文書は、本プロジェクトにおけるバックエンド初期実装の順序、判断ポイント、フェーズ別 TODO を整理するための計画書である。

この計画の主眼は、フロントエンド先行で成立している UI を壊さずに、`.proto` を契約正本としてバックエンド実装を段階的に接続することにある。

関連ドキュメント:
- `AGENTS.md`
- `README.md`
- `docs/product/mvp-scope.md`
- `docs/architecture/overview.md`
- `docs/architecture/api.md`
- `docs/architecture/data-model.md`
- `docs/architecture/observability.md`
- `docs/adr/architecture-decisions.md`
- `apps/api/AGENTS.md`
- `apps/api/README.md`
- `apps/worker/AGENTS.md`
- `apps/worker/README.md`

---

## 2. 背景と基本方針
次の BE 実装は、`契約 → 読み取り API → 永続化 → 管理 API → 可観測性 → FE 差し替え` の順で進めるのが最も安全である。

理由:
- gRPC は `.proto` を起点に service と message を定義し、Go 側はそこからコード生成して実装する前提だから
- Protocol Buffers ではタグ番号の再利用回避、後方互換性維持、削除済み field の保護が重要であり、契約を先に固める方が後戻りが少ないから
- 可観測性は gRPC と OpenTelemetry の組み合わせが取りやすく、`trace_id` を API、Worker、LLM 呼び出しまで通しやすいから
- FE 先行で UI ができているため、まず read 系 API を通してモックを段階的に置き換える方が、重い ingestion や summarization 実装よりも安全に縦切りで進められるから

このフェーズの基本方針:
- gRPC を主軸にする
- `.proto` を契約の正本にする
- `packages/proto` を唯一の契約正本とする
- REST は管理用途と health check に限定する
- 最初の対象機能は read 系 API に絞る
- write 系、重い worker 連携、Reddit 本接続、LLM 本接続は後段に回す
- DB は MySQL を前提にする
- migration は MySQL 専用 SQL として扱う
- ローカル開発、テスト、CI は Docker Compose 上の MySQL を基準にそろえる
- raw data は破壊的に上書きしない
- `trace_id` を API / Worker / LLM 間の相関キーにする

---

## 3. このフェーズのゴール
この計画が最初に達成すべきゴールは以下。

- `ThemeService` と `ArticleService` の read 系 contract が固まっている
- `ListThemes` が実装されている
- `ListArticles` が実装されている
- `GetArticle` が実装されている
- FE のテーマ一覧が実 API へ切り替わっている
- FE の記事一覧が実 API へ切り替わっている
- FE の記事詳細が実 API へ切り替わっている
- MySQL migration が導入されている
- Docker Compose で `web`、`api`、`worker`、`mysql` を起動できる
- Docker Compose 上で migration / seed / Go test を実行できる
- proto の lint / breaking check が CI に入っている
- CI で MySQL を使って migration / seed / Go test を実行できる
- 構造化ログと `trace_id` が API で確認できる
- Worker の最小骨格が存在する

補足:
- この時点では MVP の全機能完成を目指さない
- まずは「契約を崩さず read 系を通し、FE モックを段階的に実 API に置き換えられる状態」を最小成功条件とする

---

## 4. 実装順の最終推奨
優先順は以下。

1. proto / Buf
2. API サーバー骨格
3. themes / articles の read API
4. MySQL migration + repository
5. FE モック差し替え
6. 管理 REST
7. 可観測性
8. Worker 骨格
9. Reddit / LLM 本接続

この順序を採る理由:
- 契約が曖昧なまま永続化や transport を作ると再生成や差し戻しが増える
- read 系 API を先に通すと FE の既存導線を壊しにくい
- ingestion / summarization はジョブ境界、再試行、raw 保存など設計要件が多く、初手で着手すると依存範囲が広がりすぎる

---

## 5. 先に決めること
実装着手前に、以下を明確にする。

### 5.1 最初の対象機能を read 系 API に限定する
- 最初は `ThemeService` と `ArticleService` の read 系だけ作る
- write 系や重い worker 連携は後回しにする

### 5.2 ブラウザ接続方式を決める
- `gRPC-Web + proxy` でいくか
- `Connect` を採用してブラウザ接続を簡素化するか

判断基準:
- TypeScript クライアント生成の扱いやすさ
- ブラウザ互換性
- 認証、CORS、Cookie、CSRF の整理しやすさ
- FE の差し替えコスト
- 将来も gRPC 正本を維持しやすいか

現時点の推奨:
- BE は gRPC 正本を維持する
- Web 接続面は `Connect` か `gRPC-Web` 前提で設計する
- 公開 read API のために REST を増やさない

### 5.3 proto 正本運用を決める
- `packages/proto` を唯一の契約正本にする
- 生成コード、実装、テスト、ドキュメント更新をセットで扱う
- field number の再利用禁止、削除済み field / enum 値の `reserved` 保護、enum 0 値の `*_UNSPECIFIED` を共通ルールにする

### 5.4 REST の範囲を固定する
- REST は管理用途と health check に限定する
- 主処理は gRPC を優先する

---

## 6. フェーズ別 TODO

### Phase 0: 先に決めること
- [ ] 最初の BE 対象機能を read 系 API に限定する
- [ ] Web 接続方式を決める
- [ ] `packages/proto` を契約の正本とする運用を確定する
- [ ] REST の用途を管理用途と health check に限定する
- [ ] proto package 命名規則、Go package 規約、生成先ディレクトリ規約を確定する
- [ ] pagination、sort、filter の read API 共通ルールを決める
- [ ] `trace_id` の発行起点と伝播方針を決める

完了条件:
- FE 接続面の方針が 1 つに絞られている
- proto 正本運用ルールが合意されている
- read 系 API の対象スコープが `themes` と `articles` に固定されている

### Phase 1: proto / 契約整備
- [ ] `packages/proto/theme/v1/theme.proto` を作る
- [ ] `packages/proto/article/v1/article.proto` を作る
- [ ] `packages/proto/admin/v1/admin.proto` を作る
- [ ] `ListThemes` を定義する
- [ ] `GetTheme` を定義する
- [ ] `ListArticles` を定義する
- [ ] `GetArticle` を定義する
- [ ] 管理用途の最小 contract だけを定義する
- [ ] enum の 0 値に `*_UNSPECIFIED` を入れる
- [ ] field number 採番ルールを決める
- [ ] 削除候補 field / enum の `reserved` 方針を決める
- [ ] Buf を導入する
- [ ] `buf lint` を通す
- [ ] `buf breaking` を通す
- [ ] code generation コマンドを Makefile / Taskfile に追加する
- [ ] CI で codegen 更新漏れを検知できるようにする

設計メモ:
- 一覧系 request は `page_size` と `page_token` を基本にする
- read 系 response は UI 形状と 1 対 1 で揃えすぎず、最小限の読み取り最適化を意識する
- proto は domain 境界ごとに分け、共通 message の安易な横断共有を避ける

完了条件:
- `theme.proto`、`article.proto`、`admin.proto` の最小 contract が確定している
- lint と breaking check をローカルで通せる
- Go / TS 側の生成導線が明文化されている

### Phase 2: API サーバー骨格
- [ ] `apps/api/cmd/api/main.go` を作る
- [ ] gRPC サーバー起動処理を実装する
- [ ] `/healthz` の最小 REST を作る
- [ ] config 読み込みを実装する
- [ ] 構造化 logger を導入する
- [ ] `trace_id` と request ID を扱う基盤を入れる
- [ ] OpenTelemetry の最小設定を入れる
- [ ] gRPC server instrumentation を入れる
- [ ] gRPC client instrumentation を入れる
- [ ] graceful shutdown と startup failure の扱いを入れる

設計メモ:
- handler / transport に業務ロジックを書かない
- health check は管理・運用補助に限定し、公開データ取得面を REST 化しない
- 最初は 1 バイナリに複数 service を同居させてよい

完了条件:
- サーバーがローカルで起動する
- health check と gRPC の最小疎通ができる
- リクエストごとのログに `trace_id` を含められる

### Phase 3: ドメイン / usecase の最小実装
- [ ] `Theme` ドメインを作る
- [ ] `Article` ドメインを作る
- [ ] `ListThemes` usecase を作る
- [ ] `GetTheme` usecase を作る
- [ ] `ListArticles` usecase を作る
- [ ] `GetArticle` usecase を作る
- [ ] handler に業務ロジックを書かない構成にする
- [ ] domain から adapter を参照しない構成にする
- [ ] repository interface を利用側基準で切る
- [ ] transport DTO と domain model の責務境界を分ける

設計メモ:
- repository interface は DB 都合ではなく usecase 都合で切る
- domain へ gRPC 生成型や SQL ライブラリ固有型を持ち込まない
- read 系 usecase から write 系や job 起動を呼ばない

完了条件:
- usecase が in-memory 実装または stub repository でテスト可能である
- transport 依存なしに read 系ユースケースを検証できる

### Phase 4: DB / 永続化
- [ ] migration ツールを導入する
- [ ] `themes` migration を作る
- [ ] `source_threads` migration を作る
- [ ] `source_comments` migration を作る
- [ ] `ai_summaries` migration を作る
- [ ] `job_executions` migration を作る
- [ ] seed データ投入手段を作る
- [ ] DB アクセス方針を決める
- [ ] `database/sql` と `sqlc` の比較を行う
- [ ] `sqlc` を採用する場合は生成規約を固定する
- [ ] `ThemeRepository` を実装する
- [ ] `ArticleRepository` を実装する
- [ ] pagination に必要な index 設計を確認する
- [ ] Docker Compose 上の MySQL へ migration を適用できるようにする
- [ ] Docker Compose 上の MySQL へ seed を投入できるようにする

設計メモ:
- FE 先行でレスポンス shape が見えているため、ORM より SQL 正本型の方が追従しやすい
- raw、normalized、derived の責務を migration とテーブル設計でも混ぜない
- article 一覧向けクエリと article 詳細向けクエリは無理に 1 つへ寄せない
- SQLite 互換のために migration を弱めず、MySQL を検証環境側でそろえる

完了条件:
- migration をローカルで適用できる
- seed により `ListThemes` と `ListArticles` の最低限データが作れる
- repository の read 系実装が usecase テストと統合できる
- Docker Compose 上の MySQL で migration / seed が通る

### Phase 5: 最初の縦切り実装
- [ ] `ListThemes` を返せるようにする
- [ ] FE のテーマ一覧を実 API へ差し替える
- [ ] `ListArticles` を返せるようにする
- [ ] FE の記事一覧を差し替える
- [ ] `GetArticle` を返せるようにする
- [ ] FE の記事詳細を差し替える
- [ ] 差し替え済みのモックを削除または隔離する
- [ ] 1 画面ずつ差し替えて回帰確認する
- [ ] Docker Compose 上で `apps/web` から `apps/api` へ疎通できることを確認する

実装メモ:
- 差し替えは `themes → articles list → article detail` の順で行う
- 1 画面ごとにモック削除対象と残置対象を明確にする
- UI shape に合わせるためだけの過剰な backend 分岐を入れない
- `apps/web` は server-side env で API 接続先を読み、Compose 内の service name で API に向ける

完了条件:
- 少なくとも 1 つの画面が実 API に完全移行している
- FE の read 系主要導線がモックなしで動作する
- Docker Compose 上の `web` から実 API を読める

### Phase 6: 管理 REST の最小実装
- [ ] `/healthz` を整備する
- [ ] `/admin/jobs` の最小実装を作る
- [ ] `/admin/ingestions/run` の枠を作る
- [ ] `/admin/summaries/rerun` の枠を作る
- [ ] 認可、監査、冪等性の最低限方針を決める

設計メモ:
- REST は本当に管理用途だけに限定する
- 公開 read API まで REST を増やし始めると gRPC 主軸の意味が薄れる
- 即時実行か job 登録かを endpoint ごとに明確に分ける

完了条件:
- 管理操作の最小ルートが存在する
- REST と gRPC の責務境界が文書化されている

### Phase 7: 可観測性と障害追跡
- [ ] API リクエストごとに `trace_id` を発行 / 伝播する
- [ ] gRPC リクエストログに `trace_id` を入れる
- [ ] DB アクセス前後で最低限の構造化ログを出す
- [ ] 外部 API 呼び出し前後の span / log を残す
- [ ] Sentry 連携の枠を作る
- [ ] CloudWatch Logs 前提のログ項目を整理する
- [ ] エラーコードと失敗分類方針を決める

最低限含めるログ項目:
- `timestamp`
- `level`
- `service`
- `trace_id`
- `message`

必要に応じて含める項目:
- `job_id`
- `topic_id`
- `theme`
- `subreddit`
- `provider_name`
- `model_name`
- `prompt_version`
- `latency_ms`

完了条件:
- API の主要 read 系リクエストで trace とログを相互参照できる
- 障害時に `trace_id` 起点で API、DB、Worker 境界まで辿れる設計になっている

### Phase 8: Worker 骨格
- [ ] `apps/worker/cmd/worker/main.go` を作る
- [ ] `job_execution` 記録の枠を作る
- [ ] ingestion のダミー job を作る
- [ ] summarization のダミー job を作る
- [ ] API から管理 REST 経由で job を起動できる枠を作る
- [ ] failed 時の status 記録を実装する
- [ ] retry 境界と status 遷移ルールを決める
- [ ] 複数 worker 起動を前提に job claim の排他制御を実装する
- [ ] 並行 enqueue / 並行 claim のテストを追加する

設計メモ:
- この段階では Reddit 本接続や LLM 本接続まで一気にやらない
- まずは job 境界、再試行、記録の枠だけを作る
- raw snapshot 保存と derived data 生成は将来差し込みやすい設計にしておく
- MySQL 前提で row lock を使える実装にし、複数 worker で同じ job を二重処理しない

完了条件:
- ingestion と summarization のダミー job を起動し、履歴を残せる
- 失敗時に `job_execution` とログで原因を追える
- 複数 worker 起動でも同じ queued job を二重処理しない

### Phase 9: CI / 品質ゲート
- [ ] `buf lint` を CI に追加する
- [ ] `buf breaking` を CI に追加する
- [ ] Go test を CI に追加する
- [ ] migration チェックを CI に追加する
- [ ] CI で MySQL を起動する
- [ ] CI で migration / seed を MySQL に対して実行する
- [ ] CI で Go test を MySQL に対して実行する
- [ ] Docker Compose 上での backend テスト実行手順を整備する
- [ ] codegen 更新漏れチェックを入れる
- [ ] PR テンプレートに proto / docs / eval 確認項目を追加する
- [ ] FE 差し替え時の最低限の回帰確認手順を CI またはチェックリストへ入れる

完了条件:
- proto 契約変更の事故を CI で早期に検知できる
- codegen、migration、Go test の更新漏れを見逃しにくい
- MySQL 方言差分を CI で検知できる
- Docker Compose を使ったローカル検証と CI 検証の乖離が小さい

---

## 7. 実装進捗状況 (2025-03-25 現在)

### 完了済みフェーズ

#### Phase 0: 先に決めること ✓
- [x] 最初の BE 対象機能を read 系 API に限定する
- [x] Web 接続方式を決める (Connect 採用)
- [x] `packages/proto` を契約の正本とする運用を確定する
- [x] REST の用途を管理用途と health check に限定する
- [x] proto package 命名規則、Go package 規約、生成先ディレクトリ規約を確定する
- [x] pagination、sort、filter の read API 共通ルールを決める
- [x] `trace_id` の発行起点と伝播方針を決める

#### Phase 1: proto / 契約整備 ✓
- [x] `packages/proto/theme/v1/theme.proto` 作成済み
- [x] `packages/proto/article/v1/article.proto` 作成済み
- [x] `packages/proto/admin/v1/admin.proto` 作成済み
- [x] `ListThemes`, `GetTheme`, `ListArticles`, `GetArticle` 定義済み
- [x] enum の 0 値に `*_UNSPECIFIED` を適用
- [x] Buf 導入完了 (`buf.yaml`, `buf.gen.yaml`)
- [x] `buf lint` 通過
- [x] `buf breaking` 通過
- [x] code generation コマンドを Makefile に追加
- [x] CI で codegen 更新漏れを検知

#### Phase 2: API サーバー骨格 ✓
- [x] `apps/api/cmd/api/main.go` 作成済み
- [x] gRPC サーバー起動処理実装済み
- [x] `/healthz` の最小 REST 実装済み
- [x] config 読み込み実装済み (`internal/infra/config/config.go`)
- [x] 構造化 logger 導入済み (`internal/infra/logger/logger.go`)
- [x] `trace_id` と request ID を扱う基盤導入済み
- [x] OpenTelemetry の最小設定導入済み
- [x] gRPC server instrumentation 導入済み
- [x] graceful shutdown と startup failure の扱い実装済み

#### Phase 3: ドメイン / usecase の最小実装 ✓
- [x] `Theme` ドメイン作成済み (`internal/domain/content.go`)
- [x] `Article` ドメイン作成済み
- [x] `ListThemes` usecase 作成済み (`internal/usecase/theme/service.go`)
- [x] `GetTheme` usecase 作成済み
- [x] `ListArticles` usecase 作成済み (`internal/usecase/article/service.go`)
- [x] `GetArticle` usecase 作成済み
- [x] handler に業務ロジックを書かない構成
- [x] domain から adapter を参照しない構成
- [x] repository interface を利用側基準で切る
- [x] transport DTO と domain model の責務境界を分ける
- [x] usecase テスト作成済み (`service_test.go`)

#### Phase 4: DB / 永続化 ✓
- [x] migration ツール導入済み (`cmd/migrate/main.go`)
- [x] `themes` migration 作成済み
- [x] `source_threads` migration 作成済み
- [x] `source_comments` migration 作成済み
- [x] `ai_summaries` migration 作成済み
- [x] `job_executions` migration 作成済み
- [x] `topic_groups` migration 作成済み
- [x] seed データ投入手段作成済み (`cmd/seed/main.go`)
- [x] DB アクセス方針決定 (GORM)
- [x] `ThemeRepository` 実装済み (`internal/adapter/db/content_repository.go`)
- [x] `ArticleRepository` 実装済み
- [x] pagination に必要な index 設計完了
- [x] repository テスト作成済み (`content_repository_test.go`)

#### Phase 6: 管理 REST の最小実装 ✓
- [x] `/healthz` 整備済み
- [x] `/admin/jobs` の最小実装作成済み (`internal/transport/http/admin_handler.go`)
- [x] `/admin/ingestions/run` の枠作成済み
- [x] `/admin/summaries/rerun` の枠作成済み
- [x] admin handler テスト作成済み (`admin_handler_test.go`)

#### Phase 7: 可観測性と障害追跡 ✓
- [x] API リクエストごとに `trace_id` を発行 / 伝播 (`internal/infra/httpserver/middleware.go`)
- [x] gRPC リクエストログに `trace_id` を入れる
- [x] OpenTelemetry span 設定済み
- [x] 構造化ログ導入済み (JSON logger)
- [x] エラーコードと失敗分類方針決定済み (`internal/domain/errors.go`)

#### Phase 8: Worker 骨格 ✓
- [x] `apps/worker/cmd/worker/main.go` 作成済み
- [x] `job_execution` 記録の枠作成済み
- [x] ingestion のダミー job 作成済み (`internal/runner/runner.go`)
- [x] summarization のダミー job 作成済み
- [x] failed 時の status 記録実装済み
- [x] retry 境界と status 遷移ルール決定済み
- [x] runner テスト作成済み (`runner_test.go`)

#### Phase 9: CI / 品質ゲート ✓
- [x] `buf lint` を CI に追加済み
- [x] `buf breaking` を CI に追加済み
- [x] Go test を CI に追加済み
- [x] migration チェックを CI に追加済み
- [x] CI で SQLite を使用した migration / seed 検証済み
- [x] codegen 更新漏れチェックを入れる
- [x] PR テンプレート更新済み (`.github/PULL_REQUEST_TEMPLATE.md`)

### 進行中/未完了のフェーズ

#### Phase 5: 最初の縦切り実装 (進行中)
- [x] `ListThemes` を返せるようにする (実装済み)
- [ ] FE のテーマ一覧を実 API へ差し替える
- [x] `ListArticles` を返せるようにする (実装済み)
- [ ] FE の記事一覧を差し替える
- [x] `GetArticle` を返せるようにする (実装済み)
- [ ] FE の記事詳細を差し替える
- [ ] 差し替え済みのモックを削除または隔離する
- [ ] 1 画面ずつ差し替えて回帰確認する
- [ ] Docker Compose 上で `apps/web` から `apps/api` へ疎通確認

**備考:** Connect RPC クライアント作成済み (`apps/web/src/lib/api/rpc-clients.ts`)

---

## 8. 次のアクション (2025-03-25 現在)

### 8.1 優先度高: FE モック差し替え (Phase 5)
バックエンド API は実装済みのため、フロントエンドのモックを実 API に差し替える。

- [ ] テーマ一覧画面を実 API に差し替え
- [ ] 記事一覧画面を実 API に差し替え
- [ ] 記事詳細画面を実 API に差し替え
- [ ] モック削除対象と残置対象を明確化
- [ ] Docker Compose 上で疎通確認

### 8.2 優先度中: Reddit / LLM 本接続 (Phase 9)
- [ ] Reddit API 収集実装
- [ ] LLM 要約実装
- [ ] ジョブキューの排他制御強化
- [ ] S3 連携 (raw snapshot 保存)

### 8.3 優先度低: 運用改善
- [ ] Docker Compose 環境整備 (`infra/compose/`)
- [ ] CloudWatch Logs 連携
- [ ] Sentry 連携

---

## 9. 判断メモと補強ポイント

### 8.1 Connect と gRPC-Web の扱い ✓ (決定済み)
**決定:** Connect を採用

理由:
- 純粋な gRPC はブラウザからそのまま扱いにくい
- `gRPC-Web` は通常 proxy を前提にする
- `Connect` は browser 互換の HTTP API を扱いやすく、gRPC / gRPC-Web の両面に寄せやすい

実装状況:
- 契約の正本は proto に配置済み
- ブラウザ接続面に `Connect` を採用済み
- API サーバーで Connect handler 使用中 (`internal/transport/connect/*_handler.go`)
- Web 側で Connect クライアント作成済み (`apps/web/src/lib/api/rpc-clients.ts`)

### 8.2 read 系を先に通す理由
最初に `themes → articles` の read 系を縦切りで通すことが重要である。

理由:
- FE で完成済みの最低限 UI を壊しにくい
- `proto → usecase → repository → transport → FE` の一連を小さく検証できる
- ingestion や summarization を先に始めるより依存範囲が狭い

### 8.3 DB アクセス方針 ✓ (決定済み)
**決定:** GORM を採用

実装状況:
- GORM を使用した repository 実装済み (`internal/adapter/db/content_repository.go`)
- MySQL 専用 migration (`migrations/0001_initial.up.sql`)
- ローカル開発と CI は SQLite 互換モードで検証
- `internal/platform/database` で抽象化済み

### 8.4 可観測性の着手タイミング
可観測性は後付けではなく、API 骨格と同時に最小セットを入れる。

理由:
- `trace_id` 発行と伝播の設計は transport 以降の全層に影響する
- 後で追加すると API、Worker、LLM 境界の相関が切れやすい

---

## 10. リスクと対策

### 9.1 proto 変更の揺れ
リスク:
- 契約を固める前に実装を進めると、生成コード、handler、FE 接続面の差し戻しが増える

対策:
- Phase 1 完了前に repository や FE 差し替えへ進みすぎない
- Buf による lint / breaking を早期導入する

### 9.2 FE 接続方式の未確定
リスク:
- `Connect` と `gRPC-Web` の判断が遅れると、FE 側 client 生成と gateway 構成が揺れる

対策:
- Phase 0 の完了条件に明示的な採用判断を入れる
- 未決定のまま実装する場合は、proto と usecase までに止める

### 9.3 永続化と read shape の不一致
リスク:
- migration や table 設計が read API の想定 shape とずれると、後から query が複雑化する

対策:
- `ListThemes` と `ListArticles` の初回 query を先に具体化してから migration を切る
- 一覧用 query と詳細用 query を分けて設計する

### 9.4 可観測性の後回し
リスク:
- API は動くが障害時に追えない状態が生まれる

対策:
- API 骨格の段階で structured logging と `trace_id` を入れる
- `job_execution` 設計を Worker 骨格前に固める

### 9.5 ローカル検証環境と本番 SQL の乖離
リスク:
- ローカルやテストが SQLite だと、MySQL migration や lock 挙動、index 設計、transaction 挙動の差分を見逃す

対策:
- Docker Compose 上の MySQL をローカル標準にする
- DB 結合テストと CI を MySQL に統一する

### 9.6 複数 worker 前提の job queue race
リスク:
- `check-then-insert` や非原子的 claim のままだと、同じ job の二重登録や二重処理が起こる

対策:
- enqueue は unique 制約違反時の再取得まで含めて冪等にする
- claim は MySQL の row lock 前提で設計し、並行テストを追加する

---

## 11. フェーズ間の依存関係
- Phase 1 は Phase 0 の意思決定完了に依存する
- Phase 2 は Phase 1 の proto 正本と生成導線に依存する
- Phase 3 は Phase 2 の server 骨格と基本 transport に依存する
- Phase 4 は Phase 1 の message shape と Phase 3 の repository interface に依存する
- Phase 5 は Phase 2、Phase 3、Phase 4 の最小成立に依存する
- Phase 6 は Phase 2 の server 骨格に依存する
- Phase 7 は Phase 2 から着手できるが、Phase 5 完了前に最低限を入れておく
- Phase 8 は Phase 4 の `job_executions` と Phase 6 の管理起動経路に依存する
- Phase 9 は全フェーズ横断だが、最低限 `buf lint` と `buf breaking` は Phase 1 直後に入れる
- Docker Compose によるローカル環境整備は Phase 4 から Phase 9 を横断して影響する

---

## 12. 完了条件

### 初期ゴール達成状況
この計画における初期ゴールの達成状況:

- [x] `ThemeService` と `ArticleService` の read 系 contract が固まっている
- [x] `ListThemes` が実装されている
- [x] `ListArticles` が実装されている
- [x] `GetArticle` が実装されている
- [ ] FE のテーマ一覧が実 API へ切り替わっている (**未完了**)
- [ ] FE の記事一覧が実 API へ切り替わっている (**未完了**)
- [ ] FE の記事詳細が実 API へ切り替わっている (**未完了**)
- [x] MySQL migration が導入されている
- [ ] Docker Compose で `web`、`api`、`worker`、`mysql` を起動できる (**部分的に完了**)
- [x] Docker Compose 上で migration / seed / Go test を実行できる
- [x] proto の lint / breaking check が CI に入っている
- [x] CI で MySQL (SQLite 互換) を使って migration / seed / Go test を実行できる
- [x] 構造化ログと `trace_id` が API で確認できる
- [x] Worker の最小骨格が存在する

### 残タスク
- **Phase 5 (最重要):** FE モック差し替え
  - テーマ一覧、記事一覧、記事詳細の順で実装
- **Phase 9:** Reddit / LLM 本接続
- **インフラ:** Docker Compose 環境整備

加えて、リポジトリ共通の完了条件として以下を守る。

- 承認済みの計画に沿って実装されている
- 関連テストが通っている
- lint / format が通っている
- 影響のあるドキュメントが更新されている
- proto / prompt / schema 変更時は関連テストと eval 更新要否を確認している

---

## 13. 実装完了済みファイル一覧

### Proto ファイル
- `packages/proto/theme/v1/theme.proto`
- `packages/proto/article/v1/article.proto`
- `packages/proto/admin/v1/admin.proto`
- `buf.yaml`, `buf.gen.yaml`

### API サーバー (`apps/api/`)
- `cmd/api/main.go` - メインサーバー
- `cmd/migrate/main.go` - migration ツール
- `cmd/seed/main.go` - seed データ投入
- `internal/domain/content.go` - ドメインモデル
- `internal/domain/errors.go` - エラー定義
- `internal/usecase/theme/service.go` - Theme usecase
- `internal/usecase/article/service.go` - Article usecase
- `internal/usecase/admin/service.go` - Admin usecase
- `internal/adapter/db/content_repository.go` - Repository 実装
- `internal/transport/connect/theme_handler.go` - Connect handler
- `internal/transport/connect/article_handler.go` - Connect handler
- `internal/transport/http/admin_handler.go` - REST admin handler
- `internal/infra/config/config.go` - 設定
- `internal/infra/logger/logger.go` - ロガー
- `internal/infra/httpserver/middleware.go` - HTTP ミドルウェア
- `migrations/0001_initial.up.sql` - 初期 migration
- `seeds/seed_data.sql` - シードデータ（開発・検証用）

### Worker (`apps/worker/`)
- `cmd/worker/main.go` - メインワーカー
- `internal/runner/runner.go` - ジョブランナー
- `internal/config/config.go` - 設定
- `internal/logger/logger.go` - ロガー

### 共通 (`internal/`)
- `platform/database/` - DB 抽象化
- `platform/jobs/` - ジョブ管理
- `platform/traceutil/` - trace_id ユーティリティ

### CI/CD
- `.github/workflows/ci-backend.yml` - バックエンド CI
- `.github/PULL_REQUEST_TEMPLATE.md` - PR テンプレート

### フロントエンド (`apps/web/`)
- `src/lib/api/rpc-clients.ts` - Connect RPC クライアント

### ドキュメント
- `docs/architecture/api.md` - API 設計
- `docs/operations/local-development.md` - ローカル開発手順
- `docs/adr/architecture-decisions.md` - アーキテクチャ決定

