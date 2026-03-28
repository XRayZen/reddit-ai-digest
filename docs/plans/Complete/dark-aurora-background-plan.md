# Dark Aurora Background Plan

## 1. この文書の目的
この文書は、`apps/web` の dark-first な公開 UI に対して、薄い虹がゆっくり流れる aurora 背景を追加するための実装計画をまとめるものである。

目的は、既存の editorial / glassmorphism トーンを崩さず、背景だけで読後感を底上げすることである。主役は引き続きカード、見出し、本文であり、背景演出は補助レイヤに留める。

関連ドキュメント:
- `AGENTS.md`
- `apps/web/AGENTS.md`
- `README.md`
- `docs/product/mvp-scope.md`
- `docs/architecture/overview.md`
- `docs/operations/local-development.md`
- `apps/web/README.md`

---

## 2. 現状 UI の観察
2026-03-28 時点の `apps/web` は、以下の dark editorial UI を採用している。

- `apps/web/components.json`
  - `shadcn/ui` の schema を使っている
  - `tailwind.cssVariables=true`
  - Tailwind CSS の正本は `src/app/globals.css`
  - `baseColor=neutral` を起点に semantic token 運用をしている
- `apps/web/src/app/globals.css`
  - 濃紺ベースの linear / radial gradient 背景
  - `body::before` の淡いシアン系グロー
  - `body::after` の細い grid texture
  - `surface-panel` の blur 付きガラス面
- `apps/web/src/app/layout.tsx`
  - `ThemeProvider` は dark default
  - 画面全体の背景は `globals.css` が正本
- Storybook baseline
  - ヒーローや記事詳細は既に高コントラストな白文字 + 濃色カードに最適化されている
  - 背景の彩度を上げすぎると、本文より背景が先に目に入るリスクが高い

したがって今回は、既存背景を全面置換するのではなく、現行の濃紺グラデーションの上に「低彩度・低不透明度・低速」の aurora 層を追加する。

---

## 3. Web 調査で採用する原則
今回の調査では、MDN、web.dev、`ui.shadcn.com` の公式ドキュメントを主な根拠とした。

### 3.1 アニメーション性能
- web.dev `How to create high-performance CSS animations`
  - アニメーション対象は原則 `transform` と `opacity` を優先する
  - layout や paint を強く発生させる property の連続アニメーションは避ける
- MDN `will-change`
  - `will-change` は常用せず、最後の手段として扱う
  - 多数要素へ恒常的に付けない

設計反映:
- aurora は pseudo-element または専用 background component の数枚レイヤで構成する
- 色や blur そのものを毎フレーム変えるのではなく、あらかじめ作ったグラデーション面を `translate` / `scale` / `rotate` と `opacity` でゆっくり動かす
- `will-change` は最初から常設しない。実測で必要な場合だけ限定導入する

### 3.2 アクセシビリティ
- MDN `prefers-reduced-motion`
  - 非本質的な動きは `reduce` 時に停止または大幅に弱める
- MDN `opacity`
  - 背景や文字の透明度変更時も十分なコントラストを維持する
  - 通常テキストは 4.5:1、大きい文字は 3:1 を下回らない前提で確認する
- MDN `prefers-reduced-transparency`
  - 実験的で Baseline ではないため、補助的対応として扱う

設計反映:
- `prefers-reduced-motion: reduce` では aurora を停止し、静的背景へ落とす
- 本文直下の面では不透明度を抑え、カード背景の可読性を崩さない
- `prefers-reduced-transparency` は progressive enhancement とし、対応ブラウザだけで背景透明度や blur を弱める

### 3.3 実装スタイル
調査上の結論として、「背景画像そのものを複雑に動かす」より「固定グラデーションを持つ大きなぼかしレイヤを少数だけ置き、それを transform で漂わせる」方式が、この UI と最も相性が良い。

