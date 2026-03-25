# apps/web モダン UI リフレッシュプラン

## Summary

- `apps/web` の既存 `shadcn/ui + Tailwind CSS v4 + radix-nova` 基盤を活かし、公開 UI と管理 UI を「ダークテーマ前提のニュースサイト風 UI」へ再設計する。
- 今回は MVP 範囲を超える新機能追加は行わず、既存の 4 画面と主要導線を維持したまま、レイアウト、情報密度、状態表現、ナビゲーション、レスポンシブ体験を改善する。
- 実装は `apps/web/.agents/skills/shadcn/SKILL.md` と `apps/web/.claude/skills/shadcn/SKILL.md` のルールを前提に進め、既存の手作りマークアップを `shadcn` の合成パターンへ寄せる。
- さらに、スクロール時の reveal / parallax / progress 表現を小さく導入し、静止状態でも成立する UI を壊さない範囲で現代的な体験を追加する。
- 影響範囲は `globals.css` のダークトークン調整、theme provider、共通 UI、ホーム、テーマ詳細、記事詳細、管理画面、scroll animation 基盤、Storybook / golden / E2E、関連ドキュメント更新までを含む。

## Implementation Notes

- 2026-03-24 時点の実装では `next-themes` を導入し、`defaultTheme="dark"` / `enableSystem={false}` の dark-first 構成を採用した。
- motion は `Reveal` と `ScrollProgress` に限定し、page や大半の表示 component は Server Component / pure component のまま維持した。
- `ThemeDetailClient` の controls は `shadcn` `Select` へ置き換え、native `select` 依存を解消した。
- visual baseline は実装完了後に更新し、`apps/web/scripts/check-all-local.sh` まで通過済みとした。
- 手動確認用 screenshot は `apps/web/artifacts/` に保存した。

## Current State

- `apps/web` は Next.js 16 / React 19 / App Router / RSC 構成で、取得責務は page に閉じており、feature component 側に表示責務を寄せられている。
- `shadcn` はすでに導入済みで、`corepack pnpm dlx shadcn@latest info --json` では `style: radix-nova`、`tailwindVersion: v4`、導入済み component は `alert`、`badge`、`button`、`card`、`empty`、`select`、`separator`、`skeleton`、`table` だった。
- ただし現状は dark theme の基盤が未整備で、`next-themes`、theme provider、`html` への `suppressHydrationWarning` はまだ入っていない。
- `motion` も未導入で、スクロール連動アニメーションや in-view reveal の共通基盤はない。
- 一方で画面レベルでは独自クラスと素の HTML がまだ多い。
  - `Header` は独自ラッパー中心
  - `ThemeDetailClient` はネイティブ `select`
  - `ArticleDetailView` と `AdminDashboard` は大きな手作り hero section を持つ
  - `ArticleDetailView` の key points は `space-y-*` を使っており、shadcn skill の spacing ルールとずれる
- フォント構成はすでに良いため、今回は typography を活かしつつ、暖色系から dark-first の寒色寄りまたは neutral 寄りトークンへ再設計する。
- E2E は `home -> theme detail -> article detail -> admin` を固定しており、今回のリフレッシュでもこの導線と見出し・主要文言はなるべく壊さない方が安全である。

## Design Goals

- ダークテーマでもコントラスト不足や「真っ黒なだけ」の UI にせず、背景レイヤ、ガラス感、アクセント色で深さを出す。
- 一覧画面は「閲覧を進めたくなる密度」にし、カードの階層と導線を明確にする。
- 詳細画面は「読ませる」ことを優先し、タイトル、メタ情報、要約、翻訳、主要論点の視線移動を短くする。
- 管理画面は「運用 UI」として見せ、公開画面と同じ見た目の延長に置きすぎない。
- スクロール演出は「見せるためのアニメーション」ではなく、視線誘導と階層の補助に使う。
- ページは reduced motion 環境でも自然に使え、アニメーションが無効でも情報構造が崩れない。
- `shadcn` の semantic token と variant を優先し、 raw color や ad-hoc な装飾を増やさない。

## Non-Goals

- MVP 範囲外の新機能追加
- API 契約変更
- Redux state の責務拡張
- 初回リフレッシュ時点でのテーマ切替 UI 実装
- monorepo 全体のデザインシステム化

## Decision Notes

- テーマ基盤は `next-themes` を使う。
  - `shadcn` の Next.js dark mode guide が `next-themes` と `html suppressHydrationWarning` を案内しているため、既存 `shadcn` 基盤との整合がよい。
  - 初期実装は dark-first とし、`defaultTheme="dark"`、`enableSystem={false}` を基本案にする。
  - これはユーザー要望の「見た目はダークテーマ」を最短で満たすためであり、将来の toggle 追加余地は残る、という判断。
