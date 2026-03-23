# 監視・可観測性

## 1. この文書の目的
この文書は、本プロジェクトにおける
ログ、トレース、エラー監視、相関調査の設計方針を整理するための資料である。

関連ドキュメント:
- `AGENTS.md`
- `docs/architecture/overview.md`
- `docs/architecture/api.md`
- `docs/architecture/data-model.md`
- `docs/operations/local-development.md`
- `.ai/skills/cloudwatch-log-search/SKILL.md`

---

## 2. 基本方針
本プロジェクトでは、以下を監視・可観測性の基本方針とする。

- API、Worker、LLM 呼び出しを `trace_id` で相関可能にする
- ログは構造化ログを基本とする
- エラー監視は Sentry を利用する
- 実行ログの集約は CloudWatch Logs を利用する
- 収集失敗や要約失敗は `job_execution` に記録する
- ローカルと本番で観測項目の考え方を揃える

補足:
- ログ、トレース、ジョブ履歴のいずれか 1 つだけで調査を完結させない
- まず `trace_id` を起点に横断し、必要に応じて `job_id` や `topic_id` へ降りる
- 可観測性は後付けではなく、API / Worker / LLM の境界設計と同時に考える

---

## 3. 監視対象
主な監視対象は以下。

- `apps/web`
  - UI エラー
  - API 呼び出し失敗
- `apps/api`
  - gRPC リクエスト
  - 一部 REST リクエスト
  - DB アクセス
- `apps/worker`
  - 収集ジョブ
  - 要約ジョブ
  - 再試行ジョブ
- 外部依存
  - Reddit 取得
  - OpenAI 互換 LLM 呼び出し
- インフラ
  - ECS タスク
  - CloudWatch Logs
  - RDS 接続

優先順位:
- MVP ではメトリクス網羅よりも、失敗時に原因を追えることを優先する
- 収集、要約、保存、表示のどこで止まったか切り分けられることを最低条件とする

---

## 4. 相関キー
本プロジェクトでは `trace_id` を最重要の相関キーとする。

加えて、必要に応じて以下をログに含める。

- `job_id`
- `topic_id`
- `theme`
- `subreddit`
- `provider_name`
- `model_name`
- `prompt_version`

方針:
- 1回の API リクエストまたはジョブ実行に `trace_id` を付与する
- API → Worker → LLM の流れで可能な限り同一 `trace_id` を引き回す
- `job_execution` に `trace_id` を保存する

補足:
- `trace_id` が分断される設計は、あとで調査コストが急増するため避ける
- 手動再実行でも新旧 `job_id` は変わり得るが、関連する文脈が追えるようログ属性を揃える

---

## 5. ログ方針
ログは構造化形式を基本とする。

最低限含める項目:
- timestamp
- level
- service
- trace_id
- message

文脈に応じて追加する項目:
- job_id
- topic_id
- subreddit
- theme
- error_code
- model_name
- prompt_version
- latency_ms

例:
```json
{
  "timestamp": "2026-03-22T10:00:00Z",
  "level": "INFO",
  "service": "worker",
  "trace_id": "trc_xxx",
  "job_id": "job_xxx",
  "theme": "amd-rocm",
  "subreddit": "LocalLLaMA",
  "message": "summary persisted"
}
```

運用メモ:
- 例外時は `error_code`、`error_message`、対象 ID を省略しない
- DB 保存前後、外部 API 前後、ジョブ状態遷移時には必ず識別可能なログを残す
- 個人情報や秘匿情報は直接ログに出さない

---

## 6. CloudWatch Logs
本番ログは CloudWatch Logs に集約する。

方針:
- ECS タスク定義では `awslogs` を利用する
- サービスごとにロググループを分ける
- 保持期間は環境ごとに設定する
- ログクエリは CloudWatch Logs Insights を前提にする

想定ロググループ例:
- `/ecs/reddit-ai-digest/web`
- `/ecs/reddit-ai-digest/api`
- `/ecs/reddit-ai-digest/worker`

詳細な検索手順は
`.ai/skills/cloudwatch-log-search/SKILL.md` を参照する。

補足:
- 環境別に prefix を切り、開発・検証・本番を混在させない
- 主要サービスはロググループを分け、障害時のノイズを減らす

---

## 7. Sentry
Sentry はエラー監視と分散トレーシングに利用する。

方針:
- API に Sentry を導入する
- Web に Sentry を導入する
- 主要な Worker エラーも Sentry に送る
- `trace_id` や job 情報を context として付与する
- OpenTelemetry 連携を前提に設計する

監視したい例:
- gRPC エラー
- LLM timeout
- 要約保存失敗
- UI 側の致命的表示エラー

補足:
- すべての例外を通知対象にするのではなく、運用上の重要度で絞る
- 例外イベントだけでは文脈不足になりやすいため、CloudWatch Logs と相互参照する

---

## 8. OpenTelemetry
トレース計測は OpenTelemetry を前提とする。

対象:
- gRPC サーバー
- gRPC クライアント
- HTTP 補助 API
- DB アクセス
- 外部 API 呼び出し
- LLM 呼び出し

方針:
- span を過剰に細かくしすぎない
- 主要 I/O とジョブ境界を優先して計測する
- ログとトレースを相互参照できるようにする

設計メモ:
- 収集、要約、保存、再試行などの大きな処理境界を優先して span を切る
- ノイズの多い内部関数まで機械的に span 化しない

---

## 9. ジョブ監視
収集・要約・再試行ジョブは、
単なるログだけでなく `job_execution` として記録する。

最低限記録する項目:
- `job_type`
- `target_id`
- `status`
- `attempt`
- `trace_id`
- `started_at`
- `finished_at`
- `error_code`
- `error_message`

目的:
- 失敗の可視化
- 再試行判断
- 管理画面での確認
- ログとの突合

補足:
- ジョブが成功したかどうかだけでなく、どこで止まったかを追える粒度が必要
- 再試行時は previous failure を消さず、履歴として残す

---

## 10. 調査フロー
障害調査は以下の順で行う。

1. `job_execution` またはリクエスト単位で対象を特定する
2. `trace_id` を確認する
3. CloudWatch Logs で対象ログを追う
4. API / Worker / LLM のどこで失敗したか切り分ける
5. Sentry のイベントとトレースを確認する
6. raw snapshot や DB 保存結果と突合する

原則:
- ログ、トレース、保存結果の 3 点で確認する
- 1 つの観測面だけで結論を出さない

---

## 11. ローカルでの可観測性
ローカルでも本番と同じ考え方で確認できるようにする。

確認対象:
- API ログ
- Worker ログ
- `trace_id` の伝播
- `prompt_version`
- `model_name`
- job status

ローカルでは CloudWatch の代わりに
Docker logs や標準出力確認を用いてよい。

補足:
- 本番と同じログ項目を出せるようにして、ローカルだけ別形式にしない
- 障害時の再現確認は、可能なら local run でも `trace_id` で追える状態にする

---

## 12. MVP での完了条件
MVP では以下を満たすことを目標とする。

- API と Worker の構造化ログがある
- `trace_id` による相関ができる
- ECS から CloudWatch Logs に出力される
- 主要エラーが Sentry に送られる
- 失敗ジョブが `job_execution` に残る
- 最低限のログ調査手順が Skill 化されている

---

## 13. 今後の拡張余地
- メトリクスダッシュボード整備
- アラート条件の追加
- LLM ごとの遅延・失敗率分析
- OpenTelemetry Collector 導入
- 監査ログの強化
