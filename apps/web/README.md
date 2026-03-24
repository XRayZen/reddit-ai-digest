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
- `../../docs/plans/`

---

## 基本方針

- Next.js App Router 前提で構成する
- 読み取り中心の画面は Server Components を優先する
- Client Component は必要な箇所に限定する
- Redux は UI 横断状態に限定して使う
- page にロジックを詰め込みすぎない
- API 呼び出しロジックは `lib/` や `features/` に寄せる
- 共通 UI は `src/components/ui` の `shadcn` コンポーネントを優先する
- テーマ変更は `src/app/globals.css` の CSS variables を起点に行う
- フロントエンド先行フェーズでは API 全モックを許容する
- モックは `src/mocks/` に閉じ込め、将来の実 API 差し替えを妨げない
- 現在の公開 UI は `next-themes` による dark-first 構成を採用し、toggle はまだ持たない
- motion は `Reveal` と `ScrollProgress` の最小導入に留め、読み取り系 page の Server Component 構成を崩さない

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
- `src/lib/api/client.ts`
- `src/store/`

---

## セットアップ

最小構成のフロントエンドは `apps/web` 単体で起動できる。

```bash
corepack pnpm install
corepack pnpm --filter @reddit-ai-digest/web dev
```

確認用コマンド:

```bash
corepack pnpm --filter @reddit-ai-digest/web lint
corepack pnpm --filter @reddit-ai-digest/web typecheck
corepack pnpm --filter @reddit-ai-digest/web test
corepack pnpm --filter @reddit-ai-digest/web build-storybook
```

Storybook / visual regression:

```bash
corepack pnpm --filter @reddit-ai-digest/web storybook
corepack pnpm --filter @reddit-ai-digest/web serve:storybook-static
corepack pnpm --filter @reddit-ai-digest/web test:storybook
corepack pnpm --filter @reddit-ai-digest/web test:golden
corepack pnpm --filter @reddit-ai-digest/web test:golden:update
```

Playwright E2E:

```bash
corepack pnpm --filter @reddit-ai-digest/web test:e2e
corepack pnpm --filter @reddit-ai-digest/web test:e2e:ui
corepack pnpm --filter @reddit-ai-digest/web test:e2e:headed
```

補足:

- Storybook は `page.tsx` ではなく表示コンポーネント経由で story を持つ
- page 相当 story だけ `pageShell` を付け、部品 story は shell なしで固定する
- `shadcn` の導入後は `components.json` を基点に `corepack pnpm exec shadcn add ...` を使う
- Tailwind v4 は `postcss.config.mjs` と `src/app/globals.css` を正本として扱う
- `test:storybook` は Storybook build の smoke check
- `test:golden` / `test:golden:update` は毎回 `storybook-static` を作り直し、その成果物を専用 HTTP server で配信する
- CI の golden test は `build-storybook` 済み成果物を `test:golden:prebuilt` で再利用し、build の二重実行を避ける
- `test:golden:update` は意図した UI 変更時だけ実行し、baseline 更新差分をレビューする
- 差分確認用のレポートは `playwright-report/`、一時成果物は `test-results/` に出力される
- `test:e2e` は production build + `next start` を `127.0.0.1:3100` で起動し、主要導線のページ遷移回帰を確認する
- `Storybook + Playwright` は見た目回帰、`Playwright E2E` は導線回帰、`Browser Use` は探索確認に使い分ける
- E2E は `CONTENT_API_MODE=mock` を前提に固定 fixture を使う

Browser Use CLI の確認:

```bash
corepack pnpm --filter @reddit-ai-digest/web dev
./apps/web/scripts/browser-use-local.sh --session webcheck open http://127.0.0.1:3000
sleep 2
./apps/web/scripts/browser-use-local.sh --session webcheck screenshot apps/web/artifacts/home.png
```

補足:

- 画面データは `src/mocks/fixtures/` の固定 JSON 相当データを使う
- MSW のハンドラは `src/mocks/handlers.ts` に置き、実 API 差し替え境界を保つ
- Browser Use のシナリオは `test-scenarios/browser-use-cli.md` を参照する
- screenshot 保存先は `artifacts/` とし、画像本体は Git 管理しない
- Storybook の visual baseline は `tests/golden/` 配下の Playwright snapshot として Git 管理する
- root ベースのローカル環境では Chromium sandbox が原因で Browser Use CLI が停止するため、ラッパースクリプトで `IN_DOCKER=true` を付与している
- UI refresh の手動確認 screenshot も `artifacts/` に保存する

---

## 作業前に確認すること

- MVP 範囲は `../../docs/product/mvp-scope.md`
- API 方針は `../../docs/architecture/api.md`
- 全体像は `../../docs/architecture/overview.md`
- 実装プランは `../../docs/plans/`

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
- `test:e2e` を含む主要品質チェックが通る
- lint / format が通る
- UI 崩れがない
- 必要な docs 更新がある
- セルフレビュー済みである
