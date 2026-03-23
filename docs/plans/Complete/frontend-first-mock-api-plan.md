# フロントエンド先行実装プラン（API 全モック）

## 補足
この文書は、フロントエンドを API 全モックで先行実装するための
基礎プランを定義する。

Browser Use CLI を使った AI 動作確認環境、
および将来の Playwright 固定回帰テストまで含めた
次段の統合プランは
`docs/plans/Complete/frontend-ui-and-browser-check-plan.md`
を参照する。

## 1. この文書の目的
この文書は、本プロジェクトにおいて
最初にフロントエンドから実装へ入り、
API はすべてモックで置き換えた状態で
最低限の UI を先に整えるための実装計画を定義する。

関連ドキュメント:
- `AGENTS.md`
- `docs/product/`
- `docs/architecture/`
- `docs/development/`
- `apps/web/`

---

## 2. この段階の方針
このフェーズでは、バックエンド実装には着手しない。
画面構成、情報設計、状態管理、UI 体験を先に固める。

方針:
- フロントエンドを先に作る
- API はすべてモックで実装する
- 最低限の UI を先に完成させる
- 実データ接続を前提にした境界を保つ
- モック依存の実装を本番依存コードへ漏らさない

---

## 3. 採用方針
- Next.js App Router を前提に実装する
- Redux Toolkit は UI 横断状態に限定して使う
- API モックは MSW を第一候補とする
- データ取得層は将来の gRPC 接続へ差し替えやすくする
- 画面表示に必要な型とモックレスポンスを先に定義する

---

## 4. このフェーズのゴール
このフェーズのゴールは以下。

- ホーム画面が表示できる
- テーマ一覧が表示できる
- テーマ詳細画面が表示できる
- 記事一覧カードが表示できる
- 記事詳細画面が表示できる
- 管理画面の最低限の UI 骨格がある
- API 通信はすべてモックで成立している
- 後から実 API に差し替えやすい構造になっている

---

## 5. このフェーズで実装する画面
### 5.1 ホーム
- サービス概要
- テーマ一覧
- テーマごとの簡単な説明

### 5.2 テーマ詳細
- テーマ名
- 記事一覧
- フィルタ UI の骨格
- 並び替え UI の骨格

### 5.3 記事詳細
- 元スレタイトル
- 元 URL
- 日本語翻訳
- 日本語要約
- 主要論点
- 議論傾向ラベル

### 5.4 管理画面
- 収集実行ボタン
- 再要約実行ボタン
- ジョブ一覧のダミー表示

---

## 6. このフェーズで実装しないもの
- 実バックエンド接続
- gRPC 実接続
- 認証
- 本番データ取得
- 本物の収集ジョブ
- 本物の要約処理
- 高度な検索
- レコメンド
- 課金

---

## 7. データ取得方針
このフェーズでは API 呼び出しをすべてモックで扱う。

想定:
- フロントエンドのデータ取得コードは本番想定の形で書く
- モックは開発用の層として差し込む
- モックレスポンスは固定 JSON で管理する
- UI はモック前提ではなく、取得層前提で組む

候補:
- MSW による HTTP モック
- `src/mocks/handlers.ts` のような構成
- feature ごとの fixture 分離

---

## 8. ディレクトリ方針
`apps/web` では以下を基準に進める。

- `src/app/`
  - 画面ルート
- `src/components/`
  - 汎用 UI
- `src/features/`
  - 機能ごとの UI / hooks / state
- `src/lib/`
  - API client / format / env
- `src/store/`
  - Redux store
- `src/types/`
  - 型定義
- `src/mocks/`
  - mock handler / fixture / setup

---

## 9. 実装順序
### Step 1
フロントエンド基盤を作る。
- Next.js App Router 初期化
- 基本レイアウト
- グローバルスタイル
- ルーティング骨格

### Step 2
UI 用の型を定義する。
- Theme
- ArticleCard
- ArticleDetail
- AdminJob

### Step 3
モックデータとモックハンドラを作る。
- テーマ一覧
- 記事一覧
- 記事詳細
- 管理画面用ジョブ一覧

### Step 4
画面を作る。
- `/`
- `/themes/[slug]`
- `/articles/[id]`
- `/admin`

### Step 5
UI 状態管理を足す。
- フィルタ UI 状態
- 表示設定
- 管理画面の操作状態

