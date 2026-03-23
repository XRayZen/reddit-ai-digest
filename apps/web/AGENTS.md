## 目的
このディレクトリは、公開 UI と管理 UI を持つNext.js フロントエンドです。

詳細ルール:
- `../../docs/development/coding-rules-common.md`
- `../../docs/development/coding-rules-frontend.md`
- `../../docs/development/code-review-checklist.md`
- `../../docs/architecture/overview.md`
- `../../docs/architecture/api.md`

## このディレクトリでの作業ルール
1. 実装前に短い計画を提示し、OK を得てから着手する。
2. 可能な限りテストファーストで進める。
3. 実装後は必ずセルフレビューを行う。
4. App Router 前提で構成する。
5. 読み取り中心の画面は Server Components を優先する。
6. `use client` は必要な場所に限定する。
7. Redux は UI 横断状態に限定し、サーバーデータの置き場にしない。
8. API 呼び出しロジックを page に直書きしすぎない。
9. `any` は原則使わない。
10. loading / error / empty state を必ず意識する。
11. 共通 UI はまず `src/components/ui` の `shadcn` コンポーネント利用を検討する。
12. テーマ変更は `src/app/globals.css` の CSS variables を正本として扱う。
13. `src/lib/api` を Web の取得境界として扱い、page / UI から `mocks/` や fixture を直接参照しない。
14. `src/mocks` は mock 実装、fixture、MSW handler の閉じ込め先とし、本番 API 差し替え時も page / UI を直接書き換えない。

## 完了条件
- `apps/web/scripts/check-all-local.sh` を実行し、必要な一括チェックが通っている
- 関連テストが通る
- `CONTENT_API_MODE=mock` を前提に Storybook / Browser Use / UI テストが安定して通る
- `live` 実装の単体テストで transport / エラー変換の回帰が検知できる
- 型エラーがない
- lint / format が通る
- UI 崩れがない
- 必要な docs 更新がある
- セルフレビュー済みである
