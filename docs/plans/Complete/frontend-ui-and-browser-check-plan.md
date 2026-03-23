# フロントエンド先行実装 + Browser Use CLI 動作確認環境構築プラン

## 1. この文書の目的

この文書は、本プロジェクトにおいて
フロントエンドを先行実装し、
API はすべてモックで置き換えたうえで、
Browser Use CLI を使った AI 自動動作確認環境まで整備するための計画を定義する。

関連ドキュメント:

- `AGENTS.md`
- `README.md`
- `docs/product/mvp-scope.md`
- `docs/operations/local-development.md`
- `docs/development/coding-rules-frontend.md`
- `apps/web/AGENTS.md`
- `apps/web/README.md`
- `docs/plans/Complete/frontend-first-mock-api-plan.md`

---

## 2. このフェーズの方針

このフェーズでは、バックエンド実装には入らない。
まずはフロントエンドの最低限 UI を完成させ、
その画面を Browser Use CLI で AI 自動確認できる状態を作る。

方針:

- フロントエンドから先に作る
- API はすべてモックで実装する
- UI の情報設計と画面遷移を先に固める
- 実 API 差し替えを見越した取得層を作る
- Browser Use CLI をローカル動作確認に使う
- 将来の固定回帰テストは Playwright に載せやすくする
- 探索的確認と固定回帰確認の役割を分ける

---

## 3. このフェーズのゴール

- ホーム画面が表示できる
- テーマ一覧が表示できる
- テーマ詳細画面が表示できる
- 記事詳細画面が表示できる
- 管理画面の最低限 UI が表示できる
- API 通信はモックで成立している
- Browser Use CLI からローカル画面へアクセスできる
- AI による画面確認シナリオを実行できる
- screenshot を含む確認結果を保存できる

---

## 4. 画面実装対象

### 4.1 ホーム

- サービス概要
- テーマ一覧
- テーマ説明

### 4.2 テーマ詳細

- テーマ名
- 記事一覧
- 並び替え UI の骨格
- フィルタ UI の骨格

### 4.3 記事詳細

- 元スレタイトル
- 元 URL
- 日本語翻訳
- 日本語要約
- 主要論点
- 議論傾向ラベル

### 4.4 管理画面

- 収集実行ボタン
- 再要約実行ボタン
- ジョブ一覧ダミー表示

---

## 5. API モック方針

- フロントエンドの取得コードは実 API を意識した形で作る
- ただしこのフェーズではすべてモック応答を返す
- モックは UI から分離する
- 固定 JSON / fixture を使う
- モックレスポンス shape は将来の API 契約候補として扱う

推奨:

- `src/mocks/`
- `src/types/`
- `src/lib/api-client.ts`

---

## 6. Browser Use CLI 導入方針

Browser Use CLI の導入はローカル確認用途として行う。

前提:

- Python 3.11 以上
- `uv`
- ローカルで起動した `apps/web`

想定手順:

1. Python 3.11+ を確認する
2. `uv` を利用して Browser Use を導入する
3. `browser-use install` で Chromium を導入する
4. `browser-use doctor` で診断する
5. 必要なら `browser-use setup` を実行する
6. ローカル画面へ `browser-use open http://localhost:3000` で接続する
7. `state` / `click` / `screenshot` を使って確認する

想定コマンド:

```bash
uv pip install browser-use
browser-use install
browser-use doctor
browser-use setup
browser-use open http://localhost:3000
browser-use state
browser-use screenshot artifacts/home.png
```

---

## 7. Browser Use CLI で作る確認シナリオ

### シナリオ 1

- ホーム画面へアクセスする
- テーマ一覧が見えることを確認する
- screenshot を保存する

### シナリオ 2

- 特定テーマを開く
- 記事カード一覧が見えることを確認する
- screenshot を保存する

### シナリオ 3

- 記事詳細へ遷移する
- 要約、翻訳、主要論点、元 URL があることを確認する
- screenshot を保存する

### シナリオ 4

- 管理画面を開く
- 収集実行 UI と再要約 UI があることを確認する
- screenshot を保存する

---

## 8. Playwright の位置づけ

この段階では Browser Use CLI を先に導入するが、
固定回帰テストまで Browser Use のみに寄せない。

役割分担:

- Browser Use CLI
  - AI による探索的 UI 確認
  - 自然言語ベースの操作確認
  - screenshot 取得
- Playwright
  - 再現性の高い固定 E2E / visual regression
  - CI 向け回帰防止
  - 主要導線の継続検証

方針:

- まず Browser Use CLI で手動に近い確認導線を整える
- その後、壊れやすい主要導線から Playwright に落とし込む
- Storybook ベースの固定回帰詳細は `docs/plans/nextjs-storybook-golden-test-plan.md` に分離して管理する

---

## 9. 推奨ディレクトリ追加

`apps/web/src` 配下に以下を追加する。

- `mocks/`
  - mock handlers
  - fixtures
  - setup
- `test-scenarios/`
  - Browser Use で実行する確認メモ
- `artifacts/`
  - screenshot 保存先
  - 必要なら `.gitignore` 対象

---

## 10. 実装順序

### Step 1

