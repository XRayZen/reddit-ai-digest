-- テーママスタ: Reddit 収集のカテゴリ単位
CREATE TABLE IF NOT EXISTS themes (
  slug VARCHAR(191) PRIMARY KEY COMMENT 'URL-safe な一意識別子 (例: rust, ai-safety)',
  name VARCHAR(191) NOT NULL COMMENT '表示名',
  description TEXT NOT NULL COMMENT '説明文',
  is_active BOOLEAN NOT NULL DEFAULT 1 COMMENT '有効フラグ (0: 無効, 1: 有効)',
  updated_at TIMESTAMP NOT NULL COMMENT '最終更新日時'
) COMMENT='テーママスタ: 収集・配信する技術トピックのカテゴリ';

-- Reddit スレッド生データ: 収集時点のスナップショットを保持
CREATE TABLE IF NOT EXISTS source_threads (
  id VARCHAR(191) PRIMARY KEY COMMENT '内部 UUID',
  source_type VARCHAR(64) NOT NULL COMMENT 'ソース種別 (例: reddit)',
  source_thread_id VARCHAR(191) NOT NULL COMMENT '元プラットフォームのスレッドID',
  theme_slug VARCHAR(191) NOT NULL COMMENT '関連テーマ',
  subreddit VARCHAR(191) NOT NULL COMMENT 'サブレディット名',
  title TEXT NOT NULL COMMENT 'スレッドタイトル',
  body_text TEXT NOT NULL COMMENT 'スレッド本文',
  author_name VARCHAR(191) NOT NULL COMMENT '投稿者名',
  score INTEGER NOT NULL DEFAULT 0 COMMENT '投票スコア',
  num_comments INTEGER NOT NULL DEFAULT 0 COMMENT 'コメント数',
  permalink TEXT NOT NULL COMMENT 'Reddit パーマリンク',
  external_url TEXT NOT NULL COMMENT '外部 URL',
  raw_snapshot_s3_key TEXT NOT NULL COMMENT '生 JSON スナップショットの S3 キー (破壊的更新防止)',
  created_at_source TIMESTAMP NOT NULL COMMENT '元投稿の日時',
  ingested_at TIMESTAMP NOT NULL COMMENT '取り込み日時',
  UNIQUE(source_type, source_thread_id),
  FOREIGN KEY(theme_slug) REFERENCES themes(slug)
) COMMENT='Reddit スレッド生データ: 収集時点のスナップショットを保持し、再解析を可能にする';

-- トピックグループ: 同一話題のスレッドを束ねた配信単位
CREATE TABLE IF NOT EXISTS topic_groups (
  id VARCHAR(191) PRIMARY KEY COMMENT '内部 UUID',
  theme_slug VARCHAR(191) NOT NULL COMMENT '関連テーマ',
  primary_source_thread_id VARCHAR(191) NOT NULL UNIQUE COMMENT '代表スレッドの source_thread.id',
  canonical_title TEXT NOT NULL COMMENT '正規化されたタイトル (AI 生成)',
  status VARCHAR(32) NOT NULL COMMENT 'ステータス (draft: 下書き, published: 公開済, archived: アーカイブ)',
  published_at TIMESTAMP NOT NULL COMMENT '公開日時',
  updated_at TIMESTAMP NOT NULL COMMENT '最終更新日時',
  FOREIGN KEY(theme_slug) REFERENCES themes(slug),
  FOREIGN KEY(primary_source_thread_id) REFERENCES source_threads(id)
) COMMENT='トピックグループ: 同一話題の複数スレッドを束ねた配信単位';

-- Reddit コメント生データ: スレッド内の議論を保持
CREATE TABLE IF NOT EXISTS source_comments (
  id VARCHAR(191) PRIMARY KEY COMMENT '内部 UUID',
  source_thread_fk VARCHAR(191) NOT NULL COMMENT '親スレッドの source_thread.id',
  source_comment_id VARCHAR(191) NOT NULL COMMENT '元プラットフォームのコメントID',
  parent_comment_id VARCHAR(191) NOT NULL COMMENT '親コメントID (ルートの場合は空文字列)',
  author_name VARCHAR(191) NOT NULL COMMENT '投稿者名',
  body_text TEXT NOT NULL COMMENT 'コメント本文',
  score INTEGER NOT NULL DEFAULT 0 COMMENT '投票スコア',
  created_at_source TIMESTAMP NOT NULL COMMENT '元投稿の日時',
  UNIQUE(source_thread_fk, source_comment_id),
  FOREIGN KEY(source_thread_fk) REFERENCES source_threads(id)
) COMMENT='Reddit コメント生データ: スレッド内の議論構造を保持し、要約・スタンス分析に使用';

