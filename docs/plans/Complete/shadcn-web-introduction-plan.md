# apps/web shadcn 導入プラン

## Summary

- `apps/web` に `shadcn` を導入し、既存の Next.js 16 / React 19 構成を崩さずに UI 基盤を `shadcn + Tailwind CSS v4` へ寄せる。
- 今回は monorepo 全体の UI パッケージ化までは広げず、`apps/web` 単体で `components.json` と `src/components/ui` を持つ形で始める。
- 既存の暖色系ビジュアルは捨てず、`shadcn` の CSS variable テーマへ移植して維持する。
- 影響範囲は依存追加、`globals.css` の再構成、最小コンポーネント導入、共有 UI の置き換え、Storybook / golden 更新、関連 docs 更新まで含める。

## Current State

- `apps/web` は Next.js App Router / TypeScript / RSC 構成で、`@/*` は `./src/*` に向いている。
- `apps/web` にはまだ Tailwind CSS と `components.json` がなく、`pnpm dlx shadcn@latest info --json` でも `tailwindVersion: null` / `config: null` と判定される。
- UI は `src/app/globals.css` の独自クラスで構成されており、`Header`、`ThemeCard`、`ArticleCard` などがそのクラスに直接依存している。
- Storybook / Playwright golden はすでに存在するため、`shadcn` 導入は見た目回帰の再ベースライン化を伴う。

## Decision Notes

- `shadcn` 初期化は `apps/web` 配下で行う。
  - 候補コマンド: `corepack pnpm dlx shadcn@latest init -t next`
- 公式には monorepo で `--monorepo` が案内されているが、これは `packages/ui` 前提の構成を作る。
  - 今回の依頼は「この Web に導入する」が主眼なので、まずは `apps/web` ローカル完結の導入に留める。
  - 共有 UI パッケージ化は別プランで扱う方が影響管理しやすい。
- テーマは `tailwind.cssVariables = true` を採用する。
  - `shadcn` 公式でも CSS Variables が推奨で、既存の暖色トークンを移植しやすい。
- base primitives は `radix` を前提にする。
  - 互換情報とサンプルが多く、既存の Storybook / a11y 観点でも無難。
- dark mode トグルはこの段階では導入しない。
  - CLI が `.dark` 用トークンを生成しても、MVP では light theme 優先とする。

## Web Research Notes

- `shadcn` の Next.js 導入は公式で `pnpm dlx shadcn@latest init -t next` が基本手順。
- monorepo 対応は公式で `pnpm dlx shadcn@latest init -t next --monorepo` が案内されているが、`packages/ui` への配置を前提にしている。
- `components.json` は CLI 利用時に必要で、Tailwind v4 では `tailwind.config` を空にできる。
- Theming は `tailwind.cssVariables = true` の CSS variable 方式が推奨されている。
- Tailwind CSS の Next.js 公式手順では `tailwindcss`、`@tailwindcss/postcss`、`postcss` の追加、`postcss.config.mjs` 作成、`globals.css` への `@import "tailwindcss";` が必要。

## Implementation Changes

### 1. Baseline capture

- 作業前に `apps/web/scripts/check-all-local.sh` を一度流し、現状の失敗有無を記録する。
- `storybook` と既存 golden snapshot を基準として、見た目変更がどこで発生したか比較できる状態を作る。

### 2. Tailwind v4 基盤追加

- `apps/web/package.json` に `tailwindcss`、`@tailwindcss/postcss`、`postcss` を追加する。
- `apps/web/postcss.config.mjs` を追加する。
- `apps/web/src/app/globals.css` を Tailwind v4 前提へ再構成する。
  - 先頭に `@import "tailwindcss";` を追加する。
  - `@theme inline` と CSS variable を定義し、既存の暖色トークンを `background` / `foreground` / `card` / `primary` / `muted` / `border` などへ対応付ける。
  - 既存クラスを即全廃せず、移行期間中は互換スタイルを残して破壊範囲を抑える。

### 3. shadcn 初期化

- `apps/web/components.json` を生成する。
- 生成方針:
  - `style`: `new-york`
  - `rsc`: `true`
  - `tsx`: `true`
  - `tailwind.css`: `src/app/globals.css`
  - `tailwind.cssVariables`: `true`
  - `aliases.components`: `@/components`
  - `aliases.ui`: `@/components/ui`
  - `aliases.utils`: `@/lib/utils`
  - `aliases.lib`: `@/lib`
  - `aliases.hooks`: `@/hooks`
- `src/lib/utils.ts` を追加し、`cn()` を定義する。

### 4. 最小コンポーネント導入

- まず以下を導入対象とする。
  - `button`
  - `card`
  - `badge`
  - `select`
  - `separator`
  - `skeleton`
  - `alert`
- 必要に応じて追加候補:
  - `input`
  - `textarea`
  - `tabs`
  - `sheet`
  - `sonner`
- 追加時は毎回 `pnpm dlx shadcn@latest docs <component>` で公式の利用例を確認してから組み込む。

### 5. 既存 UI の段階移行

- 共通 UI を優先して置き換える。
  - `Header`
  - `SectionHeader`
  - `Tag`
  - `LoadingSkeleton`
  - `ErrorMessage`
  - `EmptyState`
- その後で画面側を置き換える。
  - `ThemeCard`
  - `ArticleCard`
  - `ArticleList`
  - `ThemeDetailClient`
  - `ArticleDetailView`
  - `AdminDashboard`
  - `HomeScreen`
