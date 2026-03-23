# packages/schemas

## 目的
このディレクトリは、本プロジェクトで利用する
補助スキーマを管理する場所です。

対象:
- AI 出力スキーマ
- JSON Schema
- REST 用の補助スキーマ
- UI で扱う構造化データの定義
- proto 以外で管理したい構造契約

関連ドキュメント:
- `../../AGENTS.md`
- `../../docs/architecture/api.md`
- `../../docs/architecture/data-model.md`
- `../../.ai/prompts/README.md`
- `../../.ai/evals/README.md`
- `../../.ai/skills/prompt-regression-check/SKILL.md`

---

## 基本方針
- gRPC の主契約は `packages/proto` を正本とする
- `packages/schemas` は補助的な構造定義を管理する
- AI 出力の shape は schema で明示する
- schema 変更時は prompts / evals / UI 影響を確認する
- schema は意味の曖昧さを減らすために使う

---

## 想定ディレクトリ構成

```text
packages/schemas/
├── README.md
├── ai/
│   ├── summary-output.schema.json
│   ├── translation-output.schema.json
│   └── stance-output.schema.json
├── rest/
│   ├── admin-job-response.schema.json
│   └── health-response.schema.json
└── shared/
    ├── pagination.schema.json
    └── error.schema.json
```

---

## 使い分け

`packages/proto`
- gRPC service 契約
- 主処理 API の message 定義

`packages/schemas`
- AI 出力 shape
- 補助的な REST レスポンス
- UI や eval が参照する JSON 構造
- 共通エラーや pagination の補助定義

---

## AI 出力スキーマの役割

AI 出力スキーマは、以下を安定化するために置く。

- `translation_ja`
- `summary_ja`
- `key_points`
- `stance_label`

目的:
- parse 失敗を減らす
- prompt の意味変更を検知しやすくする
- eval を安定化する
- UI 崩れを減らす

---

## 変更ルール

schema を変更した場合は、必ず以下を確認する。

1. prompt 変更が必要か
2. `prompt_version` を更新すべきか
3. eval / golden test 更新が必要か
4. UI 表示に影響するか
5. 保存データに影響するか
6. API / Worker 実装に変更が必要か

詳細は `../../.ai/skills/prompt-regression-check/SKILL.md` を参照する。

---

## やってはいけないこと
- schema を変えたのに prompt や eval を確認しない
- UI 影響を見ずに文量制約を変える
- proto で表現すべき主契約を schemas 側へ逃がす
- 役割が曖昧な巨大 schema を作る
- 実装と乖離した schema を放置する

---

## このディレクトリでよくある作業
- AI 出力 schema の追加・更新
- REST 補助レスポンス schema の追加
- shared schema の再利用整理
- eval と schema の整合確認
- UI 影響の確認

---

## 完了条件
- schema の責務が明確である
- prompts / evals / UI との整合が取れている
- 関連実装が更新されている
- docs が更新されている
- セルフレビュー済みである