- デザインの起点は引き続き `src/app/globals.css` の CSS variables に置く。
  - `:root` と dark state 用 selector の両方で token を管理し、Tailwind v4 の `@theme inline` を正本にする。
  - `color-scheme: dark` も合わせて整える。
- 画面構成は `Card`、`Badge`、`Alert`、`Empty`、`Separator`、`Select`、`Table` など既存 primitive の合成を優先する。
- `apps/web/.agents/skills/shadcn/SKILL.md` のルールをそのまま適用する。
  - `space-y-*` を避けて `gap-*` を使う
  - status 表現は `Badge` variant を優先する
  - empty state は `Empty` を優先する
  - new component が必要ならまず `shadcn search` と `shadcn docs` で確認する
- スクロールアニメーションは `motion` を使う。
  - `useInView` は once 指定で section reveal に使う。
  - `useScroll` と `useSpring` は page progress bar や sticky header の微小変化に限定する。
  - `useReducedMotion` を必須前提にし、transform を opacity 中心へ落とせる構成にする。
- `Header` と各画面 hero section は統一感を持たせるが、全部を同じ見た目にしない。
  - 公開画面は editorial
  - 管理画面は operational
- E2E 安定性を考え、主要見出し、日本語ラベル、リンク文言は必要以上に変えない。
- motion を使うために `use client` を全画面へ広げない。
  - `Reveal`
  - `ScrollProgress`
  - 必要なら `ParallaxPanel`
  だけを client component とし、page と大半の表示 component は Server Component / pure component のまま保つ。

## Web Research Notes

- `shadcn` の Next.js dark mode guide は `next-themes` の導入、theme provider 作成、root layout での `suppressHydrationWarning` を案内している。
- `next-themes` README でも App Router で `ThemeProvider` を使う場合、`html suppressHydrationWarning` が必要とされている。
- Tailwind の dark mode docs は、`.dark` class または `data-theme="dark"` を使った手動切替を案内している。`next-themes` の `attribute="class"` はこの方針にそのまま乗る。
- Motion の docs では、`useInView` は軽量な viewport 検知 hook とされ、`once: true` で一度きりの reveal に向いている。
- Motion の `useScroll` docs は `scrollYProgress` を progress bar や sticky header の変化に使う例を示している。
- Motion の `useReducedMotion` docs は、ユーザーが reduced motion を有効にしている場合に transform を抑える構成を推奨している。
- Next.js の accessibility docs でも、アニメーション時には `prefers-reduced-motion` を使うことが推奨されている。

## UI Audit

### 1. Header / Navigation

- 現状:
  - 主要導線はあるが、ブランド、現在地、操作の優先度が弱い。
- 改善方針:
  - ダーク背景で sticky header が映える構成にし、スクロール時に高さや背景密度が少し変わる設計を検討する。
  - ブランド領域とナビゲーション領域のコントラストを整理する。
  - 必要なら active state を導入する。
  - モバイルで押しやすい余白と並びへ調整する。

### 2. Home

- 現状:
  - 上段は情報が少なく、2 枚カード構成がやや均質。
- 改善方針:
  - 上段 hero に「何を読むサービスか」と「いま読める領域」を一度で伝える。
  - テーマ一覧の前に editorial 的なサマリー帯か stats 帯を置き、スクロールで softly reveal する。
  - `ThemeCard` の視線誘導と hover 体験を強化する。

### 3. Theme Detail

- 現状:
  - 画面上部と一覧制御部がともに大きな箱で、情報の優先度差が弱い。
  - 並び替え / フィルタがネイティブ `select` のまま。
- 改善方針:
  - hero をコンパクトにし、制御バーと記事一覧の関係を明確にする。
  - `Select` component へ置き換え、controls を `Card` 内の小さな toolbar として整理する。
  - 記事件数や現在の絞り込み状態が分かる補助情報を追加する。
  - 記事カードは段階的 reveal の対象にするが、1 枚ごとに大きく跳ねる演出は避ける。

### 4. Article Detail

- 現状:
  - 読み物としての導線はあるが、hero の占有面積が大きく、本文ブロックとのつながりが弱い。
  - key points は独自リスト構成で、shadcn skill の spacing 指針ともずれる。
