# packages/proto

## 目的
このディレクトリは、本プロジェクトにおける
gRPC / Protocol Buffers の契約定義を管理する場所です。

このディレクトリの正本:
- gRPC service 定義
- request / response message 定義
- 内部 API 契約
- 将来の内部サービス境界

関連ドキュメント:
- `../../AGENTS.md`
- `../../docs/architecture/api.md`
- `../../docs/adr/architecture-decisions.md`
- `../../docs/development/coding-rules-backend.md`
- `../../.ai/skills/proto-schema-review/SKILL.md`

---

## 基本方針
- `.proto` を内部契約の正本として扱う
- 主処理は gRPC を優先する
- service と message は責務ごとに分ける
- version を意識したディレクトリ構成にする
- proto 変更時は生成コード、実装、テスト、docs を更新する

---

## 想定ディレクトリ構成

```text
packages/proto/
├── README.md
├── theme/
│   └── v1/
│       └── theme.proto
├── article/
│   └── v1/
│       └── article.proto
├── ingestion/
│   └── v1/
│       └── ingestion.proto
├── summarization/
│   └── v1/
│       └── summarization.proto
└── admin/
    └── v1/
        └── admin.proto
```

---

## 配置ルール
- ドメインごとにディレクトリを分ける
- `v1` のように version をディレクトリに含める
- 1つの proto に複数責務を詰め込みすぎない
- 管理用 service と公開系 service を混ぜすぎない

---

## 命名ルール
- package 名は責務と version が分かるようにする
- service 名は役割を明確にする
- message 名は request / response を明示する
- field 名は意味が分かる名前にする

例:
- `ArticleService`
- `ListArticlesRequest`
- `GetArticleResponse`

---

## 変更ルール

proto を変更した場合は、必ず以下を確認する。

1. field number を壊していないか
2. breaking change ではないか
3. 生成コード更新が必要か
4. API / Worker / Web へ影響するか
5. 関連テスト更新が必要か
6. docs 更新が必要か

詳細は `../../.ai/skills/proto-schema-review/SKILL.md` を参照する。

---

## やってはいけないこと
- field number を安易に付け替える
- 削除済み field を無計画に再利用する
- proto だけ直して生成コードを更新しない
- 役割の異なる service を1ファイルに詰め込む
- 管理用途の REST 都合を proto に引きずり込みすぎる

---

## このディレクトリでよくある作業
- 新しい gRPC service の追加
- request / response message の追加
- field の追加
- version 増設
- code generation 対応
- API / Worker 側実装との同期

---

## 完了条件
- proto の責務が明確である
- 互換性を壊していない
- 生成コード更新が反映されている
- 実装とテストが更新されている
- docs が更新されている
- セルフレビュー済みである