### 3.4 shadcn/ui との整合
- shadcn/ui `Theming`
  - CSS variables を推奨している
  - `background`、`foreground`、`card`、`border` などの semantic token を上書きして見た目を変える思想である
- shadcn/ui `components.json`
  - `tailwind.cssVariables=true` では semantic token を `globals.css` に置く前提である
  - `tailwind.css` で指定した CSS ファイルがテーマ正本になる
- shadcn/ui `Dark Mode / Next.js`
  - `next-themes` と `ThemeProvider`、`html suppressHydrationWarning` の構成を推奨している
- shadcn/ui `Tailwind v4`
  - `@theme inline` による token 公開を前提にしている
  - dark mode colors は accessibility を意識して見直されている

設計反映:
- aurora 実装は `shadcn/ui` の primitive に背景責務を混ぜず、layout 直下の装飾 component に閉じ込める
- `Card`、`Button`、`Input` など既存 UI primitive は semantic token の消費者として扱い、背景演出の都合で class を大きく崩さない
- 背景色を足す場合も、まず `background` / `card` / `muted` / `border` など既存 token との関係を整理してから追加 token を定義する
- aurora 専用色を utility class から参照したい場合だけ `@theme inline` に公開し、単なる装飾専用変数は無理に公開しない
- `next-themes` の dark class 切替と競合しないよう、dark/light 別値は `:root` と `.light` または `.dark` の token レイヤで管理する

---

## 4. 今回のスコープ
この plan で実装対象にするもの:
- dark theme 向け aurora 背景の設計と導入
- `globals.css` を正本とした背景トークン整理
- layout 直下の背景レイヤ責務の追加
- `prefers-reduced-motion` とコントラスト維持
- Storybook / golden / E2E の確認観点追加

この plan で増やさないもの:
- テーマトグル UI の追加
- Canvas / WebGL / Three.js の導入
- ページ単位で異なる大規模背景演出
- 本文やカード自体への派手な虹アニメーション
- MVP 範囲を超えるブランディング全面刷新

---

## 5. 推奨デザイン方針

### 5.1 方向性
目指す見た目は「黒に近い青の夜空に、薄い虹色の膜がゆっくり流れる」程度に留める。サイバー系の強発光ではなく、読み物サイトとしての静けさを優先する。

### 5.2 色
dark theme の主背景は既存の `#07111e` 系を維持する。その上で aurora 用に以下のような補助色を CSS variable 化する。

- cyan
- teal
- blue
- indigo
- rose or amber をごく少量

制約:
- 高彩度色を全面に広げない
- warm color はアクセント扱いに留める
- 本文背後では青緑寄りを中心にし、赤紫はごく薄く使う
- `shadcn/ui` の `background` / `card` / `foreground` / `border` コントラストを壊す方向では調整しない

### 5.3 動き
動きは 2 層または 3 層までに抑える。

- layer A
  - 左上から中央へゆっくり流れる
- layer B
  - 右上から対角へ逆方向に漂う
- optional layer C
  - 下辺に広い薄膜として置き、ほぼ静止に近い速度で揺らす

制約:
- duration は長めにし、短周期ループにしない
- 速度差は小さくする
- scale と translate の合成は許容するが、大きな zoom 感は出さない

---

## 6. 推奨アーキテクチャ

### 6.1 責務分離
背景実装は次の 2 層に分ける。

1. `globals.css`
- 色変数
- keyframes
- reduced motion / reduced transparency ルール
- 最低限の共通 utility class
- `shadcn/ui` theme token と aurora 専用 token の境界

2. 新規 background component
- 例: `apps/web/src/components/aurora-background.tsx`
- layout 直下に 1 回だけ置く
- 複数レイヤの DOM を閉じ込める
- `aria-hidden="true"` と `pointer-events: none` を徹底する

この分離により、`body::before` と `body::after` へ演出を過密に寄せず、背景責務を読みやすく保つ。
また、`shadcn/ui` の primitive を背景専用調整で汚さずに済む。

