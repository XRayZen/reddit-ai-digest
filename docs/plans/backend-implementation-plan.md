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
- `docs/plans/reddit-llm-production-connection-plan.md`

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
- Web 側の mock は削除前提にせず、環境変数で `mock/live` を切り替えられる運用を維持する
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
- まずは「契約を崩さず read 系を通し、環境変数で `mock/live` を切り替えながら実 API を使える状態」を最小成功条件とする

---

## 4. 実装順の最終推奨
優先順は以下。

1. proto / Buf
2. API サーバー骨格
3. themes / articles の read API
4. MySQL migration + repository
5. Web の `mock/live` 切り替え導線整備
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

このセクションでは、完了済みの初期実装を前提に、今後の作業だけを追える形で TODO を再整理する。

整理方針:
- フェーズごとに「何を成立させるか」を先に明示する
- TODO は未完了項目だけに絞る
- 現状と完了条件を併記し、進捗メモとの往復を減らす
- Section 8 では同じ TODO を繰り返さず、直近の着手順だけをまとめる

補足:
- この計画の直近実装対象は `Phase A` と `Phase E` を主とする
- Reddit / LLM / S3 の本接続は [`docs/plans/reddit-llm-production-connection-plan.md`](/home/kojima/ドキュメント/reddit-ai-digest/docs/plans/reddit-llm-production-connection-plan.md) で別管理する

### Phase A: Web の `mock/live` 切り替え導線整備
目的:
- 既に実装済みの read 系 Connect API を、`apps/web` で環境変数により `mock/live` 切替可能な状態で常用できるようにする

現状:
- read 系 Connect API と Web 側の live 接続導線は既に存在する
- admin の live 操作は未整備だったが、今回の実装で server action 経由に統一した
- 主要導線の安定化、`mock/live` の役割整理、live 回帰手順の固定を今回の完了対象とする

次にやること:
- [x] `apps/web` の主要画面と取得経路を整理し、live admin を `ContentApi` 境界に追加した
- [x] `CONTENT_API_MODE=live` で home が安定動作するようにした
- [x] `CONTENT_API_MODE=live` で theme detail が安定動作するようにした
- [x] `CONTENT_API_MODE=live` で article detail が安定動作するようにした
- [x] `CONTENT_API_MODE=live` で admin が安定動作するようにした
- [x] `CONTENT_API_MODE=mock` でも既存の開発導線が維持されることを確認した
- [x] mock を残す前提で、切り替えルールと用途を明文化した
- [x] Compose 上で `web -> api` の疎通確認手順を固定した
- [x] live 切り替え時の最低限の回帰確認手順を docs / checklist に残した

実装メモ:
- 差し替え順は `themes -> articles list -> article detail` を維持する
- `apps/web` は server-side env で API 接続先を読む
- mock は Storybook、ローカル UI 開発、障害切り分け用途として残す
- UI shape に合わせるためだけの backend 分岐は増やさない
- admin の live POST は Next.js server action から管理 REST を呼び、内部 API URL と admin token を browser に出さない
- admin page は server 側で `jobs + themes + theme ごとの article 候補` を取得し、client 側には選択 UI と状態遷移だけを持たせる

完了条件:
- 公開 read 系主要導線と admin が `CONTENT_API_MODE=live` で通る
- `CONTENT_API_MODE=mock` と `CONTENT_API_MODE=live` の使い分けが文書化されている
- Compose 上で `web` から実 API を読む手順が固定されている

### Phase B: Worker を本実装へ差し替える準備
目的:
- 既にある job 実行基盤を、Reddit 収集と要約の本処理に差し替えられる状態にする

現状:
- worker の claim / complete / fail と idempotency の土台はある
- 一方で、本処理に必要な job 契約、責務境界、失敗分類がまだ固まっていない

