-- シードデータ: 開発・検証用の初期データ
-- 再実行可能なSQLにするため、べき等性を考慮したINSERTを使用する

-- ==============================================================================
-- themes (4件)
-- Slug が PRIMARY KEY なので INSERT IGNORE で重複回避
-- ==============================================================================
INSERT IGNORE INTO themes (slug, name, description, is_active, updated_at) VALUES
('software-engineering', 'Software Engineering', '設計、保守、レビュー文化の変化を追うテーマ。', 1, '2026-03-20 10:00:00'),
('local-llm', 'Local LLM', '個人環境での推論、量子化、運用知見を扱うテーマ。', 1, '2026-03-19 05:00:00'),
('image-generation', 'Image Generation AI', '画像生成ワークフローとモデル比較を扱うテーマ。', 1, '2026-03-17 08:00:00'),
('amd-rocm', 'AMD ROCm', 'ROCm の導入、検証、実運用の情報をまとめるテーマ。', 1, '2026-03-15 12:00:00');

-- ==============================================================================
-- source_threads (7件)
-- id が PRIMARY KEY なので INSERT IGNORE
-- ==============================================================================
INSERT IGNORE INTO source_threads (
  id, source_type, source_thread_id, theme_slug, subreddit, title, body_text,
  author_name, score, num_comments, permalink, external_url, raw_snapshot_s3_key,
  created_at_source, ingested_at
) VALUES
('thread-se-001', 'reddit', 'se001', 'software-engineering', 'softwareengineering',
 'Senior engineers are replacing endless sprint churn with release trains',
 'body', 'user1', 120, 33,
 'https://reddit.com/r/softwareengineering/comments/se001',
 'https://reddit.com/r/softwareengineering/comments/se001',
 'raw/se001.json', '2026-03-20 10:00:00', '2026-03-20 11:00:00'),
('thread-se-002', 'reddit', 'se002', 'software-engineering', 'softwareengineering',
 'Teams are deleting flaky integration tests faster than fixing them',
 'body', 'user2', 98, 20,
 'https://reddit.com/r/softwareengineering/comments/se002',
 'https://reddit.com/r/softwareengineering/comments/se002',
 'raw/se002.json', '2026-03-18 09:00:00', '2026-03-18 10:00:00'),
('thread-se-003', 'reddit', 'se003', 'software-engineering', 'softwareengineering',
 'Architecture docs are back because AI tools need explicit context',
 'body', 'user3', 101, 12,
 'https://reddit.com/r/softwareengineering/comments/se003',
 'https://reddit.com/r/softwareengineering/comments/se003',
 'raw/se003.json', '2026-03-14 03:00:00', '2026-03-14 04:00:00'),
('thread-llm-001', 'reddit', 'llm001', 'local-llm', 'LocalLLaMA',
 'People are standardizing on 4-bit models for daily coding assistants',
 'body', 'user4', 110, 44,
 'https://reddit.com/r/LocalLLaMA/comments/llm001',
 'https://reddit.com/r/LocalLLaMA/comments/llm001',
 'raw/llm001.json', '2026-03-19 05:00:00', '2026-03-19 06:00:00'),
('thread-llm-002', 'reddit', 'llm002', 'local-llm', 'LocalLLaMA',
 'Context window benchmarks still mislead desktop users',
 'body', 'user5', 90, 19,
 'https://reddit.com/r/LocalLLaMA/comments/llm002',
 'https://reddit.com/r/LocalLLaMA/comments/llm002',
 'raw/llm002.json', '2026-03-16 02:00:00', '2026-03-16 03:00:00'),
('thread-img-001', 'reddit', 'img001', 'image-generation', 'StableDiffusion',
 'Studios are treating prompt presets like LUT packs',
 'body', 'user6', 87, 18,
 'https://reddit.com/r/StableDiffusion/comments/img001',
 'https://reddit.com/r/StableDiffusion/comments/img001',
 'raw/img001.json', '2026-03-17 08:00:00', '2026-03-17 09:00:00'),
