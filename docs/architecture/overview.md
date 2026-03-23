# アーキテクチャ概要

## 1. この文書の目的
この文書は、本プロジェクトの全体構成を短く把握するための概要資料です。  
詳細な実装ルールや運用手順は個別ドキュメントを参照してください。

関連ドキュメント:
- `docs/architecture/api.md`
- `docs/architecture/data-model.md`
- `docs/architecture/observability.md`
- `docs/product/mvp-scope.md`
- `docs/operations/local-development.md`

---

## 2. システムの目的
このサービスは、技術系 Reddit 議論を収集し、AI で翻訳・要約して、
テーマ別に読めるニュースサイト風 UI として提供することを目的とする。

対象テーマ:
- ソフトウェアエンジニアリング
- ローカル LLM
- 画像生成 AI
- AMD ROCm

---

## 3. 設計方針
本プロジェクトは以下の方針で設計する。

- モノレポでフロントエンド、バックエンド、ワーカー、IaC、ドキュメントを一元管理する
- API は gRPC を主軸とし、REST は管理者向け・補助用途に限定する
- Protocol Buffers を内部契約の正本とする
- 生データ、正規化データ、AI 生成データを分離して保持する
- AI プロバイダは OpenAI 互換 API を前提に抽象化する
- ログと監視は `trace_id` による相関追跡を前提とする
- MVP は最小限の収集・要約・表示パイプライン完成を優先する

補足:
- Web はブラウザ制約を踏まえ、gRPC-Web、Connect、Gateway、または BFF 経由で主データ取得を行う
- 外部 API の増加を防ぐため、公開・内部を問わず新規 API 追加時はまず proto 契約で表現できるかを検討する
- raw snapshot と AI 出力は再処理・監査・比較に使うため、再現性を損なう更新を避ける

---

## 4. 全体構成
システムは大きく以下で構成する。

- `apps/web`
  - Next.js による公開 UI / 管理 UI
- `apps/api`
  - Go による gRPC サーバー
  - 一部 REST エンドポイント
- `apps/worker`
  - Go による収集、要約、再試行ジョブ
- `packages/proto`
  - Protocol Buffers 定義
- `packages/schemas`
  - REST / AI 出力スキーマ
- `infra/compose`
  - ローカル Docker 開発環境
- `infra/terraform`
  - AWS インフラ定義
- `.ai/prompts`
  - 要約・翻訳・抽出用プロンプト資産
- `.ai/skills`
  - 作業別の運用・レビュー手順
- `.ai/evals`
  - プロンプトや要約品質の回帰確認資産

---

## 5. 主要なデータフロー
### 5.1 収集フロー
1. Worker が対象 subreddit を巡回する
2. スレッドとコメントを収集する
3. 生レスポンスをスナップショットとして保存する
4. 正規化データを DB に保存する
5. 要約ジョブを投入する

### 5.2 要約フロー
1. Worker が対象トピックを取得する
2. プロンプトを組み立てる
3. OpenAI 互換 API を呼び出す
4. 日本語翻訳・要約・論点抽出結果を保存する
5. UI から参照可能にする

### 5.3 表示フロー
1. Web が API 経由でテーマ一覧や記事一覧を取得する
2. gRPC を主経路としてデータ取得する
3. 管理系や補助的操作のみ REST を利用する
4. UI で記事詳細を表示する

### 5.4 管理フロー
1. 管理 UI または運用者が収集・再要約・再試行を指示する
2. API が入力を検証し、対象ジョブを登録または再実行する
3. Worker が実処理を行い、実行履歴と結果を保存する
4. 運用者はジョブ状態、失敗理由、再試行履歴を確認する

---

## 6. レイヤ構成
`apps/api` と `apps/worker` はレイヤードアーキテクチャを採用する。

- `domain`
  - エンティティ、値オブジェクト、インターフェース
- `usecase`
  - 業務フロー
- `adapter`
  - gRPC、REST、DB、Reddit、LLM、S3 など外部接続
- `infra`
  - 設定、ログ、トレース、Sentry など横断機能

制約:
- domain は adapter を import しない
- handler に業務ロジックを直接書かない
- provider 依存を usecase に埋め込まない
- 外部 API や SDK 固有の型を domain に持ち込まない
- ジョブ実行結果の永続化と通知は usecase から抽象インターフェース経由で扱う

---

## 7. API 方針
API は gRPC を主軸とする。

- 主処理
  - gRPC
- 管理者用や補助用途
  - REST

理由:
- 内部契約を proto で固定できる
- Go 実装との相性が良い
- 将来の内部サービス分割に備えやすい
- 型安全なコード生成を活用できる

補足:
- ブラウザ接続の都合で HTTP ベースの橋渡しが必要な場合でも、サービス契約の起点は proto とする
- 新規エンドポイント追加時は「管理用途か」「gRPC では扱いづらいか」を確認してから REST を選ぶ

詳細は `docs/architecture/api.md` を参照する。

---

## 8. データ保持方針
データは以下に分けて管理する。

- 生データ
  - Reddit から取得した raw snapshot
- 正規化データ
  - `source_threads`, `source_comments` など
- AI 生成データ
  - translation, summary, key points, stance など

重要ルール:
- 生データは破壊的に上書きしない
- AI 出力は再生成可能であること
- model 名、prompt_version、token usage を保持すること
- 要約対象に使った入力セットや生成時刻を追跡可能にすること
- 再収集や再要約時も過去結果を比較できる形で履歴を残すこと

---

## 9. 監視・運用方針
- CloudWatch Logs でログを集約する
- Sentry でエラーとトレースを確認する
- API、Worker、LLM 呼び出しを `trace_id` で相関させる
- 収集失敗、要約失敗、レート制限、再試行回数を監視対象に含める
- 障害調査は `.ai/skills/cloudwatch-log-search/SKILL.md` を参照する

運用上の観点:
- 管理操作は監査ログを残す
- 外部 API 制限や LLM 使用量はコスト監視対象に含める
- 障害時は raw snapshot と job 履歴から再実行可能であることを前提にする

---

## 10. MVP の範囲
MVP では以下を完成対象とする。

- テーマ一覧
- テーマ別トピック一覧
- 記事詳細
- Reddit 収集
- AI 翻訳・要約
- 管理者向け収集 / 再要約
- 基本的なジョブ履歴
- ローカル Docker 起動
- AWS への基本デプロイ

MVP では以下は後回しとする。

- ユーザーアカウント
- レコメンド
- ベクトル検索
- 高度なランキング
- 複雑なリアルタイム配信

---

## 11. 今後の拡張余地
- source adapter の追加
- topic clustering
- 複数 LLM provider の切り替え
- CockroachDB 検証
- gRPC サービス分割
- 管理画面の高度化
- 要約品質評価の自動化
- 配信ランキングやトレンド指標の導入

---

## 12. 非機能要件メモ
初期段階で意識する非機能要件を以下に整理する。

- 可観測性
  - API、Worker、外部 API 呼び出し、ジョブ実行を一連で追えること
- 再現性
  - 収集データ、プロンプト、モデル、出力を後から検証できること
- 変更容易性
  - source adapter、AI provider、配信経路を差し替えやすいこと
- 運用性
  - 手動再実行、失敗調査、ジョブ状態確認が管理 UI または運用 API で可能であること
