# API 設計

## 1. この文書の目的
この文書は、本プロジェクトにおける API 設計方針を整理するための資料である。  
本プロジェクトでは gRPC を主軸とし、REST は管理者向けや補助用途に限定する。

関連ドキュメント:
- `docs/architecture/overview.md`
- `docs/architecture/data-model.md`
- `docs/product/mvp-scope.md`

---

## 2. 基本方針
API 設計の基本方針は以下のとおり。

- 内部契約は Protocol Buffers を正本とする
- gRPC を主たるアプリケーション API とする
- REST は管理者向け操作や補助用途に限定する
- proto 変更時はコード生成、実装、テスト、文書を合わせて更新する
- 後方互換性を意識して message と service を設計する

補足:
- Web からの利用経路が HTTP ベースであっても、契約の起点は proto とする
- 単純に実装しやすいという理由だけで REST を増やさない
- 管理系 REST は認可、監査、冪等性を前提に設計する

---

## 3. gRPC を主軸にする理由
### 3.1 契約を明確にできる
`.proto` を正本とすることで、サービス定義とメッセージ定義を一元管理できる。

### 3.2 型安全なコード生成を活用できる
Go 実装との相性が良く、クライアント・サーバー双方のコード生成が可能である。

### 3.3 将来の内部サービス分割に備えやすい
API / Worker / 将来の各内部サービス間連携を gRPC ベースで揃えやすい。

### 3.4 パフォーマンスと運用面の相性が良い
内部 API として高効率であり、トレーシングやヘルスチェックとの相性も良い。

### 3.5 API 変更管理に向いている
フィールド追加、deprecated 管理、生成コード更新の手順を通じて、変更影響を比較的明確に扱える。

---

## 4. REST を使う範囲
REST は以下に限定する。

- 管理画面からの実行操作
- 補助的な health check
- 簡易な運用 API
- 外部連携上 gRPC を直接使いにくいケース

主処理の原則:
- 公開記事取得ロジック
- 要約関連ロジック
- 内部ジョブ制御
- 将来の内部サービス連携

これらは gRPC を優先する。

REST を許容する判断例:
- ブラウザや運用ツールから単純な POST/GET で叩きたい管理操作
- 外部 SaaS からの webhook 受信
- ロードバランサや監視基盤向けの health endpoint

---

## 5. 想定サービス
### 5.1 ThemeService
役割:
- テーマ一覧取得
- テーマ詳細取得

### 5.2 ArticleService
役割:
- 記事一覧取得
- 記事詳細取得
- テーマ別トピック取得

### 5.3 IngestionService
役割:
- subreddit 収集開始
- 特定スレッド再収集
- 失敗ジョブ再実行

### 5.4 SummarizationService
役割:
- 要約実行
- 再要約
- 出力検証

### 5.5 AdminService
役割:
- ジョブ一覧
- ジョブ詳細
- 管理者操作

補足:
- MVP ではサービス数を絞り、責務が明確に分かれる単位から定義する
- 実装時に 1 つのバイナリに複数 service を同居させてもよい
- 将来の分割可能性を意識して、service 境界と DB テーブル境界を混同しない

---

## 6. Proto の配置
proto は `packages/proto` に配置する。

例:
- `packages/proto/theme/v1/theme.proto`
- `packages/proto/article/v1/article.proto`
- `packages/proto/ingestion/v1/ingestion.proto`
- `packages/proto/summarization/v1/summarization.proto`
- `packages/proto/admin/v1/admin.proto`

ルール:
- バージョン付きパスを使う
- breaking change は慎重に扱う
- message 名と service 名は責務ごとに明確に分ける
- 同じ message を安易に複数ドメインで共有しない
- field number の再利用はしない
- 廃止フィールドは必要に応じて `reserved` を使って保護する

推奨:
- `buf` などのツール導入を前提に lint と breaking check を自動化する
- package 名、Go package 名、生成先ディレクトリ規約を早期に固定する

---

## 7. 例: gRPC サービス構成
```proto
syntax = "proto3";

package article.v1;

service ArticleService {
  rpc ListArticles(ListArticlesRequest) returns (ListArticlesResponse);
  rpc GetArticle(GetArticleRequest) returns (GetArticleResponse);
}

message ListArticlesRequest {
  string theme_slug = 1;
  int32 page_size = 2;
  string page_token = 3;
}

message ListArticlesResponse {
  repeated Article items = 1;
  string next_page_token = 2;
}

message GetArticleRequest {
  string article_id = 1;
}

message GetArticleResponse {
  Article article = 1;
}

message Article {
  string id = 1;
  string title = 2;
  string summary_ja = 3;
  repeated string key_points = 4;
  string source_url = 5;
}
```

設計メモ:
- 一覧系は `page_size` と `page_token` を基本にする
- UI 表示用の派生フィールドと内部集計用の詳細フィールドは分けて考える
- 取得 API は読み取り最適化を優先し、更新系とは request/response を分離する

---

## 8. REST の想定エンドポイント
REST は管理系中心とする。

例:
- `POST /admin/ingestions/run`
- `POST /admin/summaries/rerun`
- `GET /admin/jobs`
- `GET /admin/jobs/:id`
- `GET /healthz`

注意:
- 新しい API を追加する際は、まず gRPC であるべきかを検討する
- 管理系でなければ安易に REST を増やさない
- 破壊的な管理操作は認可と監査ログを必須にする
- 再試行系操作は二重実行を避けるため冪等性キーや状態遷移を考慮する

---

## 9. Web との接続方針
`apps/web` からの接続方針は以下。

- 主データ取得は gRPC ベースで構成する
- 必要に応じて BFF / gateway を利用する
- 管理画面の簡易操作は REST を利用可能とする

実装候補:
- gRPC-Web
- Connect
- gRPC-Gateway
- BFF 経由

採用方針は別 ADR で決定する。

検討観点:
- ブラウザ互換性
- TypeScript クライアント生成の扱いやすさ
- 認証、CORS、Cookie、CSRF の整理しやすさ
- CDN やエッジ配信との相性
- 将来の公開 API 境界をどう切るか

---

## 10. 変更ルール
proto を変更した場合は、以下を必ず確認する。

- 生成コードの更新
- 実装の更新
- 関連テストの更新
- API ドキュメント更新
- Web / Worker 影響確認
- 破壊的変更の有無確認

詳細は `.ai/skills/proto-schema-review/SKILL.md` を参照する。

レビュー時の確認観点:
- 既存 field number の変更や再利用がないか
- optional/required 相当の扱いに互換性問題がないか
- 一覧 API のページング仕様が UI と整合しているか
- エラー表現が既存方針とずれていないか

---

## 11. テスト方針
API テストでは以下を行う。

- proto 契約テスト
- handler / service テスト
- usecase テスト
- schema / serialization テスト
- エラー時のレスポンス検証

管理 REST については:
- 認可
- バリデーション
- idempotency
- 監査ログ

も確認対象とする。

追加観点:
- 生成コード更新漏れを CI で検出する
- 主要 API の後方互換性チェックを自動化する
- Web が依存する message 変更時はフロントエンド側の型生成と表示確認を行う

---

## 12. 今後の検討事項
- gRPC-Web と Connect の比較
- 管理画面向け BFF の要否
- ストリーミング利用範囲
- 認証方式
- 公開 API と内部 API の分離方法
- エラーコード設計とドメイン例外のマッピング規約
- webhook や batch 実行 API をどこまで REST に含めるか
