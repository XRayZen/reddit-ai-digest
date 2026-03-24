# 評価資産

## 1. この文書の目的
この文書は、本プロジェクトにおける
AI 出力の回帰確認用資産の配置方針と運用ルールを整理するための資料です。

関連ドキュメント:
- `AGNETS.md`
- `.ai/prompts/README.md`
- `.ai/skills/prompt-regression-check/SKILL.md`
- `.ai/skills/proto-schema-review/SKILL.md`
- `docs/product/mvp-scope.md`

---

## 2. 基本方針
このディレクトリには、
プロンプト変更やモデル変更によって
出力品質が劣化していないかを確認するための
評価資産を配置します。

方針:
- golden test を持つ
- schema 検証を持つ
- 変更前後比較ができるようにする
- 代表ケースを少数でも継続管理する
- 1回の成功例だけで品質改善と判断しない

---

## 3. 想定ディレクトリ構成

```text
.ai/evals/
├── README.md
├── golden/
│   ├── summarization/
│   │   ├── case-001.json
│   │   ├── case-002.json
│   │   └── README.md
│   ├── translation/
│   └── classification/
├── schemas/
│   ├── summary-output.schema.json
│   └── README.md
├── fixtures/
│   ├── reddit-thread-001.json
│   ├── reddit-thread-002.json
│   └── README.md
└── reports/
    └── README.md
```

補足:
- MVP ではすべてを埋める必要はなく、golden と fixtures から始めてもよい
- reports は定期比較や変更レビュー結果の置き場として使える

---

## 4. 評価の種類

### golden test
代表的な入力に対して、
期待する出力傾向や最低限の品質条件を確認する。

### schema test
出力 JSON が想定 shape を満たすか確認する。

### regression check
変更前後で、
文量、論点数、ラベル、構造の崩れを比較する。

### fixture-based check
固定入力を使って
継続的に比較できるようにする。

---

## 5. 置くべきデータ

最低限、以下を持つことを推奨します。

- representative な Reddit スレッド入力
- 期待する出力 shape
- 主要論点数の期待条件
- `stance_label` の許容範囲
- 変更前後比較結果

---

## 6. ケース設計の考え方

ケースは、少数でも偏りすぎないようにします。

例:
- 長文スレッド
- コメントが多いスレッド
- 意見が割れている議論
- 技術用語が多い投稿
- ROCm など固有名詞が多い投稿

---

## 7. 更新ルール

以下の場合、評価資産の更新要否を確認します。

- プロンプトを変更した
- `prompt_version` を更新した
- モデルを変更した
- 出力スキーマを変更した
- `stance_label` の定義を変えた
- UI 表示に関わる文量制約を変えた

更新時は、
- 既存ケースに影響があるか
- 追加ケースが必要か
- schema 更新が必要か

を確認します。

---

## 8. やってはいけないこと

- golden ケースなしで大きな prompt 変更を入れる
- たまたま良かった 1 例だけで評価する
- schema を変えたのに schema test を更新しない
- 何をもって改善としたか説明できない状態で進める

---

## 9. 推奨事項

- 少数でも継続利用できる固定ケースを持つ
- 変更理由を評価観点と結びつける
- 正確性、可読性、簡潔さを分けて見る
- UI 影響も合わせて確認する
- プロンプト README と整合させる

---

## 10. 関連ファイル

- `.ai/prompts/README.md`
- `.ai/skills/prompt-regression-check/SKILL.md`
- `packages/schemas/`
- `docs/product/mvp-scope.md`
