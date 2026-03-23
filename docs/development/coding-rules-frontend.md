# フロントエンド コーディングルール

## 1. この文書の目的
この文書は、`apps/web` における
Next.js / React / Redux Toolkit / TypeScript の実装ルールを定義する。

関連ドキュメント:
- `AGENTS.md`
- `docs/architecture/overview.md`
- `docs/architecture/api.md`
- `docs/development/coding-rules-common.md`
- `docs/plans/`

---

## 2. 基本方針
- Next.js App Router 前提で構成する
- 読み取り中心のページでは Server Components を優先する
- Client Component は本当に必要な範囲に限定する
- UI 表示とデータ取得ロジックを分離する
- Redux は UI 横断状態に限定して使う
- フロントエンド先行フェーズでは API 全モックを許容する

---

## 3. ディレクトリ責務
- `app/`
  - ルート、page、layout、loading、error
- `components/`
  - 汎用 UI 部品
- `features/`
  - 機能単位の UI / hooks / state
- `lib/`
  - API client、format、env など
- `store/`
  - Redux store と slice
- `types/`
  - フロント側の型定義
- `mocks/`
  - MSW handler、fixture、setup

---

## 4. コンポーネント設計
- page は画面構成に集中させる
- 表示部品は小さく分割する
- 巨大な `page.tsx` を作らない
- props は必要最小限にする
- 1コンポーネントに複数責務を持たせすぎない

---

## 5. Server / Client の使い分け
- データ取得主体の画面は Server Components を優先する
- ブラウザ状態やイベント処理が必要な箇所のみ Client Components にする
- 何でも `use client` にしない
- ルートレベルで不用意に client 化しない

---

## 6. Redux 利用ルール
- Redux Toolkit を使う
- store はグローバル UI 状態に限定する
- サーバーデータを無秩序に Redux に複製しない
- filter、preferences、UI 状態などに優先利用する
- slice は責務ごとに分ける

補足:
- API キャッシュ置き場として無秩序に使わない
- データ取得は `lib/` や `features/` 側へ寄せる

---

## 7. TypeScript ルール
- `any` は原則禁止とする
- primitive 型を使う
  - `string`, `number`, `boolean`
- `String`, `Number`, `Boolean`, `Object` は使わない
- 型を曖昧にせず、API レスポンス型を定義する
- 共通型は `types/` または feature 単位で整理する

---

## 8. API 連携
- 主処理は gRPC 系のクライアント方針に従う
- 補助的な管理用途のみ REST を扱う
- API 呼び出しロジックは `lib/` や feature 層へ寄せる
- コンポーネント内に直接ベタ書きしすぎない

モック方針:
- フロントエンド先行フェーズでは MSW を第一候補とする
- モックは `mocks/` 配下に閉じる
- UI はモック前提ではなく取得層前提で組む
- 実 API 差し替え時に page や汎用 UI を大きく書き換えない構造を保つ

---

## 9. UI / 表示ルール
- 一覧と詳細の責務を分ける
- 表示テキストは整形関数に寄せる
- ローディング、エラー、空状態を明示する
- 要約や key points の表示崩れを意識する

---

## 10. テスト
- 重要な表示分岐はテスト対象にする
- format 関数や変換処理は単体テストを書く
- UI テストは振る舞いを確認する
- 実装詳細に依存しすぎたテストを避ける

---

## 11. 禁止事項
- 巨大な page にロジックを詰め込むこと
- 何でも Redux に載せること
- `use client` を安易に広げること
- `any` や曖昧な型でごまかすこと
- 表示ロジックと取得ロジックを密結合にすること