- Next.js App Router の土台作成
- 共通 layout 作成
- 最低限のデザイントークン作成

### Step 2

- `Theme`
- `ArticleCard`
- `ArticleDetail`
- `AdminJob`
  の型定義を作る

### Step 3

- モックデータ作成
- モック取得層作成

### Step 4

- ホーム画面作成
- テーマ詳細画面作成
- 記事詳細画面作成
- 管理画面作成

### Step 5

- loading / error / empty state 作成

### Step 6

- Browser Use CLI 導入
- ローカル起動確認
- `doctor` / `setup` 実行

### Step 7

- Browser Use CLI で確認シナリオを実行
- screenshot を保存
- UI 崩れや導線漏れを修正

### Step 8

- 将来の固定回帰用に Playwright 導入余地を残す

---

## 11. 完了条件

- 4画面が遷移可能である
- API モックで UI が成立している
- loading / error / empty state がある
- Browser Use CLI でローカル画面へアクセスできる
- 主要画面の screenshot を保存できる
- 型エラーがない
- lint / format が通る
- セルフレビュー済みである

---

## 12. 次フェーズへの接続条件

次に API 実接続へ進む条件は以下。

- UI の情報設計が固まっている
- モックレスポンス shape が整理されている
- 画面遷移と表示項目が確定している
- Browser Use による基本動作確認が通っている
- 実 API 差し替え点が `lib/` / `features/` に分離されている
- Playwright 導入時の対象導線が整理されている

---

## 13. 注意事項

- Browser Use CLI は探索確認の主手段として扱う
- 固定回帰テストは Playwright へ寄せる前提を維持する
- モックレスポンス shape を画面都合だけで崩さない
- screenshot 保存物は Git 管理対象かどうかを事前に決める
- ローカル手順は `docs/operations/local-development.md` と矛盾させない

---

## 14. 完了記録

このプランは 2026-03-23 時点で完了扱いとする。

完了判定の対象範囲:

- `apps/web` のフロントエンド先行 UI 実装
- API モックを前提にした取得境界の整備
- Browser Use CLI によるローカル画面確認導線の整備
- 主要画面の screenshot 保存

完了判定の理由:

- ホーム、テーマ詳細、記事詳細、管理画面の 4 画面が実装されている
- モック取得層、fixture、MSW ハンドラが分離されている
- `loading` / `error` / `empty` / `not-found` が実装されている
- Browser Use CLI のローカル確認手順とラッパースクリプトが整備されている
- 主要画面の screenshot 保存を実施した
- `lint` / `typecheck` / `test` / `format` / `build` を通過した

補足:

- Browser Use CLI の `run` による LLM ベースの自然言語エージェント実行は、API キー未設定のため今回の完了判定対象には含めない
- このフェーズで必要な確認は `open` / `state` / `screenshot` を軸としたローカル検証で満たしている
- 固定回帰テストは次段の Playwright 導入で補強する前提を維持する

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
- `./apps/web/scripts/browser-use-local.sh doctor`
- `./apps/web/scripts/browser-use-local.sh setup --mode local --yes`
- `./apps/web/scripts/browser-use-local.sh --session webcheck open http://127.0.0.1:3000`
- `./apps/web/scripts/browser-use-local.sh --session webcheck state`
- `./apps/web/scripts/browser-use-local.sh --session webcheck screenshot apps/web/artifacts/home.png`

検証結果:

- `lint` 通過
- `typecheck` 通過
- `test` 通過（`11 passed`）
- `format` 通過
- `build` 通過
- Browser Use CLI の `doctor` と `setup` 通過
- Browser Use CLI でホーム、テーマ詳細、記事詳細、管理画面へアクセスできることを確認
- Browser Use CLI で screenshot を保存できることを確認
- 未存在のテーマ / 記事で `not-found` 表示になることを確認

保存した screenshot:

- `apps/web/artifacts/home.png`
- `apps/web/artifacts/theme-software-engineering.png`
- `apps/web/artifacts/article-se-001.png`
- `apps/web/artifacts/admin.png`

遷移確認:

- `/` → `/themes/software-engineering`
- `/themes/software-engineering` → `/articles/se-001`
- `/articles/se-001` → `/themes/software-engineering`
- `/themes/software-engineering` → `/admin`

既知事項:

- Browser Use CLI の要素 index はセッションごとに揺れるため、`click` / `select` の固定 index 指定は不安定だった
- そのため探索確認は `state` と必要に応じた `eval` で補完した
- 固定回帰テストは Playwright 側へ寄せるのが適切である

---

## 16. セルフレビュー記録

確認観点:

- 完了条件 8 項目に対する実装有無を再確認した
- 4 画面、モック取得層、状態表示、Browser Use 手順、screenshot 保存を照合した
- `docs/operations/local-development.md` と `apps/web/README.md` の手順整合を確認した
- Browser Use CLI のローカル検証結果と保存物の整合を確認した

セルフレビュー結果:

- このプランの対象範囲では完了扱いで問題ない
- Browser Use CLI の自然言語エージェント実行は未設定 API キーに依存するため、次段の補助検証項目として切り分ける
- 再現性の高い固定 E2E は Playwright で補うのが妥当である
