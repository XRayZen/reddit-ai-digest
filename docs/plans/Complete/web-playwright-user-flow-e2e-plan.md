# apps/web Playwright 導線 E2E 導入プラン

## Summary

- `apps/web` にはすでに `Storybook + Playwright` の visual golden と `Browser Use` の探索的確認があるが、Next.js 実画面の主要導線を固定回帰として検証する E2E は未整備である。
- 今回は Playwright を `apps/web` の導線品質チェック用に追加し、`home -> theme detail -> article detail -> admin` の主要閲覧導線を mock API 前提で自動検証できる状態にする。
- 既存の visual golden と役割を競合させず、`Storybook Playwright = 見た目回帰`、`Playwright E2E = 画面遷移と導線回帰`、`Browser Use = 探索的確認` に整理する。
- 影響範囲は Playwright E2E 設定、シナリオ実装、ローカル一括チェック、CI、関連ドキュメント、ADR 追記まで含める。

## Current State

- `apps/web/package.json` にはすでに `@playwright/test` が入り、`test:golden` は `playwright.storybook.config.ts` 経由で Storybook snapshot を比較している。
- `apps/web/scripts/check-all-local.sh` は typecheck、lint、Vitest、Storybook build、golden、format までを回すが、Next.js 実画面の導線 E2E は実行していない。
- `.github/workflows/ci-web.yml` でも Chromium を入れて Storybook golden を回しているが、ページ遷移を含む品質ゲートは存在しない。
- `Browser Use` は `apps/web/scripts/browser-use-local.sh` と `apps/web/test-scenarios/browser-use-cli.md` で整備済みだが、固定回帰テストではなく確認用の位置づけである。

## Decision Notes

- Playwright E2E は既存の Storybook 用設定と分離して `playwright.e2e.config.ts` を新設する。
- 実行対象は Next.js の production build を起動した `127.0.0.1:3000` とし、開発サーバ依存の不安定性を避ける。
- 初期ブラウザは `chromium` の 1 系統に絞る。
  - 理由: MVP の品質導線をまず安定化することを優先し、CI 時間と flaky 要因を増やしすぎないため。
- API モードは既存ローカル品質チェック方針に合わせて `CONTENT_API_MODE=mock` を既定にする。
- ロケータは role / label / text を優先し、やむを得ない箇所のみ `data-testid` を追加する。
- trace / report は Playwright 標準を活かし、失敗時の調査材料を CI artifact に残す。
- Browser Use は撤去しない。
  - 探索的な画面確認と、固定回帰の E2E は役割が異なるため。

## Web Research Notes

- Next.js 公式は Playwright E2E を production server で実行する例を示しており、`next dev` 前提より本番寄りの挙動で確認する方が適切。
- Playwright 公式は `webServer` によるサーバ起動、GitHub Actions でのブラウザ導入、HTML report artifact 保存を標準的な構成として案内している。
- Playwright 公式の best practices では、実装詳細より user-visible behavior の検証、安定した locator、web-first assertions を重視している。
- Playwright 公式は trace を `on-first-retry`、CI では `retries` を有効化する構成を推奨しており、失敗解析コストを下げられる。

## Implementation Changes

### 1. E2E 設定とスクリプトの追加

- `apps/web/playwright.e2e.config.ts` を追加する。
- 基本方針:
  - `testDir`: `./tests/e2e`
  - `baseURL`: `http://127.0.0.1:3000`
  - `browserName`: `chromium`
  - `locale`: `ja-JP`
  - `timezoneId`: `Asia/Tokyo`
  - `trace`: `on-first-retry`
  - `screenshot`: `only-on-failure`
  - `video`: `retain-on-failure`
  - `retries`: `CI` 時のみ有効
- `webServer` は production build 前提にする。
  - 候補: 専用スクリプトで `next build` 後に `next start --hostname 127.0.0.1 --port 3000`
  - 既存 Storybook config と混線しないよう、E2E 用の起動経路を分ける。
- `apps/web/package.json` に以下を追加する。
  - `test:e2e`
  - `test:e2e:ui`
  - `test:e2e:headed`
  - 必要なら `test:e2e:debug`

### 2. 導線シナリオの初期実装

- `apps/web/tests/e2e/` を追加し、まずは MVP の主要閲覧導線を固定する。
- 初期対象:
  - ホーム画面が表示され、テーマカード一覧へ到達できる
  - テーマ詳細へ遷移し、記事一覧・empty/error ではない通常状態を確認できる
  - 記事詳細へ遷移し、タイトル、元 URL、日本語要約、主要論点が表示される
  - 管理画面が表示され、収集 / 再要約 UI の主要操作面が見える
- 画面遷移の安定化に必要なら、UI にアクセシブルな名称や最小限の `data-testid` を追加する。
- assertion は DOM の細部ではなく、ユーザーが認識する見出し、リンク、ボタン、主要本文の存在に寄せる。

### 3. E2E 用のテストデータ固定

- 既存の mock API 境界を使い、`CONTENT_API_MODE=mock` でページデータを固定する。
- Storybook 用 fixture と重複しすぎる場合は、`src/mocks/fixtures/` の再利用方針を整理する。
- 日時や乱数に依存する表示がある場合は、Playwright の `addInitScript` または app 側の注入で安定化する。

### 4. ローカル品質ゲートへの統合

- `apps/web/scripts/check-all-local.sh` に E2E を追加する。
- 実行順は以下を想定する。
  - typecheck
  - lint
  - Vitest
  - Storybook build
  - Storybook golden
  - Playwright E2E
  - format
- 失敗時の確認先として `apps/web/playwright-report` と `apps/web/test-results` を README に明記する。

### 5. CI への統合

