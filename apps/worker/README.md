# apps/worker

## 目的
このディレクトリは、Reddit 収集、AI 要約、再試行などの
非同期ジョブを実行する Go ワーカーです。

この層の責務:
- Reddit 議論の収集
- raw snapshot 保存
- 正規化データ保存
- AI 翻訳 / 要約 / 論点抽出
- 再試行処理
- `job_execution` 記録
- Worker 側の可観測性

詳細ルール:
- `./AGENTS.md`
- `../../docs/development/coding-rules-common.md`
- `../../docs/development/coding-rules-backend.md`
- `../../docs/development/code-review-checklist.md`
- `../../.ai/skills/reddit-ingestion-debug/SKILL.md`
- `../../.ai/skills/prompt-regression-check/SKILL.md`
- `../../.ai/skills/cloudwatch-log-search/SKILL.md`

---

## 基本方針
- raw、normalized、derived の責務を混ぜない
- raw snapshot を破壊的に上書きしない
- 収集処理は冪等性を意識する
- 失敗は `job_execution` とログへ残す
- prompt 変更時は `prompt_version` を意識する
- `trace_id` を API / Worker / LLM で相関可能にする

---

## 想定ディレクトリ
- `cmd/worker/`
  - エントリーポイント
- `internal/ingestion/`
  - 収集処理
- `internal/summarization/`
  - 要約処理
- `internal/retry/`
  - 再試行
- `internal/shared/`
  - queue、logger、trace など

---

## このディレクトリでよく触るファイル
- `cmd/worker/main.go`
- `internal/ingestion/`
- `internal/summarization/`
- `internal/retry/`

---

## 作業前に確認すること
- データモデルは `../../docs/architecture/data-model.md`
- 可観測性は `../../docs/architecture/observability.md`
- ローカル手順は `../../docs/operations/local-development.md`
- 収集障害は `../../.ai/skills/reddit-ingestion-debug/SKILL.md`
- prompt 変更は `../../.ai/skills/prompt-regression-check/SKILL.md`

---

## 実装ルール要約
- 実装前に短い計画を提示する
- 承認後に着手する
- 可能な限りテストファーストで進める
- 冪等性と再試行方針を意識する
- 外部依存の失敗と保存失敗を分けて考える
- ログに調査可能な文脈を残す
- 実装後はセルフレビューを行う

---

## 完了条件
- 関連テストが通る
- 冪等性と再試行方針が壊れていない
- ログと `job_execution` に必要な文脈が残る
- prompt / schema 影響を確認済み
- 必要な docs 更新がある
- セルフレビュー済みである

---

## ローカル起動

標準導線は root の Compose です。

```bash
cp infra/compose/.env.example infra/compose/.env
docker compose -f infra/compose/docker-compose.yml -f infra/compose/docker-compose.override.yml --env-file infra/compose/.env up -d worker
```

補足:
- Worker は `mysql` の health 完了後に起動する
- 標準接続先は `DATABASE_DSN=app:app@tcp(mysql:3306)/reddit_ai_digest?...` である