- 改善方針:
  - headline、メタ情報、原文リンクをよりコンパクトに整理する。
  - translation / summary を「比較して読める」構成にする。
  - key points を card/list composition に寄せる。
  - hero 背景や見出しに scroll-linked な微小変化を与える場合も、本文の可読性を優先する。
  - 次アクションを「テーマへ戻る」だけでなく、文脈付きの導線として見せる。

### 5. Admin

- 現状:
  - 公開 UI の延長にあり、管理用の機能密度がやや弱い。
- 改善方針:
  - 操作カード、状態表示、履歴テーブルを「運用面」として再配置する。
  - action 状態の見せ方を badge だけに頼らず、必要なら alert / description を併用する。
  - ジョブ履歴テーブルの列密度と見出しの hierarchy を調整する。
  - 公開画面より motion は抑え、操作に対する feedback を優先する。

## Proposed Implementation Changes

### 1. Dark theme foundation

- `apps/web/package.json` に `next-themes` を追加する。
- `src/components/theme-provider.tsx` を追加する。
- `src/app/layout.tsx` に以下を反映する。
  - `<html suppressHydrationWarning>`
  - `ThemeProvider`
  - dark-first の既定設定
- `src/app/globals.css` を dark-first に再構成する。
  - dark 用 background / foreground / card / popover / border / ring / shadow token
  - `color-scheme: dark`
  - 背景グラデーションと光彩レイヤ
  - 明度差だけでなく彩度差でも hierarchy を作る

### 2. Motion foundation

- `apps/web/package.json` に `motion` を追加する。
- 共通 animation wrapper を追加する。
  - `Reveal`
  - `ScrollProgress`
  - 必要なら `ParallaxPanel`
- ルール:
  - default は短い fade + translateY
  - `once: true`
  - reduced motion 時は opacity のみ、または無動作
  - 長い sequence や continuous parallax は避ける

### 3. Visual foundation refresh

- `src/app/globals.css` の token と layout utility を見直す。
  - 背景グラデーション
  - card / popover の透過度
  - border / shadow のコントラスト
  - 画面上下余白
  - ダーク背景に対する text / muted / accent の読みやすさ
- 既存の `shell`、`page-shell`、`eyebrow` は全廃せず、再利用範囲を絞る。
- 必要なら `surface-*` のような再利用 utility class を少数追加する。

### 4. Shared component cleanup

- 対象:
  - `Header`
  - `SectionHeader`
  - `Tag`
  - `EmptyState`
  - `ErrorMessage`
  - `LoadingSkeleton`
- 方針:
  - `Card` / `Badge` / `Alert` / `Skeleton` の合成へ寄せる。
  - `space-y-*` を `flex flex-col gap-*` へ置き換える。
  - 視認性に必要な装飾だけ残し、 class の役割を減らす。
  - `Header` には scroll progress または scroll direction を使った小さな変化を許容する。

### 5. Home refresh

- 対象:
  - `HomeScreen`
  - `ThemeGrid`
  - `ThemeCard`
- 方針:
  - hero とテーマ一覧の間に hierarchy を作る。
  - `ThemeCard` を「閲覧対象のカテゴリーカード」として再設計する。
  - card footer や補助メタを追加する場合も、MVP 範囲外の実データ要求は増やさない。
  - hero、stats、theme grid に段階的 reveal を導入する。

### 6. Theme detail refresh

- 対象:
  - `ThemeDetailClient`
  - `ArticleList`
  - `ArticleCard`
- 方針:
  - controls を `Select` 利用へ置き換える。
  - filter / sort / 件数表示をひとまとまりの toolbar として構成する。
  - `ArticleCard` はタイトル、要約、ラベル、戻り導線の強弱を見直す。
  - 画面ロード直後のカード群には stagger を使う場合でも 100ms 前後の短い差に留める。

### 7. Article detail refresh

- 対象:
  - `ArticleDetailView`
- 方針:
  - hero を compact にしつつ、記事の存在感は typography で確保する。
  - translation / summary / key points を読みやすい editorial layout に再構成する。
  - raw list 表現が続く箇所は `Separator` や card group で読点を作る。
  - sticky な reading progress 表現を追加する候補を含める。

### 8. Admin refresh

- 対象:
  - `AdminDashboard`
- 方針:
  - action area を command panel に近い見せ方へ寄せる。
  - progress / pending / success の状態表現を整理する。
  - job table は情報密度を保ちつつ、status の視認性を上げる。
  - admin は reveal を最小限にし、操作 feedback を優先する。

### 9. Potential shadcn additions

- 追加候補:
  - `tabs`
  - `input`
  - `textarea`
  - `sonner`
  - `sheet`