- `.github/workflows/ci-web.yml` に Playwright E2E 実行を追加する。
- Chromium 導入は現状の step を流用しつつ、Storybook golden と E2E の両方に使う。
- 失敗時 artifact は以下を含める。
  - `apps/web/playwright-report`
  - `apps/web/test-results`
- CI 時間が過度に伸びる場合は、Storybook golden と E2E を job 分割するかを別途検討する。

### 6. ドキュメント更新

- `apps/web/README.md` に Playwright E2E のローカル実行手順を追記する。
- `docs/operations/local-development.md` の frontend quality check に導線 E2E を追加する。
- 必要なら `apps/web/AGENTS.md` の完了条件に `test:e2e` を明示する。

### 7. ADR 追記

- `docs/adr/architecture-decisions.md` に新規 ADR を追加する。
- 想定タイトル:
  - `ADR-0011: apps/web に Playwright による導線 E2E テストを導入する`
- 記録したい判断:
  - Storybook Playwright と Browser Use の中間を埋める固定回帰として E2E を採用する
  - 本番相当の Next.js 起動で確認する
  - 初期ブラウザは Chromium に絞る
  - mock モードを基本にし、主要閲覧導線を MVP の品質ゲートに含める

## Test Plan

- `corepack pnpm --filter @reddit-ai-digest/web typecheck`
- `corepack pnpm --filter @reddit-ai-digest/web lint`
- `corepack pnpm --filter @reddit-ai-digest/web test`
- `corepack pnpm --filter @reddit-ai-digest/web test:storybook`
- `corepack pnpm --filter @reddit-ai-digest/web test:golden`
- `corepack pnpm --filter @reddit-ai-digest/web test:e2e`
- `apps/web/scripts/check-all-local.sh`

## Risks

- Next.js production build を各 E2E 実行で作ると、ローカルと CI の待ち時間が伸びる。
- 既存 UI がテストしやすいアクセシブル名を十分に持っていない場合、E2E 導入に合わせた軽微な UI 修正が必要になる。
- mock データと visual golden 用 story data が乖離すると、見た目と導線で別の現実を見始める恐れがある。
- Storybook 用 Playwright と E2E 用 Playwright が同じ出力先を共有すると artifact の読み分けがしづらくなる。

## Acceptance Criteria

- `apps/web` に Storybook 用とは別の Playwright E2E 設定とテスト群が追加されている。
- mock API 前提で主要導線のページ遷移回帰を自動検知できる。
- `apps/web/scripts/check-all-local.sh` と `.github/workflows/ci-web.yml` から E2E が実行される。
- ドキュメントにローカル実行手順と役割分担が追記されている。
- `docs/adr/architecture-decisions.md` に Playwright 導線 E2E 導入の判断が記録されている。

## Sources

- Next.js Playwright guide: [https://nextjs.org/docs/app/guides/testing/playwright](https://nextjs.org/docs/app/guides/testing/playwright)
- Playwright installation: [https://playwright.dev/docs/intro](https://playwright.dev/docs/intro)
- Playwright best practices: [https://playwright.dev/docs/best-practices](https://playwright.dev/docs/best-practices)
- Playwright webServer config: [https://playwright.dev/docs/test-webserver](https://playwright.dev/docs/test-webserver)
- Playwright CI guide: [https://playwright.dev/docs/ci-intro](https://playwright.dev/docs/ci-intro)
- Playwright trace viewer: [https://playwright.dev/docs/trace-viewer-intro](https://playwright.dev/docs/trace-viewer-intro)

---

## 完了記録

**完了日**: 2026-03-24

### 対象範囲
- `apps/web/playwright.e2e.config.ts` - E2E 専用 Playwright 設定
- `apps/web/tests/e2e/user-flow.spec.ts` - 主要導線シナリオ実装
- `apps/web/package.json` - E2E 実行スクリプト追加
- `apps/web/scripts/check-all-local.sh` - ローカル品質ゲート統合
- `.github/workflows/ci-web.yml` - CI 統合
- `apps/web/README.md` - ドキュメント更新
- `docs/operations/local-development.md` - ドキュメント更新
- `docs/adr/architecture-decisions.md` - ADR-0011 追記

### 完了判定の理由
すべての Acceptance Criteria を満たしている：
1. ✅ `playwright.e2e.config.ts` で Storybook 用とは別の E2E 設定が追加された
2. ✅ `tests/e2e/user-flow.spec.ts` で home → theme detail → article detail → admin の主要導線を実装
3. ✅ `check-all-local.sh` と `web-ui.yml` から E2E が実行される
4. ✅ `README.md` と `local-development.md` にローカル実行手順と役割分担（Vitest = 振る舞い、Storybook Playwright = 見た目、Playwright E2E = 導線、Browser Use = 探索）を追記
5. ✅ ADR-0011 で導入の判断と影響（利点/欠点）を記録

### 実施した検証
- E2E 設定: production build + `next start` をポート 3100 で起動、mock モード固定
- シナリオ実装: 日時・乱数を `addInitScript` で固定し、安定したロケータで検証
- CI 統合: artifact に `playwright-report` と `test-results` を保存

### 既知事項・次段への引き継ぎ
- ポート 3100 は E2E 専用として `start:e2e` スクリプトで分離済み
- CI 時間増加を最小化するため、初期ブラウザは chromium に絞っている
- 今後導線が増えた場合は `tests/e2e/` 配下でシナリオを追加する

### セルフレビュー結果
- 設計方針（production build 起動、mock 既定、chromium 限定）と実装が一致している
- Storybook golden と E2E の出力先を分離（`playwright-report/e2e`、`test-results/e2e`）し、artifact の読み分けを可能にしている
- ドキュメントの役割分担記載により、メンテナンス時の混乱を防いでいる
