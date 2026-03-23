# データモデル

## 1. この文書の目的
この文書は、本プロジェクトにおけるデータの分類、
保存方針、主要テーブル、および設計意図を整理するための資料である。

関連ドキュメント:
- `docs/architecture/overview.md`
- `docs/architecture/api.md`
- `docs/product/mvp-scope.md`
- `.ai/skills/reddit-ingestion-debug/SKILL.md`
- `.ai/skills/prompt-regression-check/SKILL.md`

---

## 2. データモデル設計の基本方針
本プロジェクトでは、データを以下の3層に分けて扱う。

- 生データ
  - 外部ソースから取得した raw snapshot
- 正規化データ
  - アプリケーション内部で扱いやすい形に整形したデータ
- AI 生成データ
  - 翻訳、要約、主要論点、議論傾向などの導出結果

重要方針:
- 生データは破壊的に上書きしない
- 正規化データは検索・表示・再処理しやすい形で保持する
- AI 生成データは再生成可能であることを前提に保存する
- AI 出力には model 名、prompt_version、token usage を紐づける

補足:
- UI 表示都合と永続化都合は分離し、表示向けの都合で正規化テーブルを歪めない
- 再収集や再要約時の比較ができるよう、履歴性を損なう更新は避ける
- source 由来の事実と AI が導出した要約を同じ意味の正本として扱わない

---

## 3. 主なエンティティ
MVP では以下を主要エンティティとする。

- Theme
- SourceThread
- SourceComment
- TopicGroup
- ArticleView
- AISummary
- IngestionRun
- JobExecution

MVP では単純な 1 thread = 1 topic を基本にしつつ、
後続の topic clustering や multi-source 連携に備えて責務を分ける。

---

## 4. Theme
テーマを表す。

役割:
- UI 上の分類単位
- 収集対象 subreddit や表示対象記事の分類軸

主な属性:
- id
- slug
- name
- description
- is_active

例:
- software-engineering
- local-llm
- image-generation-ai
- amd-rocm

設計メモ:
- slug は公開 URL や API 参照に使うため安定値として扱う
- subreddit との対応は将来的に別テーブル化してもよい

---

## 5. SourceThread
外部ソース由来のスレッド本体を表す。

役割:
- Reddit スレッドの正規化保存
- AI 要約の入力元
- 記事詳細の元情報

主な属性:
- id
- source_type
- source_thread_id
- theme_id
- subreddit
- title
- body_text
- author_name
- score
- num_comments
- permalink
- external_url
- raw_snapshot_s3_key
- created_at_source
- ingested_at

重要制約:
- `source_type + source_thread_id` は一意とする
- raw snapshot とは別に保持する
- 冪等な収集を意識する

補足:
- Reddit のレスポンス差分でメタデータが更新される場合でも、一意キーは変えない
- `raw_snapshot_s3_key` は取得元確認と再処理起点のため保持する

---

## 6. SourceComment
外部ソース由来のコメントを表す。

役割:
- 議論の温度感や論点抽出の入力元
- 元スレッドへの従属データ

主な属性:
- id
- source_thread_id
- source_comment_id
- parent_comment_id
- author_name
- body_text
- score
- created_at_source

重要制約:
- `source_thread_id + source_comment_id` は一意とする
- 全コメントではなく上位コメントのみ収集する戦略も許容する

設計メモ:
- parent-child 関係は完全再現より、要約入力として必要な範囲の整合を優先する
- 削除済みコメントや空本文コメントの扱いは adapter 層で正規化方針を決める

---

## 7. TopicGroup
複数スレッドを1つの話題として束ねるための単位。
MVP では 1 thread = 1 topic として簡略化してもよい。

役割:
- UI 上の1記事に相当する論理単位
- 将来的な topic clustering の受け皿

主な属性:
- id
- theme_id
- primary_source_thread_id
- canonical_title
- status
- published_at

status 例:
- raw
- summarized
- failed
- published

補足:
- MVP では primary source を 1 つ持つ単純形でもよい
- 将来は source mapping を持たせて複数 thread を束ねられるようにする

---

## 8. ArticleView
UI 表示用に整形された記事ビューを表す。
MVP では TopicGroup と AISummary の結合結果として
動的生成してもよいが、将来的には materialized view 的に持つ余地がある。

役割:
- 一覧表示の高速化
- 詳細画面表示の整形済みデータ提供