('thread-rocm-001', 'reddit', 'rocm001', 'amd-rocm', 'ROCm',
 'ROCm users are documenting kernel pinning to avoid surprise regressions',
 'body', 'user7', 77, 21,
 'https://reddit.com/r/ROCm/comments/rocm001',
 'https://reddit.com/r/ROCm/comments/rocm001',
 'raw/rocm001.json', '2026-03-15 12:00:00', '2026-03-15 13:00:00');

-- ==============================================================================
-- topic_groups (7件)
-- id が PRIMARY KEY なので INSERT IGNORE
-- ==============================================================================
INSERT IGNORE INTO topic_groups (id, theme_slug, primary_source_thread_id, canonical_title, status, published_at, updated_at) VALUES
('se-001', 'software-engineering', 'thread-se-001',
 'Senior engineers are replacing endless sprint churn with release trains',
 'published', '2026-03-20 10:00:00', '2026-03-20 11:00:00'),
('se-002', 'software-engineering', 'thread-se-002',
 'Teams are deleting flaky integration tests faster than fixing them',
 'published', '2026-03-18 09:00:00', '2026-03-18 10:00:00'),
('se-003', 'software-engineering', 'thread-se-003',
 'Architecture docs are back because AI tools need explicit context',
 'published', '2026-03-14 03:00:00', '2026-03-14 04:00:00'),
('llm-001', 'local-llm', 'thread-llm-001',
 'People are standardizing on 4-bit models for daily coding assistants',
 'published', '2026-03-19 05:00:00', '2026-03-19 06:00:00'),
('llm-002', 'local-llm', 'thread-llm-002',
 'Context window benchmarks still mislead desktop users',
 'published', '2026-03-16 02:00:00', '2026-03-16 03:00:00'),
('img-001', 'image-generation', 'thread-img-001',
 'Studios are treating prompt presets like LUT packs',
 'published', '2026-03-17 08:00:00', '2026-03-17 09:00:00'),
('rocm-001', 'amd-rocm', 'thread-rocm-001',
 'ROCm users are documenting kernel pinning to avoid surprise regressions',
 'published', '2026-03-15 12:00:00', '2026-03-15 13:00:00');

-- ==============================================================================
-- ai_summaries (8件)
-- id が PRIMARY KEY なので INSERT IGNORE
-- ==============================================================================
INSERT IGNORE INTO ai_summaries (
  id, topic_group_id, provider_name, model_name, prompt_version,
  translation_ja, summary_ja, key_points_json, stance_label, status, created_at
) VALUES
('summary-se-001-old', 'se-001', 'openai-compatible', 'gpt-5-mini', 'v0',
 'old', 'old', '["old"]', '旧', 'completed', '2026-03-20 11:30:00'),
('summary-se-001', 'se-001', 'openai-compatible', 'gpt-5-mini', 'v1',
'多くのチームが、二週間スプリントを盲目的に回すより、リリース単位で機能を束ねて合意形成した方が、依存関係と説明コストを減らせると報告している。',
'議論では、細かい反復そのものより、いつ何を出すのかを共有できる運用形の方が価値を生むという意見が優勢だった。',
'["スプリント速度より、リリース意図の共有が重視されている。","依存チームが多い環境では、固定 cadence の方が説明しやすい。","完了条件を小さなタスクではなく出荷可能性で見る傾向がある。","実装速度より説明コスト削減が重視された。"]',
 '運用改善', 'completed', '2026-03-20 12:00:00'),
('summary-se-002', 'se-002', 'openai-compatible', 'gpt-5-mini', 'v1',
'壊れやすい統合テストを守るコストが高すぎるため、契約テストと実運用監視へ責任を分散する流れが語られている。',
'参加者は、CI を不安定にする統合テストを無理に延命させるより、境界契約の保証と本番観測の強化で品質を保つ方が現実的だと述べている。',
'["テストの数ではなく信頼度を重視する傾向がある。","契約テストとアラート設計の組み合わせが代替策として挙がった。","不安定テストの維持コストを定量化すべきという声が多い。"]',
 '品質戦略', 'completed', '2026-03-18 11:00:00'),
('summary-se-003', 'se-003', 'openai-compatible', 'gpt-5-mini', 'v1',
'AI ツールに正しい文脈を渡すため、設計意図を文章で残す重要性が再確認されている。',
'過去には更新されない設計書が軽視されていたが、AI 支援開発では暗黙知が誤生成の原因になるため、軽量でも明示的な文書が必要という意見が多かった。',
'["AI 利用が設計文書の必要性を押し上げている。","巨大文書より、更新しやすい短い文書が好まれている。","オンボーディング効率の改善も副次効果として挙がった。"]',
 '設計文化', 'completed', '2026-03-14 05:00:00'),
