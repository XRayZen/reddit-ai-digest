## 目的
このディレクトリは、Go による gRPC 主体の API サーバーと一部 REST エンドポイントを実装する層です。
レイヤードアーキテクチャでは、domain -> usecase -> adapter -> infra の順で実装します。  

詳細ルール:
- `../../docs/development/coding-rules-common.md`
- `../../docs/development/coding-rules-backend.md`
- `../../docs/development/code-review-checklist.md`
- `../../docs/architecture/api.md`
- `../../docs/architecture/data-model.md`
- `../../docs/architecture/observability.md`
- `../../.ai/skills/proto-schema-review/SKILL.md`

## このディレクトリでの作業ルール
1. 実装前に短い計画を提示し、OK を得てから着手する。
2. 可能な限りテストファーストで進める。
3. 実装後は必ずセルフレビューを行う。
4. proto を契約の正本として扱う。
5. handler に業務ロジックを書かない。
6. domain から adapter を参照しない。
7. 主処理は gRPC を優先し、REST 追加は管理用途などに限定する。
8. context を適切に伝播する。
9. 構造化ログと trace_id を必須とする。
10. proto 変更時は生成コード、実装、テスト、docs を更新する。

## 完了条件
- Go テストが通る
- proto 変更時は生成コード更新済み
- lint / format が通る
- trace_id とログ文脈が確認できる
- 必要な docs 更新がある
- セルフレビュー済みである