次にやること:
- [ ] ingestion job の入出力契約を決める
- [ ] summarization job の入出力契約を決める
- [ ] `job_executions` と raw / normalized / derived データ更新の責務境界を明文化する
- [ ] ダミー job から本実装へ差し替える順序を決める
- [ ] ジョブ失敗分類と再試行方針を決める
- [ ] worker 実行ログに必要な項目を整理する

実装メモ:
- 既存の idempotency、claim、status 更新を壊さずに差し替える
- 収集と要約を 1 つの巨大 job にせず、境界を明確に保つ
- raw snapshot 保存と AI 出力保存は更新責務を混ぜない

完了条件:
- ingestion / summarization の job 契約と状態遷移が文書化されている
- ダミー実装を外しても既存の job 管理と整合する見通しが立っている

### Phase C: 外部連携の本接続
目的:
- Reddit 収集、LLM 要約、raw snapshot 保存を実装し、MVP の backend パイプラインを前進させる
- 詳細計画は [`docs/plans/reddit-llm-production-connection-plan.md`](/home/kojima/ドキュメント/reddit-ai-digest/docs/plans/reddit-llm-production-connection-plan.md) で別管理する

現状:
- Reddit / LLM / S3 の本接続は未着手である
- 先に Phase B で job 境界と保存責務を固めてから着手する

次にやること:
- [ ] 別 plan の scope / phase / 失敗分類 / env / observability を確定する
- [ ] `Phase B` の job 契約と責務境界を、別 plan で使う runtime 契約へ接続する
- [ ] 外部本接続の実装順を `Reddit -> snapshot -> normalize -> LLM -> persist` で固定する
- [ ] 本接続時のテスト戦略を unit / integration / e2e / eval に分けて別 plan へ反映する

実装メモ:
- raw データは破壊的に上書きしない
- `prompt_version`、`model_name`、token usage を追える形を維持する
- provider 固有型を domain に持ち込まない
- 公開 read API と管理 REST の runtime 契約は増やさない

完了条件:
- 別 plan に Reddit / LLM / snapshot 本接続の decision-complete な実装方針が整理されている
- 本計画との依存関係が `Phase B` / `Phase D` / `Phase E` の観点で矛盾なく接続されている

### Phase D: 運用と可観測性の補強
目的:
- 既存の `trace_id` と構造化ログを、本番運用で調査可能な粒度まで引き上げる

現状:
- API / worker の最小ログと `trace_id` 基盤はある
- まだ CloudWatch / Sentry / 失敗分類を前提にした運用設計までは揃っていない

次にやること:
- [ ] CloudWatch を前提にしたログ項目を整理する
- [ ] 外部 API 呼び出し前後の span / log を揃える
- [ ] worker 側の障害追跡導線を明文化する
- [ ] Sentry 連携を入れる
- [ ] エラーコードと失敗分類を API / worker / job で揃える

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
- `trace_id` 起点で API、DB、worker、外部呼び出しを追える
- 失敗時の一次調査手順が迷わない

### Phase E: ローカル導線と CI の整合
目的:
- 既にある backend CI とローカル検証導線のズレを減らし、再現性を上げる

現状:
- Compose、migration / seed、backend CI の土台は揃っている
- Web live 回帰の docs 固定と自動チェックの分担整理が今回の対象である
- SQLite 由来の差分や複数 worker 検証は今回の対象外として別タスクに残す

次にやること:
- [x] `check-all-local.sh` と CI の検証項目差分を洗い出した
- [x] Compose 前提の backend 検証手順を docs に一本化した
- [x] Web の `mock/live` 切り替え後の回帰確認を script と manual checklist に分担した
- [x] proto / codegen / migration / e2e の更新漏れを見つけやすい説明にした

実装メモ:
- CI に既にあるものを TODO へ重複計上しない
- 追加するのは「不足している検証」か「分かりづらい導線の整理」に限る
- `apps/web/scripts/check-all-local.sh` は mock 前提の UI 回帰に固定する
- `apps/api/scripts/check-all-local.sh` は MySQL / migration / seed / 実 API E2E に固定する
- live ブラウザ疎通は `web + api + mysql` を起動する手動 checklist で担保し、queued 状態確認のため `worker` は起動しない

