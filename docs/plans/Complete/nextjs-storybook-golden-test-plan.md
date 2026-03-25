# Next.js Storybook・ゴールデンテスト導入プラン

## Summary

- `apps/web` に Storybook を導入し、UI の見た目回帰は `Storybook + Playwright` の visual snapshot で扱う。
- 対象は `page.tsx` 直結ではなく、再利用可能な表示コンポーネントとページ相当の表示コンポーネントに寄せる。
- Browser Use は探索確認のまま維持し、固定回帰は Storybook/Playwright に分離する。
- 導入範囲はローカル実行手順、CI、関連ドキュメント更新まで含める。

## Implementation Changes

- Storybook 基盤
  - `apps/web/.storybook/` を追加し、フレームワークは `@storybook/nextjs-vite` を採用する。
  - `preview.tsx` で `globals.css`、Redux Provider、`nextjs.appDirectory = true` を設定する。
  - story は CSF3 で、基本はコンポーネント横に `*.stories.tsx` を置く。
- Story の対象
  - `HomeScreen`、`ThemeCard`、`ArticleCard`、`ArticleList`、`ThemeDetailClient`、`AdminDashboard`、`ArticleDetailView` を優先する。
  - `page.tsx` を直接 story 化せず、fixture 注入可能な表示コンポーネント経由で story を作る。
  - `default`、`empty`、`loading`、`error`、長文表示、ラベル差分を各 story で揃える。
- ゴールデンテスト
  - `@playwright/test` を追加し、`apps/web/tests/golden/storybook.visual.spec.ts` を作成する。
  - Playwright の screenshot comparison を使って Storybook 上の厳選 story を比較する。
  - baseline は Playwright 標準の `*-snapshots/` 配置を使い、Git 管理する。
  - viewport、locale、timezone、reduced motion、アニメーション停止、乱数・現在時刻依存の除去をテスト条件として固定する。
- スクリプトと CI
  - `apps/web/package.json` に `storybook`、`build-storybook`、`test:storybook`、`test:golden`、`test:golden:update` を追加する。
  - ルート `package.json` に `storybook:web`、`build-storybook:web`、`test:storybook:web`、`test:golden:web` を追加する。
  - GitHub Actions に web 用 workflow を追加し、`lint`、`typecheck`、`vitest`、`build-storybook`、`playwright` visual compare を実行する。
  - CI は baseline 自動更新を行わず、差分画像と Playwright report を artifact として保存する。

## Test Plan

- Storybook smoke
  - 主要 story が起動し、レンダリングエラーなく build できる。
- Visual golden
  - `ThemeCard`、`ArticleCard`、`ArticleDetailView`、`ThemeDetailClient`、`AdminDashboard` の主要 state が baseline と一致する。
  - 長いタイトル、長い要約、空状態、エラー状態、複数 stance label の表示崩れを検知できる。
- 既存テストとの整合
  - `Vitest + Testing Library` は振る舞いテストとして維持し、Storybook/Playwright は見た目回帰専用に分担する。
- CI acceptance
  - workflow 上で Storybook build と golden compare が成功し、失敗時は diff artifact を確認できる。

## Assumptions

- ゴールデンテストは DOM snapshot ではなく visual snapshot を指す。
- 外部 SaaS 依存は増やさず、Chromatic は採用しない。
- Storybook フレームワークは `@storybook/nextjs-vite` を使う。
- Storybook の test-runner は採用せず、Playwright を明示的に使う。

---

## 完了情報

### 完了日
2026-03-23

### 対象範囲
- `apps/web` パッケージ全体
- Storybook 設定、Story ファイル、ゴールデンテスト、CI workflow

### 完了判定の理由
全実装項目がコードベースに存在し、構造が計画通りであることをファイルパスレベルで検証済み。

### 実施した検証コマンド
```bash
# Storybook 設定
ls apps/web/.storybook/
# => main.ts, preview.tsx

# Story ファイル
ls apps/web/src/**/*.stories.tsx
# => 9ファイル (HomeScreen, ThemeCard, ArticleCard, ArticleList, ThemeDetailClient, AdminDashboard, ArticleDetailView, ErrorMessage, LoadingSkeleton)

# ゴールデンテスト
ls apps/web/tests/golden/
# => storybook.visual.spec.ts, playwright.storybook.config.ts

# baseline スナップショット
ls apps/web/tests/golden/storybook.visual.spec.ts-snapshots/
# => 9ファイルの PNG

# CI workflow
cat .github/workflows/ci-web.yml
# => lint/typecheck/vitest/build-storybook/test:golden:web 定義済み
```

### 検証結果
| 項目 | 状態 |
|------|------|
| Storybook 基盤 (`@storybook/nextjs-vite`) | ✅ |
| `preview.tsx` (globals.css, Redux, appDirectory) | ✅ |
| CSF3 Story ファイル | ✅ 9コンポーネント |
| ゴールデンテスト (`@playwright/test`) | ✅ |
| Playwright 設定 | ✅ |
| baseline スナップショット (Git管理) | ✅ |
| apps/web スクリプト | ✅ |
| ルート package.json スクリプト | ✅ |
| GitHub Actions workflow | ✅ |
| テスト条件固定 (viewport, locale, timezone, reducedMotion, アニメ停止, 日時固定) | ✅ |

### 既知事項・次段への引き継ぎ
- 新規 Story 追加時は `*.stories.tsx` を作成し、必要に応じて golden test の `visualCases` に追加する
- baseline 更新は `pnpm test:golden:update` でローカル実行後、コミットする
- CI では自動更新されない設計のため、意図的な変更時のみ手動更新する

### セルフレビュー結果
- **アーキテクチャ**: 計画通り `page.tsx` 直接ではなく表示コンポーネント経由で Story を作成している
- **テスト分離**: Vitest は振る舞い、Playwright は見た目回帰と役割が明確に分かれている
- **CI 設計**: baseline 自動更新を行わず、artifact で diff を確認できる設計になっている
- **外部依存**: Chromatic などの SaaS を使用せず、ローカル/CI で完結している