### Step 6
ローディング / エラー / 空状態を整える。

### Step 7
コンポーネント整理とセルフレビューを行う。

---

## 10. 最初に作る最小 UI 部品
- Header
- ThemeCard
- ArticleCard
- SectionHeader
- Tag
- EmptyState
- LoadingSkeleton
- ErrorMessage
- AdminActionPanel

---

## 11. 受け入れ条件
このフェーズの完了条件は以下。

- 4画面が遷移可能である
- API 通信はすべてモックで成立している
- loading / error / empty state がある
- 型エラーがない
- lint / format が通る
- UI 崩れがない
- セルフレビュー済みである

---

## 12. 次フェーズへの接続条件
次にバックエンド接続へ進む条件は以下。

- UI の情報設計が固まっている
- 必要な画面と表示項目が明確になっている
- モックレスポンスの shape が整理されている
- gRPC / REST の接続点を差し替え可能な形で分離できている
- Browser Use CLI などによるローカル動作確認の導線が整理されている
- 固定回帰テスト導入時に Playwright を追加できる構成になっている

---

## 13. 注意事項
- モック前提の画面直書きをしない
- データ取得層と表示層を分離する
- 将来の実 API 差し替えを妨げる実装を避ける
- Redux は UI 横断状態に限定する
- `use client` を必要以上に広げない
- 探索的な AI 動作確認と固定回帰テストを同一手段に寄せ切らない

---

## 14. 完了記録
このプランは 2026-03-23 時点で完了扱いとする。

完了判定の対象範囲:
- `apps/web` におけるフロントエンド先行 UI 実装
- API 全モックを前提にした取得境界と fixture の整備
- 4 画面の遷移と表示項目の確定
- 将来の実 API 差し替えに備えた構造の整理

完了判定の理由:
- ホーム、テーマ詳細、記事詳細、管理画面の 4 画面が実装されている
- 型、fixture、取得層、MSW ハンドラ、画面コンポーネントが分離されている
- UI 横断状態は Redux Toolkit に限定されている
- `loading` / `error` / `empty` / `not-found` が整備されている
- 受け入れ条件にある `lint` / `typecheck` / `format` の通過を確認している
- 次段プランで要求している Browser Use 導線まで整備済みである

補足:
- この文書は Browser Use 導入前の基礎プランだが、実装結果としては次段プランの前提まで満たしている
- そのため、本プランは単独でも完了、かつ次段プランへ接続済みと判断する

---

## 15. 検証記録
実施日:
- 2026-03-23

実施コマンド:
- `corepack pnpm --filter @reddit-ai-digest/web lint`
- `corepack pnpm --filter @reddit-ai-digest/web typecheck`
- `corepack pnpm --filter @reddit-ai-digest/web test`
- `corepack pnpm --filter @reddit-ai-digest/web format`
- `corepack pnpm --filter @reddit-ai-digest/web build`

検証結果:
- `lint` 通過
- `typecheck` 通過
- `test` 通過（`11 passed`）
- `format` 通過
- `build` 通過
- `/`, `/themes/[slug]`, `/articles/[id]`, `/admin` の 4 画面が成立している
- モック取得層経由でテーマ一覧、テーマ詳細、記事詳細、管理画面のジョブ一覧が取得できる

受け入れ条件に対する確認:
- 4画面が遷移可能である: 確認済み
- API 通信はすべてモックで成立している: 確認済み
- loading / error / empty state がある: 確認済み
- 型エラーがない: 確認済み
- lint / format が通る: 確認済み
- UI 崩れがない: 主要画面のローカル確認で大きな崩れなし
- セルフレビュー済みである: 本文末尾に記録

---

## 16. セルフレビュー記録
確認観点:
- このプランの Step 1〜7 と受け入れ条件を照合した
- `apps/web` の実装がモック取得層前提になっていることを確認した
- 4 画面、UI 状態、テスト、ビルド、文書導線の整合を確認した
- 次段の Browser Use / Playwright 方針に接続できる構造になっていることを確認した

セルフレビュー結果:
- 本プラン単体のスコープでは完了扱いで問題ない
- 次段の Browser Use プランは本プランの成果を前提として成立している
- 今後の差し替え作業は `lib/` / `features/` 境界から進めるのが妥当である
