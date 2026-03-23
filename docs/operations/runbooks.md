# ランブック

## 1. この文書の目的
この文書は、本プロジェクトで運用中に問題が起きた際の
一次切り分けと基本対応の入口を整理するための資料である。

関連ドキュメント:
- `AGENTS.md`
- `docs/architecture/overview.md`
- `docs/architecture/observability.md`
- `docs/operations/local-development.md`
- `docs/operations/deploy.md`
- `.ai/skills/cloudwatch-log-search/SKILL.md`
- `.ai/skills/reddit-ingestion-debug/SKILL.md`
- `.ai/skills/prompt-regression-check/SKILL.md`

---

## 2. 基本方針
運用時の対応は、以下の方針で行う。

- まず `trace_id` を起点に状況を切り分ける
- ログ、トレース、ジョブ履歴を合わせて確認する
- 生データや履歴を破壊しない
- 原因不明のまま場当たり的に再実行しない
- 再現条件、影響範囲、暫定対応を記録する

補足:
- MVP では完璧な自動復旧よりも、人間が追跡できることを重視する
- 障害対応では、利用者影響の有無とデータ破壊リスクの有無を先に見る

---

## 3. 最初に確認すること
問題が起きたら、まず以下を確認する。

1. どの環境で起きているか
2. どのレイヤで起きているか
3. いつから起きているか
4. 影響範囲はどこまでか
5. `trace_id`、`job_id`、対象 `theme` / `subreddit` は何か

対象レイヤの例:
- Web
- API
- Worker
- DB
- S3 / MinIO
- Reddit
- OpenAI 互換 LLM
- AWS インフラ

---

## 4. 共通の調査観点
レイヤを問わず、以下の観点で切り分ける。

- 直近のデプロイ有無
- Terraform 変更有無
- migration 実行有無
- proto / schema / prompt の変更有無
- 環境変数や secrets の変更有無
- 外部依存の障害有無

確認したいログ項目:
- `trace_id`
- `job_id`
- `topic_id`
- `subreddit`
- `model_name`
- `prompt_version`
- `error_code`
- `error_message`

---

## 5. 症状別ランブック

### 5.1 Web が表示できない
確認順:
1. Web のデプロイが成功しているか
2. CloudFront / 配信設定に異常がないか
3. API 接続先や環境変数が壊れていないか
4. Web の Sentry エラーが増えていないか
5. 直近の UI 変更や schema 変更が影響していないか

よくある原因:
- 環境変数の設定漏れ
- API 接続エラー
- UI が想定しないレスポンス shape
- 配信設定ミス

---

### 5.2 API が応答しない
確認順:
1. API コンテナまたは ECS タスクが起動しているか
2. gRPC / REST のヘルス確認ができるか
3. DB 接続エラーが出ていないか
4. 直近の proto 変更と実装がずれていないか
5. CloudWatch Logs に起動エラーや panic が出ていないか

よくある原因:
- 環境変数不足
- migration 未適用
- proto 生成漏れ
- DB 接続情報不整合

---

### 5.3 Worker が収集ジョブを処理しない
確認順:
1. Worker が起動しているか
2. 対象ジョブが enqueue されているか
3. `job_execution` に状態が記録されているか
4. Reddit API 呼び出し失敗が出ていないか
5. 再試行条件や rate limit で止まっていないか

よくある原因:
- Worker 起動条件ミス
- ジョブ投入漏れ
- Reddit 側エラー
- スナップショット保存失敗

詳細は `.ai/skills/reddit-ingestion-debug/SKILL.md` を参照する。

---

### 5.4 要約ジョブが失敗する
確認順:
1. 対象ジョブが enqueue されているか
2. Worker のログに LLM 呼び出し失敗がないか
3. `model_name` と `prompt_version` が想定どおりか
4. schema と prompt の不整合がないか
5. 保存処理や DB 更新で失敗していないか

よくある原因:
- API キーや provider 設定不備
- prompt 変更による parse 失敗
- schema 更新漏れ
- token 制限や timeout

詳細は `.ai/skills/prompt-regression-check/SKILL.md` を参照する。

---

### 5.5 収集は成功したが記事が表示されない
確認順:
1. raw snapshot は保存されているか
2. 正規化データが DB に保存されているか
3. AI 生成データが作られているか
4. API が記事一覧 / 詳細を正しく返しているか
5. Web 側が新しい shape を解釈できているか

よくある原因:
- 正規化処理失敗
- 要約未生成
- UI 側の表示条件ミス
- proto / schema 変更後の整合漏れ

---

### 5.6 ログはあるが追跡できない
確認順:
1. `trace_id` が付与されているか
2. API → Worker → LLM で同一文脈が引き回されているか
3. `job_id`、`topic_id`、`subreddit` がログに含まれているか
4. CloudWatch Logs と Sentry を相互参照できるか
5. 直近の observability 変更が影響していないか

よくある原因:
- `trace_id` の伝播漏れ
- 構造化ログ不足
- エラーログに文脈不足

---

## 6. 再実行時の注意
再実行や再デプロイを行う前に、以下を確認する。

- 失敗原因の仮説があるか
- raw data を上書きしないか
- 同じジョブが重複実行されないか
- migration や IaC 変更が未反映ではないか
- 監査上残すべき履歴を消さないか

原則:
- 失敗履歴は消さずに残す
- 再要約や再試行は新しい実行として記録する
- 原因未特定の大量再実行は避ける

---

## 7. エスカレーション判断
以下の場合は、単純な再試行だけで閉じない。

- データ破壊の可能性がある
- 複数レイヤに同時障害が出ている
- Terraform 変更や migration が関与している
- 同一障害が継続的に再発している
- Web / API / Worker のすべてに影響している

記録したいこと:
- 発生時刻
- 影響範囲
- 暫定対応
- 恒久対応候補
- 関連 `trace_id` / `job_id`

---

## 8. よく使う参照先
- ローカル再現:
  - `docs/operations/local-development.md`
- デプロイ確認:
  - `docs/operations/deploy.md`
- 監視設計:
  - `docs/architecture/observability.md`
- Reddit 収集調査:
  - `.ai/skills/reddit-ingestion-debug/SKILL.md`
- prompt / schema 調査:
  - `.ai/skills/prompt-regression-check/SKILL.md`
- CloudWatch Logs 調査:
  - `.ai/skills/cloudwatch-log-search/SKILL.md`

---

## 9. ランブック完了条件
この文書の運用上の完了条件は以下。

- 一次切り分けの入口として機能する
- `trace_id` を起点に調査できる
- 主要な障害パターンを最低限カバーしている
- 個別 Skill や設計文書への導線がある
- docs 更新とセルフレビューが完了している