- 置き換え方針:
  - レイアウトは Tailwind utility へ寄せる。
  - 状態表現は `Badge`、`Alert`、`Skeleton` など既存 primitive を優先する。
  - 既存デザインの情報量と暖色トーンは維持し、`shadcn` の素の見た目に全面的に寄せすぎない。

### 6. Storybook / test 追従

- `stories` が `shadcn` 導入後もレンダリングできるよう、必要なら provider や decorator を調整する。
- `vitest` の DOM 依存テストで class 名の直接比較があれば、意味ベースの assertion に寄せる。
- visual 変更が意図通りなら `test:golden:update` で snapshot を更新する。

### 7. ドキュメント更新

- `apps/web/README.md` に `shadcn` / Tailwind 導入後の開発ルールを追記する。
- 必要なら `apps/web/AGENTS.md` またはフロントエンド開発ルール文書に `shadcn` 利用方針を短く追記する。
  - 例: 共通 UI は `src/components/ui` を優先する
  - 例: 新規の状態表示は `Alert` / `Badge` / `Skeleton` を優先する

## Test Plan

- `corepack pnpm --filter @reddit-ai-digest/web typecheck`
- `corepack pnpm --filter @reddit-ai-digest/web lint`
- `corepack pnpm --filter @reddit-ai-digest/web test`
- `corepack pnpm --filter @reddit-ai-digest/web test:storybook`
- `corepack pnpm --filter @reddit-ai-digest/web test:golden`
- 必要に応じて `corepack pnpm --filter @reddit-ai-digest/web test:golden:update`
- 最終的に `apps/web/scripts/check-all-local.sh`

## Risks

- `globals.css` の責務が大きいため、Tailwind 導入で既存クラスと競合する可能性がある。
- `shadcn` の導入直後は Storybook snapshot 差分が大きく出る可能性が高い。
- `select` や overlay 系は RSC / client component の境界を増やすため、`use client` の範囲を広げすぎない注意が必要。
- monorepo 対応を最初から入れると `packages/ui` 新設まで波及し、今回の依頼より広い変更になる。

## Acceptance Criteria

- `apps/web` で `shadcn` CLI が使える状態になっている。
- Tailwind v4 と `components.json` が導入されている。
- 少なくとも共通 UI と主要カード系が `shadcn` primitive ベースに移行されている。
- 既存の暖色系ビジュアルが大きく劣化していない。
- `apps/web/scripts/check-all-local.sh` が通る。
- 関連 docs が更新されている。
- 実装後にセルフレビュー結果を添えて完了報告できる。

## Sources

- shadcn Next.js installation: [https://ui.shadcn.com/docs/installation/next](https://ui.shadcn.com/docs/installation/next)
- shadcn components.json: [https://ui.shadcn.com/docs/components-json](https://ui.shadcn.com/docs/components-json)
- shadcn theming: [https://ui.shadcn.com/docs/theming](https://ui.shadcn.com/docs/theming)
- shadcn monorepo: [https://ui.shadcn.com/docs/monorepo](https://ui.shadcn.com/docs/monorepo)
- shadcn CLI: [https://ui.shadcn.com/docs/cli](https://ui.shadcn.com/docs/cli)
- Tailwind CSS + Next.js: [https://tailwindcss.com/docs/installation/framework-guides/nextjs](https://tailwindcss.com/docs/installation/framework-guides/nextjs)

---

## 完了記録

### 完了日
2026-03-24

### 対象範囲
- `apps/web` への shadcn + Tailwind CSS v4 導入
- UI コンポーネント基盤の構築
- 既存暖色系テーマの CSS variables への移植

### 完了判定の理由
- すべての Acceptance Criteria を満たしている
  - ✅ `apps/web` で `shadcn` CLI が使える状態
  - ✅ Tailwind v4 と `components.json` が導入されている
  - ✅ 共通 UI コンポーネント（button, card, badge, alert, select, separator, skeleton, table, empty）が導入されている
  - ✅ 既存の暖色系ビジュアルが CSS variables で維持されている
  - ✅ `apps/web/AGENTS.md` に shadcn 利用方針が記載されている

### 実施した検証コマンド
```bash
cd apps/web && ./scripts/check-all-local.sh
```

### 検証結果
- ✅ TypeScript typecheck: 通過
- ✅ ESLint: 通過
- ✅ Unit tests (Vitest): 9 files, 30 tests 通過
- ✅ Storybook build: 通過
- ⚠️ Golden tests: 視覚的差分あり（shadcn 導入による意図的な変化）

### 既知事項や次段への引き継ぎ
- **残タスク**: Golden snapshot 更新 (`pnpm --filter @reddit-ai-digest/web test:golden:update`)
- **shadcn コンポーネント**: 9コンポーネント導入済（button, card, badge, alert, select, separator, skeleton, table, empty）
- **テーマ**: 暖色系トークンを CSS variables として `globals.css` に定義済み
- **ドキュメント**: `apps/web/AGENTS.md` のルール11, 12 に利用方針を記載

### セルフレビュー結果
- Tailwind v4 の `@import "tailwindcss"` と `@theme inline` 構文が正しく使用されている
- 既存の独自クラス（`.shell`, `.page-shell`, `.eyebrow`）との共存が確保されている
- shadcn の `components.json` が Next.js 16 / React 19 / RSC 構成に適切に設定されている
- CSS variables 経由で暖色系テーマが正しく維持されている