完了条件:
- ローカルと CI の期待値が大きくずれない
- backend 変更時の確認手順が 1 本の導線として説明できる

---

## 7. 実装進捗状況 (2026-03-26 現在)

このセクションは計画ではなく、現状コードを確認したうえでの進捗メモである。

### 完了済み

#### Phase 0: 先に決めること
- [x] 最初の BE 対象機能を read 系 API に限定した
- [x] Web 接続方式として `Connect` を採用した
- [x] `packages/proto` を契約の正本とする運用が入っている
- [x] REST を管理用途と health check に限定している
- [x] read 系の pagination は `page_size` と `page_token` ベースで統一している
- [x] `trace_id` の発行と伝播の基盤が入っている

#### Phase 1: proto / 契約整備
- [x] [`packages/proto/theme/v1/theme.proto`](/home/kojima/ドキュメント/reddit-ai-digest/packages/proto/theme/v1/theme.proto)
- [x] [`packages/proto/article/v1/article.proto`](/home/kojima/ドキュメント/reddit-ai-digest/packages/proto/article/v1/article.proto)
- [x] [`packages/proto/admin/v1/admin.proto`](/home/kojima/ドキュメント/reddit-ai-digest/packages/proto/admin/v1/admin.proto)
- [x] `ListThemes` / `GetTheme` / `ListArticles` / `GetArticle` が定義済み
- [x] enum の 0 値に `*_UNSPECIFIED` を採用済み
- [x] Buf 導線が入っている (`buf.yaml`, `buf.gen.yaml`, `Makefile`, `package.json`)
- [x] Go / TS の生成コードがコミットされている

#### Phase 2: API サーバー骨格
- [x] [`apps/api/cmd/api/main.go`](/home/kojima/ドキュメント/reddit-ai-digest/apps/api/cmd/api/main.go) が存在する
- [x] Connect handler と `/healthz` を同一 HTTP サーバーに載せている
- [x] config / logger / graceful shutdown が入っている
- [x] `TraceMiddleware` により `trace_id` をレスポンスヘッダーとログへ載せている
- [x] OpenTelemetry の最小設定が入っている

#### Phase 3: ドメイン / usecase の最小実装
- [x] [`apps/api/internal/domain/content.go`](/home/kojima/ドキュメント/reddit-ai-digest/apps/api/internal/domain/content.go)
- [x] [`apps/api/internal/usecase/theme/service.go`](/home/kojima/ドキュメント/reddit-ai-digest/apps/api/internal/usecase/theme/service.go)
- [x] [`apps/api/internal/usecase/article/service.go`](/home/kojima/ドキュメント/reddit-ai-digest/apps/api/internal/usecase/article/service.go)
- [x] [`apps/api/internal/usecase/admin/service.go`](/home/kojima/ドキュメント/reddit-ai-digest/apps/api/internal/usecase/admin/service.go)
- [x] handler に業務ロジックを寄せない構成になっている
- [x] usecase の unit test がある

#### Phase 4: DB / 永続化
- [x] 初期 migration がある: [`apps/api/sql/migrations/0001_initial.up.sql`](/home/kojima/ドキュメント/reddit-ai-digest/apps/api/sql/migrations/0001_initial.up.sql)
- [x] seed 導線がある: [`apps/api/cmd/seed/main.go`](/home/kojima/ドキュメント/reddit-ai-digest/apps/api/cmd/seed/main.go)
- [x] `themes` / `source_threads` / `source_comments` / `topic_groups` / `ai_summaries` / `job_executions` が定義済み
- [x] GORM ベースの read repository がある
- [x] repository test がある

