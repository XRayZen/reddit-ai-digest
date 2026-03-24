---
name: proto-schema-review
description: Protocol Buffers / gRPC の schema 変更時に、互換性・生成コード・実装影響・テスト更新を確認するためのレビュー手順
---

# proto-schema-review

## 1. 目的
この Skill は、`.proto` 変更時に
破壊的変更や更新漏れを防ぐための標準レビュー手順を提供する。

対象:
- `packages/proto/**/*.proto`
- gRPC service 定義
- message 定義
- enum 定義
- Web / API / Worker に影響する schema 変更

---

## 2. この Skill を使う場面
次のいずれかに当てはまる場合、この Skill を使う。

- 新しい gRPC service を追加する
- 既存 service に RPC を追加・変更する
- message に field を追加・変更・削除する
- enum を変更する
- proto の version を上げる
- コード生成物や API 契約に影響がある

使わない場面:
- proto に触れない単純な UI 修正だけを行う場合
- 生成コードのみが更新され、schema 自体に差分がない場合

---

## 3. 作業開始前ルール
実装前に必ず短い plan を提示する。

plan に含める項目:
- 変更対象 proto
- 変更理由
- 互換性への影響
- 生成コードへの影響
- API / Worker / Web への影響
- 必要なテスト更新

承認を得る前に実装を始めない。

補足:
- proto 変更は契約変更として扱う
- 実装都合だけで schema を決めず、利用側の互換性と運用影響を先に整理する

---

## 4. proto レビュー観点
### 4.1 互換性
- 既存 field number を変更していないか
- 既存 field を別の意味で再利用していないか
- 削除した field number / name は予約が必要か
- client / server の片側だけ更新されても壊れないか
- breaking change が本当に必要か

### 4.2 message 設計
- field 名は意味が明確か
- optional / repeated / nested message の使い方は妥当か
- 過度に巨大な message になっていないか
- 将来拡張しやすい形か
- `Any` のような曖昧な型に逃げすぎていないか

### 4.3 service 設計
- service 名は責務に合っているか
- RPC 名は意図が明確か
- request / response は対称的で分かりやすいか
- pagination や filtering が必要な場面で考慮されているか
- 管理系 REST にすべきものを proto に混ぜていないか

### 4.4 versioning
- バージョン付き package / path を守っているか
- breaking change なら version を分けるべきではないか
- 安易に既存 contract を壊していないか

### 4.5 Web 連携
- ブラウザ経由で使う message として過不足がないか
- TypeScript 生成や gateway/BFF 変換で扱いにくい構造になっていないか
- 一覧取得でページングやフィルタ条件が不足していないか

---

## 5. 実装確認手順
1. 変更した `.proto` を確認する
2. field number と field name の変更有無を確認する
3. service / method 追加が責務に合っているか確認する
4. 生成コードを更新する
5. API 実装側の handler / service を更新する
6. Worker / Web 影響を確認する
7. テストを更新する
8. 関連ドキュメントを更新する
9. セルフレビューを行う

追加で確認すること:
- 生成物の差分に想定外の変更が混ざっていないか
- エラーコードやバリデーション方針が既存 API とずれていないか
- API 呼び出し側のモック、fixture、golden data の更新漏れがないか

---

## 6. 注意点
### 6.1 やってはいけないこと
- field number の付け替え
- 削除した field の無計画な再利用
- proto 更新だけして生成コードを更新しない
- 生成コード更新だけして実装やテストを直さない
- breaking change を無説明で混ぜる

### 6.2 推奨事項
- 追加変更を優先し、破壊的変更を避ける
- 変更理由を PR に明記する
- 互換性に迷う場合は version 分離を検討する
- schema の正本は proto であることを維持する
- enum は未知値や将来追加を考慮して扱う
- 削除より deprecated と移行期間の設定を優先する

---

## 7. 変更時の出力フォーマット
proto を変更するタスクでは、レビューや実装の報告時に最低限以下を含める。

- 変更した proto ファイル
- 変更理由
- 互換性の評価
- 生成コード更新の有無
- API / Worker / Web 影響
- テスト更新内容
- ドキュメント更新内容

短い報告例:

```text
- 変更対象: packages/proto/article/v1/article.proto
- 変更理由: 記事一覧のページング条件追加
- 互換性: field 追加のみで breaking change なし
- 生成コード: 更新あり
- 影響範囲: API 実装、Web 一覧取得
- テスト: handler test と usecase test を更新
- 文書: docs/architecture/api.md を更新
```

---

## 8. チェックリスト
- [ ] plan を提示して承認を得た
- [ ] 変更理由を説明できる
- [ ] 既存 field number を壊していない
- [ ] breaking change の有無を確認した
- [ ] 生成コードを更新した
- [ ] 実装側の修正を行った
- [ ] テストを更新した
- [ ] ドキュメントを更新した
- [ ] セルフレビューを行った

---

## 9. 関連ドキュメント
- `AGNETS.md`
- `docs/architecture/overview.md`
- `docs/architecture/api.md`
- `docs/adr/`

---

## 10. 判断原則
迷った場合は次を優先する。

- 破壊的変更を避ける
- 契約の分かりやすさを保つ
- 生成コードと利用側実装の整合を取る
- Web / API / Worker の横断影響を見落とさない
- 文書と実装の差分を残さない
