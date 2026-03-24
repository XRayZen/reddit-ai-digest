---
name: cloudwatch-log-search
description: CloudWatch Logs と trace_id を使って、API・Worker・LLM 呼び出しの失敗箇所を横断的に調査するための標準手順
---

# cloudwatch-log-search

## 1. 目的
この Skill は、本番環境または検証環境で発生した問題について、
CloudWatch Logs を使って API、Worker、外部呼び出しのどこで
失敗したかを切り分けるための標準手順を提供する。

対象:
- API エラー
- gRPC リクエスト失敗
- 管理 REST 操作失敗
- Reddit 収集失敗
- AI 要約失敗
- 再試行ジョブ失敗
- `trace_id` 単位の横断調査

---

## 2. この Skill を使う場面
次のいずれかに当てはまる場合、この Skill を使う。

- 本番で 5xx が発生した
- 収集ジョブが failed になった
- 要約ジョブが失敗した
- API は成功したように見えるが結果が保存されていない
- Worker 側だけ失敗している疑いがある
- Sentry のイベントから詳細ログを掘りたい
- 特定 `trace_id` の流れを追いたい

使わない場面:
- ローカルだけで再現する単純な開発時エラーで、本番ログ確認が不要な場合
- UI 表示崩れのみで、バックエンドやログ調査に進む必要がない場合

---

## 3. 作業開始前ルール
調査前に短い plan を提示する。

plan に含める項目:
- 何の障害を調べるか
- どのサービスを確認するか
- 既知の `trace_id` / `job_id` / `topic_id`
- 先に見るロググループ
- 切り分けたい仮説

承認を得る前に修正を始めない。

補足:
- まず調査を行い、原因層を整理してから修正に進む
- API、Worker、保存処理を一度に疑わず、時系列と相関キーで絞る

---

## 4. 前提情報
調査時に可能なら以下を集める。

- environment
- 発生時刻
- service 名
- `trace_id`
- `job_id`
- `topic_id`
- subreddit
- Sentry event ID

---

## 5. 代表ロググループ
想定ロググループ例:
- `/ecs/reddit-ai-digest/web`
- `/ecs/reddit-ai-digest/api`
- `/ecs/reddit-ai-digest/worker`

環境別に prefix が異なる場合は、
対象環境の runbook または Terraform 定義を確認する。

---

## 6. 調査の基本手順
1. 発生時刻を確認する
2. `trace_id` または `job_id` を特定する
3. API ログを確認する
4. Worker ログを確認する
5. 外部 API 呼び出し前後のログを確認する
6. DB 保存成否ログを確認する
7. Sentry イベントと突合する
8. 原因の層を整理してから修正する

原則:
- 時間帯を絞らずに広く見始めない
- まず request/job の入口を見つけ、そこから downstream を追う

---

## 7. よく使う検索観点
### 7.1 `trace_id` で追う
- 同じ `trace_id` を API と Worker の両方で検索する
- リクエスト開始から終了までの流れを追う

### 7.2 `job_id` で追う
- 収集ジョブや要約ジョブ失敗時に有効
- 再試行回数や status 遷移も確認する

### 7.3 `topic_id` / subreddit で追う
- 特定テーマや収集対象だけ失敗する場合に有効

### 7.4 `error_code` / message で追う
- timeout
- unique constraint
- parse error
- upstream error
- auth error

---

## 8. 典型的な切り分け
### 8.1 API 受付前で失敗
- ALB / ingress / service 到達前を疑う
- アプリログがないか確認する

### 8.2 API 受付後、Worker 起票前で失敗
- handler / service / validation を疑う
- `trace_id` 単位で request 開始と job 起票ログを比較する

### 8.3 Worker 起票後、外部取得前で失敗
- queue / job execution / config を疑う

### 8.4 外部取得後、保存前で失敗
- parse / normalize / schema mismatch を疑う

### 8.5 保存直前または保存時に失敗
- DB 制約
- transaction
- migration 不整合
- idempotency 問題を疑う

### 8.6 保存後に UI へ出ない
- read model / query / article view 側を疑う

---

## 9. やってはいけないこと
- `trace_id` を見ずに断片ログだけで結論を出す
- API と Worker のどちらか片方だけを見て終える
- 発生時刻を絞らずに広く検索して誤判定する
- CloudWatch Logs だけ見て Sentry を無視する
- 原因層を分けずにすぐ実装修正へ進む

---

## 10. 推奨事項
- まず `trace_id` を確保する
- まず時間帯を絞る
- `job_execution` と突合する
- 同時に Sentry イベントも見る
- 外部 API 前後と DB 保存前後のログを重点確認する
- 修正時は再現条件を文章で残す

---

## 11. 調査時の出力フォーマット
ログ調査を行ったときは、最低限以下を整理して報告する。

- 対象環境
- 発生時刻
- `trace_id` または `job_id`
- 確認したロググループ
- 失敗段階
- 原因の仮説または確定原因
- 次に確認または修正する層

短い報告例:

```text
- 環境: prod
- 発生時刻: 2026-03-22 19:10 JST
- trace_id: trc_xxx
- ロググループ: /ecs/reddit-ai-digest/api, /ecs/reddit-ai-digest/worker
- 失敗段階: worker の summary save
- 原因: DB timeout の疑い。LLM 呼び出し自体は成功
- 次の対象: worker repository と RDS 接続状況
```

---

## 12. チェックリスト
- [ ] plan を提示して承認を得た
- [ ] 発生時刻を確認した
- [ ] `trace_id` または `job_id` を特定した
- [ ] API ログを確認した
- [ ] Worker ログを確認した
- [ ] 外部 API 前後を確認した
- [ ] DB 保存成否を確認した
- [ ] Sentry と突合した
- [ ] 原因層を整理した
- [ ] セルフレビューを行った

---

## 13. 関連ドキュメント
- `AGNETS.md`
- `docs/architecture/observability.md`
- `docs/architecture/data-model.md`
- `docs/operations/local-development.md`
- `.ai/skills/reddit-ingestion-debug/SKILL.md`

---

## 14. 判断原則
迷った場合は次を優先する。

- まず時刻と `trace_id` を絞る
- API と Worker を分断せずに追う
- ログ、Sentry、DB 保存結果を突き合わせる
- 推測より相関キーと時系列を優先する
