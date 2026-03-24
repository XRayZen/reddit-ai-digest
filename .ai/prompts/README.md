# プロンプト資産

## 1. この文書の目的
この文書は、本プロジェクトにおける
AI プロンプト資産の配置方針、命名規則、更新ルールを整理するための資料です。

関連ドキュメント:
- `AGNETS.md`
- `docs/product/mvp-scope.md`
- `docs/architecture/overview.md`
- `docs/architecture/data-model.md`
- `.ai/evals/README.md`
- `.ai/skills/prompt-regression-check/SKILL.md`

---

## 2. 基本方針
このディレクトリには、
要約・翻訳・分類などの AI 処理に使うプロンプトを配置します。

方針:
- 役割ごとにファイルを分ける
- 1ファイル1責務を原則とする
- プロンプト変更はコード変更と同等に扱う
- 変更時は `prompt_version` の更新要否を必ず検討する
- 変更時は評価資産も確認する

---

## 3. 想定ディレクトリ構成

```text
.ai/prompts/
├── README.md
├── summarization/
│   ├── topic-summary.v1.md
│   ├── topic-summary.v2.md
│   └── README.md
├── translation/
│   ├── thread-translation.v1.md
│   └── README.md
├── classification/
│   ├── stance-label.v1.md
│   └── README.md
└── shared/
    ├── output-format.md
    └── glossary.md
```

補足:
- 初期段階ではすべてを作り切る必要はなく、最小構成から開始してよい
- 共通制約や JSON 出力ルールは `shared/` に寄せると重複を減らせる

---

## 4. 置くべきプロンプトの種類

### 要約
- スレッド本文とコメントから記事向け要約を作る
- 主要論点を抽出する
- 文量や出力粒度を制御する

### 翻訳
- 英文タイトルや本文を日本語化する
- 技術用語を不自然に崩さないようにする

### 分類
- 議論傾向ラベルを付与する
- 必要に応じて追加のタグ付けを行う

### 共通
- 出力フォーマット
- 禁止事項
- 用語統一
- 文体統一

---

## 5. 命名規則

プロンプトファイル名は、
役割とバージョンが分かるようにします。

例:
- `topic-summary.v1.md`
- `thread-translation.v1.md`
- `stance-label.v1.md`

ルール:
- 役割が分かる名前にする
- バージョンを含める
- 破壊的な意味変更がある場合は新バージョンにする

---

## 6. 記述ルール

各プロンプトは、最低限以下を含むことを推奨します。

- 目的
- 入力
- 出力
- 制約
- 禁止事項
- 例が必要なら短い例

例:
- 何を読ませるか
- 何を返させるか
- どのような JSON shape にするか
- どんな誇張や断定を避けるか

---

## 7. 更新ルール

プロンプトを変更した場合は、次を確認します。

1. 変更理由が明確か
2. `prompt_version` を更新すべきか
3. 出力スキーマに影響があるか
4. 保存データに影響があるか
5. UI 表示に影響があるか
6. 評価資産を更新すべきか

詳細は `.ai/skills/prompt-regression-check/SKILL.md` を参照してください。

---

## 8. やってはいけないこと

- 役割が複数混ざった巨大プロンプトを作る
- バージョン管理なしで意味を大きく変える
- 出力 shape を変えたのに schema を更新しない
- 評価資産を更新せずに品質改善とみなす
- UI 影響を見ずに文量だけ増やす

---

## 9. 推奨事項

- 要約、翻訳、分類を分離する
- 出力 shape はできるだけ明示する
- 変更前後でサンプル比較を行う
- 共通ルールは `shared/` に寄せる
- 用語統一を維持する

---

## 10. 関連ファイル

- `.ai/evals/README.md`
- `.ai/skills/prompt-regression-check/SKILL.md`
- `packages/schemas/`
- `docs/architecture/data-model.md`