### 6.2 DOM 構成案
`RootLayout` の `body` 直下で、`ThemeProvider` の内側に背景 component を差し込む。

想定構成:

```tsx
<ThemeProvider ...>
  <StoreProvider>
    <AuroraBackground />
    <ScrollProgress />
    <main className="page-shell">...</main>
  </StoreProvider>
</ThemeProvider>
```

理由:
- theme class 変更に追従しやすい
- ページ component を汚さない
- z-index と stacking context を layout で統一できる

### 6.3 CSS 実装案
aurora は以下の構成を推奨する。

- ベース背景
  - 既存 `html` / `body::before` / `body::after` を活かす
- aurora wrapper
  - `position: fixed; inset: 0; z-index: -2 or 0` を layout 全体で整合
- aurora layer
  - 絶対配置の大きな楕円面
  - `radial-gradient(...)` を持つ
  - `filter: blur(...)` は静的に適用
  - `mix-blend-mode` は使うとしても限定的に検証し、初版では通常合成を優先する
- veil layer
  - 最上面に薄い dark veil を 1 枚置き、色が強く出すぎるのを抑える

初版では `background-position` や gradient stop 自体のアニメーションは避ける。

shadcn/ui 前提の補足:
- 既存の `bg-background`、`bg-card`、`text-foreground`、`border-border` を使う component 群はできるだけそのまま活かす
- aurora 演出のために `ui/card.tsx` や `ui/button.tsx` の base class を広範囲に変更しない
- どうしても surface 側調整が必要な場合は token 側、次に page-level wrapper 側、最後に primitive 側の順で検討する

---

## 7. 実装フェーズ

### Phase 1: 背景トークン整理
- `globals.css` に aurora 用 CSS variables を追加する
- dark theme 正本を優先し、light theme は壊さない最小追従に留める
- 既存 `body::before` との役割重複を整理する

完了条件:
- 既存面の色と競合しない変数名が揃う
- `globals.css` だけ読んで背景レイヤの責務が追える

### Phase 2: 背景 component 追加
- `AuroraBackground` を追加する
- fixed full-screen の装飾要素を 2〜3 枚に限定する
- layout に差し込む

完了条件:
- 全ページで同じ背景演出が適用される
- クリック、選択、スクロールを阻害しない

### Phase 3: motion と accessibility
- `prefers-reduced-motion` で animation を停止または静止に近い値へ落とす
- 必要なら `prefers-reduced-transparency` を補助導入する
- 本文やカードのコントラストを再調整する

完了条件:
- reduced motion で背景が実質静止する
- ヒーロー本文、記事本文、管理 UI の可読性が維持される

### Phase 4: 回帰確認
- Storybook baseline を更新する
- golden snapshot を更新する
- `./apps/web/scripts/check-all-local.sh` を通す
- desktop / mobile 幅で見た目を確認する

完了条件:
- 意図した差分だけが visual regression に出る
- 主要ページで背景がうるさくなっていない

---

## 8. 変更対象ファイル案

