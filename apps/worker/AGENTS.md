# AGENTS.md

## 目的
このディレクトリは、
Reddit 収集、AI 要約、再試行などの
非同期ジョブを実行する Go ワーカーです。

詳細ルール:
- `../../docs/development/coding-rules-common.md`
- `../../docs/development/coding-rules-backend.md`
- `../../docs/development/code-review-checklist.md`
- `../../docs/architecture/data-model.md`
- `../../docs/architecture/observability.md`
- `../../.ai/skills/reddit-ingestion-debug/SKILL.md`
- `../../.ai/skills/prompt-regression-check/SKILL.md`
- `../../.ai/skills/cloudwatch-log-search/SKILL.md`

## このディレクトリでの作業ルール
1. 実装前に短い計画を提示し、OK を得てから着手する。
2. 可能な限りテストファーストで進める。
3. 実装後は必ずセルフレビューを行う。
4. raw、normalized、derived の責務を混ぜない。
5. raw snapshot を破壊的に上書きしない。
6. 収集処理は冪等性を意識する。
7. 失敗は job_execution とログへ残す。
8. trace_id を API / Worker / LLM で相関可能にする。
9. prompt 変更時は prompt_version と eval 更新要否を確認する。
10. 外部依存の失敗と保存処理失敗を分けて調査できるようにする。

## 完了条件
- 関連テストが通る
- 冪等性と再試行方針が壊れていない
- ログと job_execution に必要な文脈が残る
- prompt / schema 影響を確認済み
- 必要な docs 更新がある
- セルフレビュー済みである
