# コードレビュー チェックリスト

## 1. この文書の目的
この文書は、PR 作成時およびセルフレビュー時の確認観点を整理するための資料である。

関連ドキュメント:
- `AGENTS.md`
- `docs/development/coding-rules-common.md`
- `docs/development/coding-rules-frontend.md`
- `docs/development/coding-rules-backend.md`

---

## 2. 共通確認
- [ ] 計画どおりの変更範囲に収まっている
- [ ] MVP 範囲を越えていない
- [ ] 命名が責務を表している
- [ ] テストが追加 / 更新されている
- [ ] lint / format が通る
- [ ] docs 更新が必要なら反映されている
- [ ] セルフレビュー済みである

---

## 3. フロントエンド確認
- [ ] page にロジックを詰め込みすぎていない
- [ ] Server / Client の使い分けが適切
- [ ] Redux の用途が適切
- [ ] `any` を使っていない
- [ ] UI の loading / error / empty が考慮されている
- [ ] 表示崩れしやすい要約テキストを確認している

---

## 4. バックエンド確認
- [ ] レイヤ境界を破っていない
- [ ] handler に業務ロジックが入っていない
- [ ] エラー処理が適切
- [ ] proto / schema 更新漏れがない
- [ ] `trace_id` や構造化ログが考慮されている
- [ ] 冪等性や再試行時の挙動が考慮されている

---

## 5. AI / prompt / proto 確認
- [ ] prompt 変更時に `prompt_version` を検討した
- [ ] eval / golden test の更新要否を確認した
- [ ] proto 変更時に生成コードを更新した
- [ ] UI / API / Worker 影響を確認した