-- AI 要約結果: LLM による翻訳・要約・スタンス分析
CREATE TABLE IF NOT EXISTS ai_summaries (
  id VARCHAR(191) PRIMARY KEY COMMENT '内部 UUID',
  topic_group_id VARCHAR(191) NOT NULL COMMENT '関連トピックグループ',
  provider_name VARCHAR(191) NOT NULL COMMENT 'LLM プロバイダ (例: openai, anthropic)',
  model_name VARCHAR(191) NOT NULL COMMENT 'モデル名 (例: gpt-4o, claude-3-5-sonnet)',
  prompt_version VARCHAR(64) NOT NULL COMMENT 'プロンプトバージョン (回帰テスト用)',
  translation_ja TEXT NOT NULL COMMENT '日本語訳',
  summary_ja TEXT NOT NULL COMMENT '要約文',
  key_points_json JSON NOT NULL COMMENT '主要論点の JSON 配列',
  stance_label VARCHAR(191) NOT NULL COMMENT 'スタンスラベル (例: positive, neutral, negative, mixed)',
  token_input INTEGER NOT NULL DEFAULT 0 COMMENT '入力トークン数',
  token_output INTEGER NOT NULL DEFAULT 0 COMMENT '出力トークン数',
  latency_ms INTEGER NOT NULL DEFAULT 0 COMMENT '生成 latency (ms)',
  status VARCHAR(32) NOT NULL COMMENT 'ステータス (pending: 処理中, completed: 完了, failed: 失敗)',
  created_at TIMESTAMP NOT NULL COMMENT '作成日時',
  FOREIGN KEY(topic_group_id) REFERENCES topic_groups(id)
) COMMENT='AI 要約結果: LLM による翻訳・要約・スタンス分析。再生成で履歴を保持';

-- トピックグループのテーマ別・新着順検索用
CREATE INDEX IF NOT EXISTS idx_topic_groups_theme_published_at
  ON topic_groups(theme_slug, published_at DESC) COMMENT='フロントエンドの新着リスト用';

-- 要約のステータス・新着順検索用
CREATE INDEX IF NOT EXISTS idx_ai_summaries_topic_status_created_at
  ON ai_summaries(topic_group_id, status, created_at DESC) COMMENT='再生成履歴の参照用';

-- ジョブ実行履歴: 非同期処理の管理とトレーサビリティ
CREATE TABLE IF NOT EXISTS job_executions (
  id VARCHAR(191) PRIMARY KEY COMMENT '内部 UUID',
  type INTEGER NOT NULL COMMENT 'ジョブ種別 (Enum: 1=収集, 2=要約, 3=再試行)',
  status INTEGER NOT NULL COMMENT 'ステータス (Enum: 1=待機中, 2=実行中, 3=完了, 4=失敗)',
  target_id VARCHAR(191) NOT NULL COMMENT '対象ID (例: topic_group_id)',
  target_label VARCHAR(191) NOT NULL COMMENT '対象表示名',
  requested_by VARCHAR(191) NOT NULL COMMENT '実行主体 (例: worker, admin)',
  idempotency_key VARCHAR(191) NOT NULL UNIQUE COMMENT '重複実行防止用キー',
  trace_id VARCHAR(64) NOT NULL COMMENT '分散トレーシング用 ID',
  error_code VARCHAR(191) NOT NULL DEFAULT '' COMMENT 'エラーコード',
  error_message TEXT NOT NULL DEFAULT '' COMMENT 'エラーメッセージ',
  requested_at TIMESTAMP NOT NULL COMMENT 'リクエスト日時',
  started_at TIMESTAMP NULL COMMENT '開始日時',
  finished_at TIMESTAMP NULL COMMENT '完了日時'
) COMMENT='ジョブ実行履歴: 非同期処理の管理とトレーサビリティを確保';