- ただし追加は必要最小限に留める。
  - 追加前に `corepack pnpm dlx shadcn@latest search`
  - 使用前に `corepack pnpm dlx shadcn@latest docs <component>`
  - 既存 component の variant / composition で足りるなら新規追加しない

### 10. Metadata and browser polish

- dark-first に合わせ、必要なら browser UI 向け metadata / manifest も確認する。
- Next.js の現行 docs では `metadata.themeColor` は deprecated で、`viewport` 設定の利用が案内されているため、必要ならその方針に従う。
- ただし今回の主目的は UI refresh であり、metadata 変更は最小限に留める。

## Test Plan

- 変更前に visual / E2E の baseline との差分を確認する。
- 可能ならコンポーネント単位で先に story / test を触り、実装を進める。
- motion 追加後は reduced motion でも読めることを確認する。
- dark-first 化後は contrast と focus ring の視認性を確認する。
- 実装後は以下を実行する。
  - `corepack pnpm --filter @reddit-ai-digest/web typecheck`
  - `corepack pnpm --filter @reddit-ai-digest/web lint`
  - `corepack pnpm --filter @reddit-ai-digest/web test`
  - `corepack pnpm --filter @reddit-ai-digest/web test:storybook`
  - `corepack pnpm --filter @reddit-ai-digest/web test:golden`
  - 必要に応じて `corepack pnpm --filter @reddit-ai-digest/web test:golden:update`
  - `corepack pnpm --filter @reddit-ai-digest/web test:e2e`
  - `apps/web/scripts/check-all-local.sh`
- 手動確認:
  - ホーム、テーマ詳細、記事詳細、管理画面でダーク背景の可読性を確認
  - `prefers-reduced-motion` 有効時に過剰な transform が消えることを確認
  - モバイル幅で sticky header や progress bar が邪魔にならないことを確認

## Risks

- dark-first 化により、既存の light 前提の component variant が一部読みづらくなる可能性がある。
- 見た目変更が大きいため、golden snapshot 差分が広範囲に出る可能性が高い。
- hero 見出しや文言を大きく変えすぎると、既存 E2E のロケータが壊れる。
- `ThemeDetailClient` の control 置き換えで `use client` 範囲や Redux 連携が崩れると回帰しやすい。
- motion を各画面へ直接書き散らすと client 化が広がり、RSC の利点を削る。
- scroll-linked animation を強くしすぎると、記事詳細の可読性とパフォーマンスを落とす。
- reduced motion 対応が漏れると、アクセシビリティ要件に反する。
- public UI と admin UI を同じ調子で整えすぎると、運用画面の識別性が落ちる。

## Acceptance Criteria

- `apps/web` の主要 4 画面が dark-first の見た目へ移行し、既存導線を維持したまま、情報設計と視認性の改善を感じられる。
- theme provider と dark theme 基盤が入り、SSR/CSR の hydration warning を避けられる構成になっている。
- scroll animation は導線を邪魔せず、reveal / progress / subtle parallax の範囲に収まっている。
- reduced motion 時に主要 animation が穏当な fallback を持っている。
- 共通 UI と画面 UI が `shadcn` の composition rules により整い、独自マークアップ依存が減っている。
- `ThemeDetailClient` の controls が `shadcn` component ベースになっている。
- `ArticleDetailView` と `AdminDashboard` の手作り hero / panel が整理され、読みやすさと運用性が向上している。
- `globals.css` の token が見直され、テーマ変更の正本が引き続き CSS variables に保たれている。
- Storybook / golden / E2E を含む Web 品質チェックが通る。
- 関連ドキュメントと完了記録を更新できる状態になっている。

## Open Questions

- dark-first のまま固定するか、実装時点で hidden toggle まで入れるか。
- `Header` に active navigation 表現を入れるか。
- Home に stats / editorial strip を入れる場合、既存 mock data だけで十分か。
- Admin に `Alert` や `sonner` を入れるか、それとも現在の badge 中心のまま抑えるか。
- scroll progress bar を全画面共通にするか、記事詳細だけに限定するか。
- golden snapshot 更新を 1 回でまとめるか、段階的に行うか。

## References

