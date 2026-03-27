# 虹アニメーション背景導入プラン

## 現状の分析

### 既存のスタック
- Next.js 16.2.1
- Tailwind CSS 4.2.2
- `motion` (Framer Motion) v12.38.0 - 既にインストール済み
- `tw-animate-css` v1.4.0 - CSS animation utilities

### 現在の背景構造
`src/app/globals.css` で定義済み:
- `html`: 基礎グラデーション
- `body::before`: 光の放射状グラデーション（静的）
- `body::after`: グリッドパターン

## 実装方式の検討

### 方式1: CSS Animation（推奨）
**利点**: パフォーマンス良好、実装がシンプル、追加依存なし
**方法**: `body::before` のグラデーションを CSS `@keyframes` でアニメーション

### 方式2: Motion/Framer Motion
**利点**: より複雑な制御が可能
**方法**: `motion.div` コンポーネントでオーバーレイ

### 方式3: Canvas/WebGL
**利点**: 高度なエフェクト
**欠点**: 実装複雑、オーバースペック

## 採用方案: 方式1（CSS Animation）

既存の `body::before` を拡張し、虹色グラデーションをアニメーション化する。

### 実装内容

#### 1. `src/app/globals.css` の修正

```css
/* 既存の body::before を置き換え/拡張 */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -2;
  background: linear-gradient(
    45deg,
    #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3,
    #ff0000
  );
  background-size: 400% 400%;
  animation: rainbow-flow 15s ease infinite;
  opacity: 0.15; /* 目立ちすぎないように調整 */
  filter: blur(80px); /* 柔らかいぼかし */
  pointer-events: none;
}

@keyframes rainbow-flow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

#### 2. ライトモード対応

```css
html.light body::before {
  opacity: 0.08;
  filter: blur(100px);
}
```

#### 3. Prefers-reduced-motion 対応

```css
@media (prefers-reduced-motion: reduce) {
  body::before {
    animation: none;
  }
}
```

### オプション: ユーザー設定でオン/オフ

Redux store (`ui-preferences-slice.ts`) に `rainbowBackgroundEnabled` を追加し、
ユーザーがアニメーションを無効化できるようにする。

## ファイル変更一覧

| ファイル | 変更内容 |
|---------|----------|
| `src/app/globals.css` | body::before のアニメーション追加 |
| `src/store/slices/ui-preferences-slice.ts` | 設定追加（オプション） |
| `src/app/layout.tsx` | 設定反映用クラス付与（オプション） |

## 実装手順

1. [ ] `globals.css` で `body::before` を虹アニメーションに変更
2. [ ] ライトモードでの見た目調整
3. [ ] `prefers-reduced-motion` 対応
4. [ ] 動作確認（dev server）
5. [ ] （オプション）ユーザー設定でトグル可能にする

## 注意点

- 虹色は目立ちすぎるため、`opacity` と `blur` で調整が必要
- 既存の `body::after`（グリッドパターン）はそのまま維持
- パフォーマンスに影響が出ないよう `will-change` の使用は慎重に
- テキスト読みやすさを維持（z-index: -2 で背景に固定）

## 参考デザインイメージ

- Vercel の虹色ロゴのような滑らかなグラデーション
- iOS バックグラウンドのような柔らかい色遷移
- GitHub Copilot のような控えめなアニメーション