#### Phase 6: 管理 REST の最小実装
- [x] [`apps/api/internal/transport/http/admin_handler.go`](/home/kojima/ドキュメント/reddit-ai-digest/apps/api/internal/transport/http/admin_handler.go)
- [x] `/api/admin/jobs`
- [x] `/api/admin/ingestions/run`
- [x] `/api/admin/summaries/rerun`
- [x] `X-Admin-Token` による最小認証がある

#### Phase 7: 可観測性と障害追跡
- [x] [`apps/api/internal/infra/httpserver/middleware.go`](/home/kojima/ドキュメント/reddit-ai-digest/apps/api/internal/infra/httpserver/middleware.go) で `trace_id` を発行・伝播
- [x] API と DB repository で `trace_id` を含む構造化ログを出している
- [x] API / worker の両方で OTel tracer provider を初期化している

#### Phase 8: Worker 骨格
- [x] [`apps/worker/cmd/worker/main.go`](/home/kojima/ドキュメント/reddit-ai-digest/apps/worker/cmd/worker/main.go)
- [x] [`apps/worker/internal/runner/runner.go`](/home/kojima/ドキュメント/reddit-ai-digest/apps/worker/internal/runner/runner.go)
- [x] queued job の claim / completed / failed 更新が実装されている
- [x] idempotency key と queued claim の基本テストがある
- [x] 実行本体はまだ dummy job のまま

#### Phase 9: CI / 品質ゲート
- [x] [`.github/workflows/ci-backend.yml`](/home/kojima/ドキュメント/reddit-ai-digest/.github/workflows/ci-backend.yml)
- [x] `buf lint`
- [x] PR 時の `buf breaking`
- [x] proto 再生成と生成差分チェック
- [x] `go test ./...`
- [x] MySQL を使った migration / seed 検証
- [x] 実 API を起動して `apps/api/e2e` を流す backend CI がある
- [x] PR テンプレートに proto / docs / eval チェックがある

### 進行中

#### Phase 5: Web の `mock/live` 切り替え導線整備
- [x] read 系 Connect API は実装済み
- [x] Web 側には live 接続導線がある
  [`apps/web/src/lib/api/rpc-clients.ts`](/home/kojima/ドキュメント/reddit-ai-digest/apps/web/src/lib/api/rpc-clients.ts)
  [`apps/web/src/lib/api/live-content-api.ts`](/home/kojima/ドキュメント/reddit-ai-digest/apps/web/src/lib/api/live-content-api.ts)
- [x] live admin 操作を `ContentApi` 境界と server action 経由で追加した
- [x] admin page が server 側で `jobs + themes + article 候補` を事前取得するようになった
- [x] `CONTENT_API_MODE=mock` / `live` の使い分けを文書化した
- [x] mock を残したまま `live` 導線の常用条件を整理した
- [x] home / theme detail / article detail / admin の live 動作をローカル起動で確認した
- [x] Compose 前提の手順を docs に固定した

#### Phase E: ローカル導線と CI の整合
- [x] `apps/web/scripts/check-all-local.sh` の役割を mock UI 回帰に固定した
- [x] `apps/api/scripts/check-all-local.sh` の役割を API / DB 一貫性確認に固定した
- [x] Docker 不可環境でも `apps/api/scripts/check-all-local.sh` が sqlite fallback で API E2E まで継続できるようにした
- [x] live ブラウザ疎通は manual checklist に分担する方針を docs へ反映した
- [x] `worker` を止めたまま queued 状態を確認する手順を docs へ反映した
- [x] Web / API / docs の導線説明を更新した

### 未着手または骨格のみ

- [ ] Reddit 本接続
- [ ] LLM 本接続
- [ ] raw snapshot の S3 保存
- [ ] Sentry 連携
- [ ] CloudWatch Logs 前提の本番運用整備
- [ ] worker の実ジョブ実装

---

## 8. 次のアクション (2026-03-26 現在)

このセクションでは、Section 6 の TODO を直近の着手順に圧縮して示す。