- `AGENTS.md`
- `apps/web/AGENTS.md`
- `apps/web/README.md`
- `docs/product/mvp-scope.md`
- `docs/architecture/overview.md`
- `docs/operations/local-development.md`
- `docs/plans/Complete/shadcn-web-introduction-plan.md`
- `docs/plans/Complete/web-playwright-user-flow-e2e-plan.md`
- `apps/web/.agents/skills/shadcn/SKILL.md`
- `apps/web/.claude/skills/shadcn/SKILL.md`
- shadcn dark mode for Next.js: https://ui.shadcn.com/docs/dark-mode/next
- next-themes README: https://github.com/pacocoursey/next-themes
- Motion `useInView`: https://motion.dev/docs/react-use-in-view
- Motion `useScroll`: https://motion.dev/docs/react-use-scroll
- Motion `useReducedMotion`: https://motion.dev/docs/react-use-reduced-motion
- Tailwind dark mode: https://tailwindcss.com/docs/dark-mode
- Next.js accessibility: https://nextjs.org/docs/architecture/accessibility

## Completion Record

- 完了日: 2026-03-25
- 対象範囲:
  - dark-first theme 基盤
  - scroll progress / reveal 基盤
  - Home / Theme Detail / Article Detail / Admin の UI refresh
  - Storybook / golden / E2E による回帰確認
- 完了判定の理由:
  - `next-themes` による dark-first 構成が [apps/web/src/app/layout.tsx](/home/kojima/ドキュメント/reddit-ai-digest/apps/web/src/app/layout.tsx) と [apps/web/src/components/theme-provider.tsx](/home/kojima/ドキュメント/reddit-ai-digest/apps/web/src/components/theme-provider.tsx) に反映されている
  - トークン刷新が [apps/web/src/app/globals.css](/home/kojima/ドキュメント/reddit-ai-digest/apps/web/src/app/globals.css) に反映されている
  - `Reveal` / `ScrollProgress` が [apps/web/src/components/reveal.tsx](/home/kojima/ドキュメント/reddit-ai-digest/apps/web/src/components/scroll-progress.tsx) に実装されている
  - 主要 4 画面の刷新が [apps/web/src/features/home/components/home-screen.tsx](/home/kojima/ドキュメント/reddit-ai-digest/apps/web/src/features/home/components/home-screen.tsx), [apps/web/src/features/themes/components/theme-detail-client.tsx](/home/kojima/ドキュメント/reddit-ai-digest/apps/web/src/features/themes/components/theme-detail-client.tsx), [apps/web/src/features/articles/components/article-detail-view.tsx](/home/kojima/ドキュメント/reddit-ai-digest/apps/web/src/features/articles/components/article-detail-view.tsx), [apps/web/src/features/admin/components/admin-dashboard.tsx](/home/kojima/ドキュメント/reddit-ai-digest/apps/web/src/features/admin/components/admin-dashboard.tsx) に反映されている
  - `apps/web` の一括品質チェックが通過した

## Verification Record

- 実施日: 2026-03-25
- 実行コマンド:
  - `./apps/web/scripts/check-all-local.sh`
- 検証結果:
  - `typecheck`: pass
  - `lint`: pass
  - `test`: 12 files / 38 tests pass
  - `test:storybook`: pass
  - `test:golden`: 9 pass
  - `test:e2e`: 3 pass
  - `format`: pass
- 補足:
  - 一度目の実行では [apps/web/src/lib/api/live-content-api.ts](/home/kojima/ドキュメント/reddit-ai-digest/apps/web/src/lib/api/live-content-api.ts) と [apps/web/tests/live-content-api.test.ts](/home/kojima/ドキュメント/reddit-ai-digest/apps/web/tests/live-content-api.test.ts) の `Prettier` 差分で停止した
  - 上記 2 ファイルは整形のみを適用し、再実行で完走した
  - Storybook build 時に `unable to find package.json for radix-ui` と chunk size warning は出るが、今回の完了判定では build / test の失敗要因ではなかった

## Self Review Record

- 実施日: 2026-03-25
- 確認内容:
  - 計画書内の「未導入」前提記述と実装済み記述が混在していたため、完了判定は文書本文ではなく実装実態と検証結果を優先した
  - `ThemeDetailClient` の control が `shadcn` `Select` に置き換わっていることを確認した
  - reduced motion 前提の E2E / golden が維持されていることを確認した
  - このターンで行ったコード変更は [apps/web/src/lib/api/live-content-api.ts](/home/kojima/ドキュメント/reddit-ai-digest/apps/web/src/lib/api/live-content-api.ts) と [apps/web/tests/live-content-api.test.ts](/home/kojima/ドキュメント/reddit-ai-digest/apps/web/tests/live-content-api.test.ts) の整形のみで、ロジック変更は加えていない
- 引き継ぎ:
  - Storybook build の warning は残っているため、将来 CI ノイズを減らすなら別タスクで扱う
