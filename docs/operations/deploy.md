# デプロイ

## 1. この文書の目的
この文書は、本プロジェクトを AWS 環境へデプロイする際の
基本方針、確認項目、実施手順を整理するための資料である。

関連ドキュメント:
- `AGENTS.md`
- `docs/product/mvp-scope.md`
- `docs/architecture/overview.md`
- `docs/architecture/observability.md`
- `docs/operations/local-development.md`
- `infra/terraform/README.md`

---

## 2. デプロイの基本方針
本プロジェクトでは、以下をデプロイの基本方針とする。

- AWS 上の本番構成は Terraform を正本として扱う
- アプリケーション配備は Web / API / Worker の責務を分けて扱う
- デプロイ前にテスト、lint、format、関連ドキュメント更新を確認する
- デプロイ後に最小限の疎通確認と監視確認を行う
- 障害時に rollback または再デプロイ判断ができる状態を保つ

補足:
- MVP では高度なデプロイ自動化よりも、再現可能で説明可能な手順を優先する
- IaC 変更とアプリ変更が同時に入る場合は、依存順序を明確にして実施する
- 手順は将来 GitHub Actions に寄せてもよいが、文書上の確認観点は残す

---

## 3. 想定するデプロイ対象
本番または検証環境での主なデプロイ対象は以下。

- `apps/web`
  - 公開 UI / 管理 UI
- `apps/api`
  - Go gRPC サーバー
  - 一部 REST エンドポイント
- `apps/worker`
  - 収集 / 要約 / 再試行ジョブ
- `infra/terraform`
  - ECS
  - RDS
  - S3
  - CloudFront
  - WAF
  - Route 53
  - 監視関連リソース

補足:
- DB migration や seed 的な運用作業は、アプリ配備と責務を分けて扱う
- proto や schema の変更がある場合は、先に契約影響を確認する

---

## 4. デプロイ前の確認
デプロイ前に最低限確認することは以下。

### 4.1 実装と品質
- 変更意図が明確である
- 関連テストが通っている
- lint / format が通っている
- セルフレビューが完了している
- 影響のある docs が更新されている

### 4.2 契約とデータ
- proto 変更時は生成コード更新が反映されている
- schema 変更時は prompts / evals / UI 影響が確認されている
- migration の有無が整理されている
- raw data を破壊的に壊す変更ではない

### 4.3 運用と監視
- 必要な環境変数や secrets が揃っている
- `trace_id`、`job_id`、主要ログ項目が確認できる
- Sentry / CloudWatch の確認観点が整理されている
- rollback の判断材料がある

---

## 5. デプロイの基本順序
一般的な実施順序は以下。

1. 変更内容と影響範囲を確認する
2. Terraform 変更があれば `fmt` / `validate` / `plan` を確認する
3. アプリケーションの build とテストを確認する
4. 必要なら migration を先に適用する
5. Web / API / Worker を配備する
6. デプロイ後の疎通確認を行う
7. 監視、ログ、ジョブ実行状況を確認する

補足:
- migration とアプリの前後関係は breaking にならないよう調整する
- Worker のデプロイはジョブ重複や再試行条件に注意する

---

## 6. Terraform 変更時の確認
Terraform を変更した場合は、以下を行う。

1. `terraform fmt` を実行する
2. `terraform validate` を実行する
3. 対象環境で `terraform plan` を確認する
4. 破壊的変更の有無を明確にする
5. apply 後の影響範囲を確認する

例:

```bash
cd infra/terraform/envs/dev
terraform init
terraform fmt -recursive
terraform validate
terraform plan
```

詳細は `infra/terraform/README.md` を参照する。

---

## 7. アプリケーション配備時の確認
アプリケーションを配備する場合は、以下を確認する。

- Web
  - 主要画面が表示できる
  - API 接続先が正しい
- API
  - gRPC / REST の起動確認ができる
  - DB、S3、外部 API への接続が成立する
- Worker
  - ジョブ起動条件が正しい
  - LLM 呼び出し設定が正しい
  - 失敗時に再試行や記録が行われる

注意点:
- 環境変数不足は起動失敗の主要因になりやすい
- proto 変更時は API と Worker の整合確認を先に行う
- prompt や schema 変更時は保存データと UI 影響を確認する

---

## 8. デプロイ後の確認
デプロイ後に最低限確認することは以下。

### 8.1 疎通確認
- Web が表示できる
- テーマ一覧が取得できる
- 記事一覧 / 記事詳細が取得できる
- 管理系の基本操作が失敗しない

### 8.2 ジョブ確認
- 収集ジョブを起動できる
- 要約ジョブを起動できる
- `job_execution` の状態が追える

### 8.3 監視確認
- CloudWatch Logs にログが出ている
- `trace_id` を起点に追跡できる
- Sentry に致命的エラーが増えていない
- LLM 呼び出し失敗や DB 接続失敗がない

---

## 9. rollback / 再デプロイ方針
障害時は、以下のどちらで戻すかを判断する。

- アプリケーションの再デプロイ
- Terraform 変更の巻き戻しまたは再適用

判断観点:
- 問題がアプリ変更か IaC 変更か
- DB migration が不可逆かどうか
- 障害が Web のみか、API / Worker を含むか
- 収集 / 要約ジョブにどの程度影響しているか

原則:
- plan や差分を確認せずに場当たり的に戻さない
- raw data や履歴データを破壊しない
- まずログ、トレース、ジョブ履歴で原因を切り分ける

---

## 10. よくある失敗要因
- 環境変数や secrets の不足
- Terraform plan 未確認のまま apply した差分
- proto 変更と API / Worker 実装の不整合
- prompt / schema 変更と UI 表示の不整合
- migration 順序の誤り
- CloudWatch / Sentry の確認漏れ

---

## 11. デプロイ完了条件
デプロイ作業の完了条件は以下。

- 対象環境へ意図した差分が反映されている
- テスト、lint、format の確認が済んでいる
- 必要な migration、proto、schema 変更が反映されている
- デプロイ後の最小疎通確認が済んでいる
- ログ、トレース、ジョブ履歴で異常がないことを確認している
- docs 更新とセルフレビューが完了している