('summary-llm-001', 'llm-001', 'openai-compatible', 'gpt-5-mini', 'v1',
'日常的なコーディング支援では、最大性能よりも VRAM 使用量と応答速度の釣り合いが重視され、4-bit 量子化モデルに運用が収束しつつあるという報告が共有されている。',
'議論では、高精度モデルを常時動かすより、即応性の高い 4-bit 構成を日々の補助に使い、重い検証だけ別系統に逃がす運用が支持されていた。',
'["常用アシスタントでは応答速度と VRAM 節約の両立が重視されている。","重いモデルは必要時だけ使う分離運用が好まれている。","量子化による精度低下より、待ち時間短縮の便益が大きい。","コーディング補助ではレイテンシの低さが継続利用を左右する。"]',
 '推論最適化', 'completed', '2026-03-19 07:00:00'),
('summary-llm-002', 'llm-002', 'openai-compatible', 'gpt-5-mini', 'v1',
'最大コンテキスト長だけを比較しても、デスクトップ実運用では速度低下や文脈保持の劣化を説明できないという指摘が共有されている。',
'参加者は、長大コンテキストの宣伝値よりも、一定長を超えたあとの速度低下や回答の崩れ方を評価すべきだと述べている。',
'["最大値より、長文入力時の品質低下カーブを測るべきという意見が多い。","デスクトップ環境ではスループット低下が実用性を左右する。","ベンチマーク表の数値だけでは常用体験を予測しにくい。"]',
 '評価観点', 'completed', '2026-03-16 04:00:00'),
('summary-img-001', 'img-001', 'openai-compatible', 'gpt-5-mini', 'v1',
'制作現場では、よく使うプロンプトと生成設定を LUT パックのような再利用資産として管理する運用が広がっている。',
'議論では、チームで共有しやすい prompt preset を整備し、再現性を上げるワークフローが支持されていた。',
'["プリセットの資産化が進んでいる。","制作チームで再現性が重視されている。","設定共有の運用が一般化している。","ワークフロー全体での標準化が重視された。"]',
 '制作フロー', 'completed', '2026-03-17 10:00:00'),
('summary-rocm-001', 'rocm-001', 'openai-compatible', 'gpt-5-mini', 'v1',
'カーネル更新とドライバ整合性を運用ルールで吸収する知見が蓄積している。',
'議論では、ROCm 環境の安定運用にはパッケージ更新より運用手順の固定が重要だという経験談が多かった。',
'["カーネル pinning が広く共有されている。","予期しない更新が障害原因になりやすい。","導入より保守運用の知見が重視されている。","安定運用のための手順書が価値を持つ。"]',
 '運用ノウハウ', 'completed', '2026-03-15 14:00:00');

-- ==============================================================================
-- job_executions (2件)
-- idempotency_key が UNIQUE なので ON DUPLICATE KEY UPDATE でべき等性確保
-- ==============================================================================
INSERT INTO job_executions (
  id, type, status, target_id, target_label, requested_by, idempotency_key,
  trace_id, error_code, error_message, requested_at, started_at, finished_at
) VALUES
('job_ingest_001', 1, 3, 'software-engineering', 'theme:software-engineering', 'seed',
 'seed-ingest-1', 'trc_seed_ingest', '', '', '2026-03-20 12:30:00', '2026-03-20 12:30:00', '2026-03-20 12:35:00')
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  finished_at = VALUES(finished_at);

INSERT INTO job_executions (
  id, type, status, target_id, target_label, requested_by, idempotency_key,
  trace_id, error_code, error_message, requested_at, started_at, finished_at
) VALUES
('job_resum_001', 2, 2, 'se-001', 'article:se-001', 'seed',
 'seed-resum-1', 'trc_seed_resum', '', '', '2026-03-20 13:00:00', '2026-03-20 13:00:00', NULL)
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  started_at = VALUES(started_at),
  finished_at = VALUES(finished_at);
