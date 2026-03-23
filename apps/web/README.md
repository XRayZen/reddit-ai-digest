# apps/web

## 目的
このディレクトリは、公開 UI と管理 UI を実装する
Next.js フロントエンドです。

この層の責務:
- テーマ一覧表示
- 記事一覧表示
- 記事詳細表示
- 管理画面 UI
- API クライアント呼び出し
- 画面状態の管理

詳細ルール:
- `./AGENTS.md`
- `../../docs/development/coding-rules-common.md`
- `../../docs/development/coding-rules-frontend.md`
- `../../docs/development/code-review-checklist.md`
- `../../docs/plans/frontend-first-mock-api-plan.md`

---

## 基本方針
- Next.js App Router 前提で構成する
- 読み取り中心の画面は Server Components を優先する
- Client Component は必要な箇所に限定する
- Redux は UI 横断状態に限定して使う
- page にロジックを詰め込みすぎない
- API 呼び出しロジックは `lib/` や `features/` に寄せる
- フロントエンド先行フェーズでは API 全モックを許容する
- モックは `src/mocks/` に閉じ込め、将来の実 API 差し替えを妨げない

---

## 想定ディレクトリ
- `src/app/`
  - ルート、page、layout、loading、error
- `src/components/`
  - 汎用 UI
- `src/features/`
  - 機能単位の UI / hooks / state
- `src/lib/`
  - API client、format、env
- `src/store/`
  - Redux store と slice
- `src/types/`
  - 型定義
- `src/mocks/`
  - mock handler、fixture、setup

---

## このディレクトリでよく触るファイル
- `src/app/page.tsx`
- `src/app/themes/[slug]/page.tsx`
- `src/app/articles/[id]/page.tsx`
- `src/app/admin/page.tsx`
- `src/lib/api-client.ts`
- `src/store/`

---

## 作業前に確認すること
- MVP 範囲は `../../docs/product/mvp-scope.md`
- API 方針は `../../docs/architecture/api.md`
- 全体像は `../../docs/architecture/overview.md`
- フロントエンド先行プランは `../../docs/plans/frontend-first-mock-api-plan.md`

---

## 実装ルール要約
- 実装前に短い計画を提示する
- 承認後に着手する
- 可能な限りテストファーストで進める
- 実装後はセルフレビューを行う
- `any` は原則使わない
- loading / error / empty state を考慮する
- Redux は UI 横断状態に限定する
- モックレスポンス前提ではなく、取得層前提で UI を組む

---

## 完了条件
- 型エラーがない
- 関連テストが通る
- lint / format が通る
- UI 崩れがない
- 必要な docs 更新がある
- セルフレビュー済みである