### 8.1 優先度高
- Phase B を進め、dummy worker を本実装へ差し替えるための job 契約と責務境界を確定する

### 8.2 優先度中
- Phase D の前提として、失敗分類とログ項目の統一方針を固める
- Compose 実起動の最終確認は Docker が使える環境で manual checklist を再実施して記録する

### 8.3 優先度低
- [`docs/plans/reddit-llm-production-connection-plan.md`](/home/kojima/ドキュメント/reddit-ai-digest/docs/plans/reddit-llm-production-connection-plan.md) を起点に、Phase C の本接続へ着手する

---

## 9. 判断メモと補強ポイント

### 9.1 Connect 採用は維持でよい
現状コードは API 側で Connect handler、Web 側で Connect client を使用しており、read 系導線はこの方針で一貫している。公開 read API のために REST を増やす理由は今のところない。

### 9.2 read 系は「実装済み」、課題は「デフォルト切り替え」
`ThemeService` / `ArticleService` と E2E は揃っている。残っているのは API 実装ではなく、Web の `mock/live` 切替運用の整理と Compose 導線の固定化である。

### 9.3 DB アクセス方針は GORM で進んでいる
当初の比較検討項目は残っているが、現実装は GORM repository に寄っている。今後この計画書で DB 方針を書く場合は、「検討中」ではなく「GORM 採用済み。ただし将来の置換余地は別途判断」に修正して扱う。

### 9.4 worker は骨格を超え始めているが、本処理はまだない
`job_executions` の enqueue、idempotency、claim、status 更新までは入っている。一方で Reddit / LLM / S3 は未接続なので、「worker 未着手」ではなく「実行基盤あり、本処理未実装」と表現するのが正確である。

### 9.5 外部本接続は別 plan で扱う
Reddit / LLM / S3 は API の read 系と比べて、外部規約、認証、snapshot 保持、prompt / eval、運用制約まで含めた意思決定が多い。`Phase C` を本計画に残したまま詳細化すると焦点がぼやけるため、詳細は [`docs/plans/reddit-llm-production-connection-plan.md`](/home/kojima/ドキュメント/reddit-ai-digest/docs/plans/reddit-llm-production-connection-plan.md) に分離して扱う。

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
- [x] FE のテーマ一覧が `mock/live` 切替可能な状態で実 API 確認できている
- [x] FE の記事一覧が `mock/live` 切替可能な状態で実 API 確認できている
- [x] FE の記事詳細が `mock/live` 切替可能な状態で実 API 確認できている
- [x] FE の管理画面が `mock/live` 切替可能な状態で実 API 確認できている
- [x] MySQL migration が導入されている
- [ ] Docker Compose で `web`、`api`、`worker`、`mysql` を起動できる (**手順は固定済みだが、この実装ターンでは Docker socket 制約により実測未了**)
- [x] Docker Compose 上で migration / seed / Go test を実行できる
- [x] proto の lint / breaking check が CI に入っている
- [x] CI で MySQL を使って migration / seed / API E2E を実行できる
- [x] 構造化ログと `trace_id` が API で確認できる
- [x] Worker の最小骨格が存在する

### 残タスク
- **Phase B / D:** job 契約、可観測性の整備
- **Compose 実測:** Docker が使える環境で `web + api + worker + mysql` の manual checklist を再実施し、確認記録を残す
- **別 plan 管理:** [`docs/plans/reddit-llm-production-connection-plan.md`](/home/kojima/ドキュメント/reddit-ai-digest/docs/plans/reddit-llm-production-connection-plan.md) に基づく Reddit / LLM / snapshot 本接続
- **インフラ / worker:** 複数 worker 前提の queue 検証と本処理実装

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
- `sql/migrations/0001_initial.up.sql` - 初期 migration
- `sql/seeds/seed_data.sql` - シードデータ（開発・検証用）

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
- `apps/web/README.md` - `mock/live` 運用と live 手動確認 checklist
