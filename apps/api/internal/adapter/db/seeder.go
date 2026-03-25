package db

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/XRayZen/reddit-ai-digest/internal/platform/jobs"
	adminv1 "github.com/XRayZen/reddit-ai-digest/packages/proto/gen/go/admin/v1"
	"gorm.io/gorm"
)

// Seed は開発・検証用の初期データをDBに投入する。
// 既存レコードは上書きせず、ジョブのみべき等性キーで重複チェックを行う。
func Seed(ctx context.Context, db *gorm.DB) error {
	mustTime := func(value string) time.Time {
		parsed, err := time.Parse(time.RFC3339, value)
		if err != nil {
			panic(err)
		}
		return parsed
	}
	// mustJSON はJSON配列を文字列化するヘルパー。
	// パースに失敗した場合はpanicを起こし、データ定義ミスを早期検出する。
	mustJSON := func(values []string) string {
		buf, err := json.Marshal(values)
		if err != nil {
			panic(err)
		}
		return string(buf)
	}

	themes := []themeModel{
		{Slug: "software-engineering", Name: "Software Engineering", Description: "設計、保守、レビュー文化の変化を追うテーマ。", IsActive: true, UpdatedAt: mustTime("2026-03-20T10:00:00Z")},
		{Slug: "local-llm", Name: "Local LLM", Description: "個人環境での推論、量子化、運用知見を扱うテーマ。", IsActive: true, UpdatedAt: mustTime("2026-03-19T05:00:00Z")},
		{Slug: "image-generation", Name: "Image Generation AI", Description: "画像生成ワークフローとモデル比較を扱うテーマ。", IsActive: true, UpdatedAt: mustTime("2026-03-17T08:00:00Z")},
		{Slug: "amd-rocm", Name: "AMD ROCm", Description: "ROCm の導入、検証、実運用の情報をまとめるテーマ。", IsActive: true, UpdatedAt: mustTime("2026-03-15T12:00:00Z")},
	}
	sourceThreads := []sourceThreadModel{
		{ID: "thread-se-001", SourceType: "reddit", SourceThreadID: "se001", ThemeSlug: "software-engineering", Subreddit: "softwareengineering", Title: "Senior engineers are replacing endless sprint churn with release trains", BodyText: "body", AuthorName: "user1", Score: 120, NumComments: 33, Permalink: "https://reddit.com/r/softwareengineering/comments/se001", ExternalURL: "https://reddit.com/r/softwareengineering/comments/se001", RawSnapshotS3Key: "raw/se001.json", CreatedAtSource: mustTime("2026-03-20T10:00:00Z"), IngestedAt: mustTime("2026-03-20T11:00:00Z")},
		{ID: "thread-se-002", SourceType: "reddit", SourceThreadID: "se002", ThemeSlug: "software-engineering", Subreddit: "softwareengineering", Title: "Teams are deleting flaky integration tests faster than fixing them", BodyText: "body", AuthorName: "user2", Score: 98, NumComments: 20, Permalink: "https://reddit.com/r/softwareengineering/comments/se002", ExternalURL: "https://reddit.com/r/softwareengineering/comments/se002", RawSnapshotS3Key: "raw/se002.json", CreatedAtSource: mustTime("2026-03-18T09:00:00Z"), IngestedAt: mustTime("2026-03-18T10:00:00Z")},
		{ID: "thread-se-003", SourceType: "reddit", SourceThreadID: "se003", ThemeSlug: "software-engineering", Subreddit: "softwareengineering", Title: "Architecture docs are back because AI tools need explicit context", BodyText: "body", AuthorName: "user3", Score: 101, NumComments: 12, Permalink: "https://reddit.com/r/softwareengineering/comments/se003", ExternalURL: "https://reddit.com/r/softwareengineering/comments/se003", RawSnapshotS3Key: "raw/se003.json", CreatedAtSource: mustTime("2026-03-14T03:00:00Z"), IngestedAt: mustTime("2026-03-14T04:00:00Z")},
		{ID: "thread-llm-001", SourceType: "reddit", SourceThreadID: "llm001", ThemeSlug: "local-llm", Subreddit: "LocalLLaMA", Title: "People are standardizing on 4-bit models for daily coding assistants", BodyText: "body", AuthorName: "user4", Score: 110, NumComments: 44, Permalink: "https://reddit.com/r/LocalLLaMA/comments/llm001", ExternalURL: "https://reddit.com/r/LocalLLaMA/comments/llm001", RawSnapshotS3Key: "raw/llm001.json", CreatedAtSource: mustTime("2026-03-19T05:00:00Z"), IngestedAt: mustTime("2026-03-19T06:00:00Z")},
		{ID: "thread-llm-002", SourceType: "reddit", SourceThreadID: "llm002", ThemeSlug: "local-llm", Subreddit: "LocalLLaMA", Title: "Context window benchmarks still mislead desktop users", BodyText: "body", AuthorName: "user5", Score: 90, NumComments: 19, Permalink: "https://reddit.com/r/LocalLLaMA/comments/llm002", ExternalURL: "https://reddit.com/r/LocalLLaMA/comments/llm002", RawSnapshotS3Key: "raw/llm002.json", CreatedAtSource: mustTime("2026-03-16T02:00:00Z"), IngestedAt: mustTime("2026-03-16T03:00:00Z")},
		{ID: "thread-img-001", SourceType: "reddit", SourceThreadID: "img001", ThemeSlug: "image-generation", Subreddit: "StableDiffusion", Title: "Studios are treating prompt presets like LUT packs", BodyText: "body", AuthorName: "user6", Score: 87, NumComments: 18, Permalink: "https://reddit.com/r/StableDiffusion/comments/img001", ExternalURL: "https://reddit.com/r/StableDiffusion/comments/img001", RawSnapshotS3Key: "raw/img001.json", CreatedAtSource: mustTime("2026-03-17T08:00:00Z"), IngestedAt: mustTime("2026-03-17T09:00:00Z")},
		{ID: "thread-rocm-001", SourceType: "reddit", SourceThreadID: "rocm001", ThemeSlug: "amd-rocm", Subreddit: "ROCm", Title: "ROCm users are documenting kernel pinning to avoid surprise regressions", BodyText: "body", AuthorName: "user7", Score: 77, NumComments: 21, Permalink: "https://reddit.com/r/ROCm/comments/rocm001", ExternalURL: "https://reddit.com/r/ROCm/comments/rocm001", RawSnapshotS3Key: "raw/rocm001.json", CreatedAtSource: mustTime("2026-03-15T12:00:00Z"), IngestedAt: mustTime("2026-03-15T13:00:00Z")},
	}
	topicGroups := []topicGroupModel{
		{ID: "se-001", ThemeSlug: "software-engineering", PrimarySourceThreadID: "thread-se-001", CanonicalTitle: sourceThreads[0].Title, Status: "published", PublishedAt: mustTime("2026-03-20T10:00:00Z"), UpdatedAt: mustTime("2026-03-20T11:00:00Z")},
		{ID: "se-002", ThemeSlug: "software-engineering", PrimarySourceThreadID: "thread-se-002", CanonicalTitle: sourceThreads[1].Title, Status: "published", PublishedAt: mustTime("2026-03-18T09:00:00Z"), UpdatedAt: mustTime("2026-03-18T10:00:00Z")},
		{ID: "se-003", ThemeSlug: "software-engineering", PrimarySourceThreadID: "thread-se-003", CanonicalTitle: sourceThreads[2].Title, Status: "published", PublishedAt: mustTime("2026-03-14T03:00:00Z"), UpdatedAt: mustTime("2026-03-14T04:00:00Z")},
		{ID: "llm-001", ThemeSlug: "local-llm", PrimarySourceThreadID: "thread-llm-001", CanonicalTitle: sourceThreads[3].Title, Status: "published", PublishedAt: mustTime("2026-03-19T05:00:00Z"), UpdatedAt: mustTime("2026-03-19T06:00:00Z")},
		{ID: "llm-002", ThemeSlug: "local-llm", PrimarySourceThreadID: "thread-llm-002", CanonicalTitle: sourceThreads[4].Title, Status: "published", PublishedAt: mustTime("2026-03-16T02:00:00Z"), UpdatedAt: mustTime("2026-03-16T03:00:00Z")},
		{ID: "img-001", ThemeSlug: "image-generation", PrimarySourceThreadID: "thread-img-001", CanonicalTitle: sourceThreads[5].Title, Status: "published", PublishedAt: mustTime("2026-03-17T08:00:00Z"), UpdatedAt: mustTime("2026-03-17T09:00:00Z")},
		{ID: "rocm-001", ThemeSlug: "amd-rocm", PrimarySourceThreadID: "thread-rocm-001", CanonicalTitle: sourceThreads[6].Title, Status: "published", PublishedAt: mustTime("2026-03-15T12:00:00Z"), UpdatedAt: mustTime("2026-03-15T13:00:00Z")},
	}
	summaries := []aiSummaryModel{
		{ID: "summary-se-001-old", TopicGroupID: "se-001", ProviderName: "openai-compatible", ModelName: "gpt-5-mini", PromptVersion: "v0", TranslationJA: "old", SummaryJA: "old", KeyPointsJSON: mustJSON([]string{"old"}), StanceLabel: "旧", Status: "completed", CreatedAt: mustTime("2026-03-20T11:30:00Z")},
		{ID: "summary-se-001", TopicGroupID: "se-001", ProviderName: "openai-compatible", ModelName: "gpt-5-mini", PromptVersion: "v1", TranslationJA: "多くのチームが、二週間スプリントを盲目的に回すより、リリース単位で機能を束ねて合意形成した方が、依存関係と説明コストを減らせると報告している。", SummaryJA: "議論では、細かい反復そのものより、いつ何を出すのかを共有できる運用形の方が価値を生むという意見が優勢だった。", KeyPointsJSON: mustJSON([]string{"スプリント速度より、リリース意図の共有が重視されている。", "依存チームが多い環境では、固定 cadence の方が説明しやすい。", "完了条件を小さなタスクではなく出荷可能性で見る傾向がある。", "実装速度より説明コスト削減が重視された。"}), StanceLabel: "運用改善", Status: "completed", CreatedAt: mustTime("2026-03-20T12:00:00Z")},
		{ID: "summary-se-002", TopicGroupID: "se-002", ProviderName: "openai-compatible", ModelName: "gpt-5-mini", PromptVersion: "v1", TranslationJA: "壊れやすい統合テストを守るコストが高すぎるため、契約テストと実運用監視へ責任を分散する流れが語られている。", SummaryJA: "参加者は、CI を不安定にする統合テストを無理に延命させるより、境界契約の保証と本番観測の強化で品質を保つ方が現実的だと述べている。", KeyPointsJSON: mustJSON([]string{"テストの数ではなく信頼度を重視する傾向がある。", "契約テストとアラート設計の組み合わせが代替策として挙がった。", "不安定テストの維持コストを定量化すべきという声が多い。"}), StanceLabel: "品質戦略", Status: "completed", CreatedAt: mustTime("2026-03-18T11:00:00Z")},
		{ID: "summary-se-003", TopicGroupID: "se-003", ProviderName: "openai-compatible", ModelName: "gpt-5-mini", PromptVersion: "v1", TranslationJA: "AI ツールに正しい文脈を渡すため、設計意図を文章で残す重要性が再確認されている。", SummaryJA: "過去には更新されない設計書が軽視されていたが、AI 支援開発では暗黙知が誤生成の原因になるため、軽量でも明示的な文書が必要という意見が多かった。", KeyPointsJSON: mustJSON([]string{"AI 利用が設計文書の必要性を押し上げている。", "巨大文書より、更新しやすい短い文書が好まれている。", "オンボーディング効率の改善も副次効果として挙がった。"}), StanceLabel: "設計文化", Status: "completed", CreatedAt: mustTime("2026-03-14T05:00:00Z")},
		{ID: "summary-llm-001", TopicGroupID: "llm-001", ProviderName: "openai-compatible", ModelName: "gpt-5-mini", PromptVersion: "v1", TranslationJA: "日常的なコーディング支援では、最大性能よりも VRAM 使用量と応答速度の釣り合いが重視され、4-bit 量子化モデルに運用が収束しつつあるという報告が共有されている。", SummaryJA: "議論では、高精度モデルを常時動かすより、即応性の高い 4-bit 構成を日々の補助に使い、重い検証だけ別系統に逃がす運用が支持されていた。", KeyPointsJSON: mustJSON([]string{"常用アシスタントでは応答速度と VRAM 節約の両立が重視されている。", "重いモデルは必要時だけ使う分離運用が好まれている。", "量子化による精度低下より、待ち時間短縮の便益が大きい。", "コーディング補助ではレイテンシの低さが継続利用を左右する。"}), StanceLabel: "推論最適化", Status: "completed", CreatedAt: mustTime("2026-03-19T07:00:00Z")},
		{ID: "summary-llm-002", TopicGroupID: "llm-002", ProviderName: "openai-compatible", ModelName: "gpt-5-mini", PromptVersion: "v1", TranslationJA: "最大コンテキスト長だけを比較しても、デスクトップ実運用では速度低下や文脈保持の劣化を説明できないという指摘が共有されている。", SummaryJA: "参加者は、長大コンテキストの宣伝値よりも、一定長を超えたあとの速度低下や回答の崩れ方を評価すべきだと述べている。", KeyPointsJSON: mustJSON([]string{"最大値より、長文入力時の品質低下カーブを測るべきという意見が多い。", "デスクトップ環境ではスループット低下が実用性を左右する。", "ベンチマーク表の数値だけでは常用体験を予測しにくい。"}), StanceLabel: "評価観点", Status: "completed", CreatedAt: mustTime("2026-03-16T04:00:00Z")},
		{ID: "summary-img-001", TopicGroupID: "img-001", ProviderName: "openai-compatible", ModelName: "gpt-5-mini", PromptVersion: "v1", TranslationJA: "制作現場では、よく使うプロンプトと生成設定を LUT パックのような再利用資産として管理する運用が広がっている。", SummaryJA: "議論では、チームで共有しやすい prompt preset を整備し、再現性を上げるワークフローが支持されていた。", KeyPointsJSON: mustJSON([]string{"プリセットの資産化が進んでいる。", "制作チームで再現性が重視されている。", "設定共有の運用が一般化している。", "ワークフロー全体での標準化が重視された。"}), StanceLabel: "制作フロー", Status: "completed", CreatedAt: mustTime("2026-03-17T10:00:00Z")},
		{ID: "summary-rocm-001", TopicGroupID: "rocm-001", ProviderName: "openai-compatible", ModelName: "gpt-5-mini", PromptVersion: "v1", TranslationJA: "カーネル更新とドライバ整合性を運用ルールで吸収する知見が蓄積している。", SummaryJA: "議論では、ROCm 環境の安定運用にはパッケージ更新より運用手順の固定が重要だという経験談が多かった。", KeyPointsJSON: mustJSON([]string{"カーネル pinning が広く共有されている。", "予期しない更新が障害原因になりやすい。", "導入より保守運用の知見が重視されている。", "安定運用のための手順書が価値を持つ。"}), StanceLabel: "運用ノウハウ", Status: "completed", CreatedAt: mustTime("2026-03-15T14:00:00Z")},
	}
	jobsSeed := []jobs.Job{
		{ID: "job_ingest_001", Type: adminv1.JobType_JOB_TYPE_INGEST, Status: adminv1.JobStatus_JOB_STATUS_COMPLETED, TargetID: "software-engineering", TargetLabel: "theme:software-engineering", RequestedBy: "seed", IdempotencyKey: "seed-ingest-1", TraceID: "trc_seed_ingest", RequestedAt: mustTime("2026-03-20T12:30:00Z")},
		{ID: "job_resum_001", Type: adminv1.JobType_JOB_TYPE_RESUMMARIZE, Status: adminv1.JobStatus_JOB_STATUS_RUNNING, TargetID: "se-001", TargetLabel: "article:se-001", RequestedBy: "seed", IdempotencyKey: "seed-resum-1", TraceID: "trc_seed_resum", RequestedAt: mustTime("2026-03-20T13:00:00Z")},
	}

	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, item := range themes {
			if err := tx.Save(&item).Error; err != nil {
				return fmt.Errorf("seed themes: %w", err)
			}
		}
		for _, item := range sourceThreads {
			if err := tx.Save(&item).Error; err != nil {
				return fmt.Errorf("seed source_threads: %w", err)
			}
		}
		for _, item := range topicGroups {
			if err := tx.Save(&item).Error; err != nil {
				return fmt.Errorf("seed topic_groups: %w", err)
			}
		}
		for _, item := range summaries {
			if err := tx.Save(&item).Error; err != nil {
				return fmt.Errorf("seed ai_summaries: %w", err)
			}
		}
		jobRepo := jobs.NewGormRepository(tx)
		for _, item := range jobsSeed {
			existing, err := jobRepo.FindByIdempotencyKey(ctx, item.IdempotencyKey)
			if err != nil {
				return fmt.Errorf("seed jobs find existing: %w", err)
			}
			if existing != nil {
				continue
			}
			if _, err := jobRepo.Enqueue(ctx, item); err != nil {
				return fmt.Errorf("seed jobs enqueue: %w", err)
			}
		}
		return nil
	})
}
