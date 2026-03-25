# バックエンド コーディングルール

## 1. この文書の目的
この文書は、`apps/api` と `apps/worker` における
Go / gRPC / Worker / DB / 可観測性の実装ルールを定義する。

関連ドキュメント:
- `AGENTS.md`
- `docs/architecture/api.md`
- `docs/architecture/data-model.md`
- `docs/architecture/observability.md`
- `docs/development/coding-rules-common.md`

---

## 2. 基本方針
- Go らしい明確で簡潔なコードを書く
- gRPC と proto を契約の正本として扱う
- handler に業務ロジックを直接書かない
- Worker の責務を API と混ぜない
- `trace_id` を前提に可観測性を設計する

---

## 3. レイヤ構成
- `domain`
  - エンティティ、値オブジェクト、interface
- `usecase`
  - 業務フロー
- `adapter`
  - gRPC、REST、DB、Reddit、LLM、S3
- `infra`
  - config、logger、trace、sentry など

ルール:
- domain は adapter を import しない
- usecase は外部実装詳細に依存しない
- handler は入力変換と呼び出しに集中する
- repository 実装は adapter に置く

---

## 4. Go の基本ルール
- package 名は短く明確にする
- 過剰な略語を避ける
- 公開 API は意図が分かる命名にする
- ゼロ値を活かせる設計を優先する
- 不要な抽象化を避ける

---

## 5. interface
- interface は利用側に置く
- 小さい interface を優先する
- 実装が1つしかなくても、差し替え理由がある場合のみ抽象化する
- 先に interface を作るのではなく、必要性から切る

---

## 6. エラー処理
- エラーは握りつぶさない
- 文脈を添えて返す
- 再試行可能かどうかを意識する
- 失敗は `job_execution` やログに残す
- panic ではなく制御可能なエラー処理を優先する

---

## 7. context
- リクエスト境界やジョブ境界で context を受け渡す
- context を構造体に保持しない
- タイムアウトやキャンセルを意識する
- 外部 I/O には context を伝播する

---

## 8. gRPC / proto
- `.proto` を契約の正本とする
- proto 変更時は生成コード、実装、テスト、文書を更新する
- breaking change を安易に入れない
- field number を雑に変更しない
- 管理用途でない限り、主処理は gRPC を優先する

---

## 9. データアクセス
- raw、normalized、derived を混ぜない
- DB 保存処理は責務ごとに分ける
- transaction の境界を明確にする
- 冪等性が必要な処理は明示する
- unique 制約や再試行時の挙動を意識する

---

## 10. ログと監視
- 構造化ログを基本とする
- `trace_id` を必須項目として扱う
- `job_id`、`topic_id`、`subreddit` など必要な文脈を残す
- エラー時は調査可能な情報を残す
- 機密情報をログへ出さない

---

## 11. テスト
- usecase は重点的に単体テストを書く
- repository は必要に応じて統合テストを書く
- バグ修正時は再発防止テストを追加する
- 外部 API は adapter 境界で扱い、必要なら stub / mock を使う
- 冪等性や失敗系も確認する
- unit test では migration の適用確認まで背負わず、必要最小限の schema / stub を各テストで用意する
- migration の実行確認は統合テストまたは E2E で行う

---

## 12. 禁止事項
- handler に業務ロジックを書くこと
- domain から adapter を直接参照すること
- proto を変えて生成コードを更新しないこと
- エラーを無視すること
- raw snapshot を破壊的に上書きすること