主な属性候補:
- article_id
- theme_slug
- title
- summary_ja
- stance_label
- source_url
- published_at

設計メモ:
- これは表示最適化のための派生表現であり、正本ではない
- 正規化テーブルの責務不足を `ArticleView` で補う設計にはしない

---

## 9. AISummary
AI による生成結果を表す。

役割:
- 日本語翻訳
- 日本語要約
- 主要論点
- 議論傾向
- 生成条件の保存

主な属性:
- id
- topic_group_id
- provider_name
- model_name
- prompt_version
- translation_ja
- summary_ja
- key_points_json
- stance_label
- token_input
- token_output
- latency_ms
- created_at

重要ルール:
- prompt 変更時は `prompt_version` を更新する
- 出力 shape を変える場合は schema と UI を確認する
- AI 出力は正本ではなく導出データとして扱う

補足:
- 同じ topic_group に複数の AISummary を持てる形にして、再要約比較を可能にする
- model 切り替えや prompt 改訂の影響が追えるよう、生成条件は省略しない

---

## 10. IngestionRun
1回の収集実行単位を表す。

役割:
- 収集処理の監査
- 失敗調査
- 実行履歴の確認

主な属性候補:
- id
- source_type
- target_name
- started_at
- finished_at
- status
- fetched_threads_count
- fetched_comments_count
- error_count
- trace_id

設計メモ:
- subreddit 単位、テーマ単位、手動実行単位など、実行の粒度は運用に合わせて定義する
- `trace_id` は API / Worker / 外部呼び出しと相関可能であることを重視する

---

## 11. JobExecution
ジョブ単位の実行履歴を表す。

役割:
- 再実行
- エラー分析
- 管理画面表示

主な属性:
- id
- job_type
- target_type
- target_id
- status
- attempt
- trace_id
- error_code
- error_message
- started_at
- finished_at

job_type 例:
- ingestion
- summarization
- resummarization

設計メモ:
- `IngestionRun` が収集全体の監査単位なら、`JobExecution` は個別ジョブの実行単位として使い分ける
- 同一 target に対する再実行履歴を追えるよう、attempt を保持する

---

## 12. 生データ保存方針
生データは DB に直接すべて展開せず、
raw snapshot としてオブジェクトストレージにも保存する。

目的:
- 取得時点のレスポンスを再確認できるようにする
- 正規化バグを後から検証できるようにする
- AI 入力の再構築を可能にする

重要ルール:
- raw snapshot は上書きしない
- 破損調査や再処理の起点として扱う
- SourceThread / SourceComment は snapshot から導出した正規化データとする

保存メモ:
- snapshot key は source、対象、取得時刻、run 単位を含めて衝突を避ける
- DB 保存と object storage 保存の成否は別々に観測できるようにする

---

## 13. 代表テーブル例
MVP では最低限以下を持つ。

- `themes`
- `source_threads`
- `source_comments`
- `topic_groups`
- `ai_summaries`
- `ingestion_runs`
- `job_executions`

将来的に必要なら追加:
- `article_views`
- `prompt_versions`
- `source_mappings`
- `theme_subreddits`

---

## 14. 設計上の重要ポイント
### 14.1 raw と derived を混ぜない
収集した元データと AI 出力を同一責務で扱わない。

### 14.2 再処理可能性を残す
入力を保存し、要約や整形を後からやり直せるようにする。

### 14.3 UI 表示と内部保存を分離する
一覧表示や詳細表示の都合を、そのまま永続データ設計に持ち込まない。

### 14.4 MVP では過度な一般化を避ける
将来の topic clustering は意識しつつ、MVP は単純な対応関係で実装する。

### 14.5 ジョブ監査を軽視しない
収集や要約は非同期失敗が起こるため、実行履歴とエラー情報を保存する。

---

## 15. 今後の拡張余地
- 複数スレッドの話題統合
- source adapter の追加
- article view の materialize
- 複数言語出力
- ベクトル検索用インデックス
- CockroachDB 向けの制約再検討

---

## 16. テーブル設計時の確認メモ
テーブルや schema を具体化するときは、以下を確認する。

- 一意制約が収集の冪等性と一致しているか
- nullable 項目が source 実データの揺れに対応できるか
- AI 出力の再生成と比較に必要な列が揃っているか
- trace_id、job_id、run_id の関係が調査しやすいか
- UI 表示都合の列を正規化テーブルに混ぜ込んでいないか