必須:
- `apps/web/src/app/globals.css`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/components/aurora-background.tsx` 新規

必要に応じて:
- `apps/web/components.json`
  - 変更は原則不要だが、plan 上の正本確認対象として扱う
- `apps/web/tests/golden/storybook.visual.spec.ts-snapshots/*`
- `apps/web/src/features/home/components/home-screen.stories.tsx`
- `apps/web/src/features/articles/components/article-detail-view.stories.tsx`
- `apps/web/README.md`

補足:
- 背景がカード境界を食う場合のみ `Card` 周辺の border / shadow / overlay を微調整する
- ページ component 側へ背景専用 class を散らさない
- `components.json` の `cssVariables` / `css` 前提を崩す変更は行わない

---

## 9. 性能ガードレール
実装時は次を守る。

- 同時に動かす aurora レイヤは最大 3 枚
- animation は `transform` と `opacity` を中心にする
- `filter: blur(...)` は静的に置き、blur 値自体はアニメーションしない
- `will-change` は初版で常設しない
- モバイルでは layer 数、サイズ、opacity を下げる
- header、scroll progress、card hover など既存 motion と干渉させない

必要なら後続で確認する項目:
- Chrome DevTools Performance で paint 負荷を確認
- 低スペック端末相当の scroll jank の有無

---

## 10. アクセシビリティガードレール

- 背景装飾要素はすべて `aria-hidden="true"`
- 背景により本文コントラストが落ちる箇所は `card` または `veil` 側で吸収する
- `prefers-reduced-motion: reduce` では非本質アニメーションを止める
- `prefers-reduced-transparency` は対応ブラウザでのみ透明度低減に使う
- `focus` ring、selection、ボタン hover が背景色に埋もれないことを確認する

---

## 11. テストと確認

### 11.1 自動確認
- `corepack pnpm --filter @reddit-ai-digest/web lint`
- `corepack pnpm --filter @reddit-ai-digest/web typecheck`
- `corepack pnpm --filter @reddit-ai-digest/web test`
- `corepack pnpm --filter @reddit-ai-digest/web test:golden`
- `corepack pnpm --filter @reddit-ai-digest/web test:e2e`
- `./apps/web/scripts/check-all-local.sh`

### 11.2 手動確認
- Home
  - ヒーロー背面で文字がにじまない
- Theme detail
  - 一覧カードの境界線が埋もれない
- Article detail
  - 長文本文の視線追従を邪魔しない
- Admin
  - 表やフォームの境界が弱くならない
- Mobile
  - aurora が過剰に広がらず、スクロール時に気が散らない
- Reduced motion
  - OS 設定変更後に背景が静止する

---

## 12. リスクと対策

リスク:
- 背景が強すぎて editorial UI より装飾が先に立つ
- blur と複数面の重なりで paint コストが増える
- glass panel の境界が背景色に埋もれる
- header の sticky 面と背景の干渉で視認性が落ちる
- `shadcn/ui` primitive の semantic token が背景専用調整で崩れ、他画面へ副作用が広がる

対策:
- 初版は彩度より面積と速度を抑える
- warm color は少量に限定する
- dark veil を 1 枚入れて全体の発色を抑える
- まず Home と Article detail を基準に調整し、Admin は可読性優先で確認する
- 色調整は primitive 直編集より `globals.css` の token と背景 layer で吸収する

---

## 13. 実装順の提案
着手順は以下を推奨する。

1. `globals.css` の背景トークンと keyframes 追加
2. `AuroraBackground` component 作成
3. `layout.tsx` へ組み込み
4. Home / Article detail の見た目調整
5. reduced motion / transparency の調整
6. golden 更新とセルフレビュー

---

## 14. 調査ソース
- shadcn/ui: `Theming`
  - https://ui.shadcn.com/docs/theming
- shadcn/ui: `Next.js Dark Mode`
  - https://ui.shadcn.com/docs/dark-mode/next
- shadcn/ui: `components.json`
  - https://ui.shadcn.com/docs/components-json
- shadcn/ui: `Tailwind v4`
  - https://ui.shadcn.com/docs/tailwind-v4
- MDN: `prefers-reduced-motion`
  - https://developer.mozilla.org/en-US/docs/Web/CSS/%40media/prefers-reduced-motion
- web.dev: `How to create high-performance CSS animations`
  - https://web.dev/articles/animations-guide
- MDN: `will-change`
  - https://developer.mozilla.org/en-US/docs/Web/CSS/will-change
- MDN: `translate()`
  - https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/translate
- MDN: `opacity`
  - https://developer.mozilla.org/en-US/docs/Web/CSS/opacity
- MDN: `prefers-reduced-transparency`
  - https://developer.mozilla.org/en-US/docs/Web/CSS/%40media/prefers-reduced-transparency
