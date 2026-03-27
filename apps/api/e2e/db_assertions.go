//go:build e2e

package e2e

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	adminv1 "github.com/XRayZen/reddit-ai-digest/packages/proto/gen/go/admin/v1"
	"gorm.io/gorm"
)

type themeSnapshot struct {
	Slug         string
	Name         string
	Description  string
	ArticleCount int64
	UpdatedAt    time.Time
}

type articleCardSnapshot struct {
	ID          string
	ThemeSlug   string
	Title       string
	Summary     string
	SourceURL   string
	PublishedAt time.Time
	StanceLabel string
	PointCount  int
}

type articleDetailSnapshot struct {
	ID              string
	ThemeSlug       string
	Title           string
	SourceURL       string
	SourceSiteLabel string
	PublishedAt     time.Time
	Translation     string
	Summary         string
	KeyPoints       []string
	StanceLabel     string
}

type jobExecutionSnapshot struct {
	ID             string
	Type           adminv1.JobType
	Status         adminv1.JobStatus
	TargetID       string
	TargetLabel    string
	RequestedBy    string
	IdempotencyKey string
	TraceID        string
}

// loadThemeSnapshot はテーマ一覧・詳細の期待値を DB から直接組み立てる。
// API のハードコード期待値を減らし、seed データ変更時の追従箇所をこの層に閉じ込める。
func loadThemeSnapshot(ctx context.Context, db *gorm.DB, slug string) (themeSnapshot, error) {
	var row struct {
		Slug         string
		Name         string
		Description  string
		ArticleCount int64
		UpdatedAt    time.Time
	}

	err := db.WithContext(ctx).
		Table("themes AS t").
		Select(`
			t.slug,
			t.name,
			t.description,
			t.updated_at,
			COUNT(tg.id) AS article_count
		`).
		Joins(`LEFT JOIN topic_groups AS tg ON tg.theme_slug = t.slug AND tg.status = 'published'`).
		Where("t.slug = ? AND t.is_active = ?", slug, true).
		Group("t.slug, t.name, t.description, t.updated_at").
		Take(&row).Error
	if err != nil {
		return themeSnapshot{}, fmt.Errorf("load theme snapshot: %w", err)
	}

	return themeSnapshot(row), nil
}

// loadArticleCardSnapshot は記事一覧で見えてよい項目だけを DB から再構成する。
// 一覧 API が最新 completed summary を選ぶ規則と同じ join 条件をここでも使う。
func loadArticleCardSnapshot(ctx context.Context, db *gorm.DB, id string) (articleCardSnapshot, error) {
	var row struct {
		ID            string
		ThemeSlug     string
		Title         string
		Summary       string
		SourceURL     string
		PublishedAt   time.Time
		StanceLabel   string
		KeyPointsJSON string
	}

	err := db.WithContext(ctx).
		Table("topic_groups AS tg").
		Select(`
			tg.id,
			tg.theme_slug,
			st.title,
			ai.summary_ja AS summary,
			COALESCE(NULLIF(st.external_url, ''), st.permalink) AS source_url,
			tg.published_at,
			ai.stance_label,
			ai.key_points_json
		`).
		Joins("JOIN source_threads AS st ON st.id = tg.primary_source_thread_id").
		Joins(`
			JOIN ai_summaries AS ai
				ON ai.id = (
					SELECT s2.id
					FROM ai_summaries AS s2
					WHERE s2.topic_group_id = tg.id AND s2.status = ?
					ORDER BY s2.created_at DESC, s2.id DESC
					LIMIT 1
				)
		`, "completed").
		Where("tg.id = ? AND tg.status = ?", id, "published").
		Take(&row).Error
	if err != nil {
		return articleCardSnapshot{}, fmt.Errorf("load article card snapshot: %w", err)
	}

	var keyPoints []string
	if err := json.Unmarshal([]byte(row.KeyPointsJSON), &keyPoints); err != nil {
		return articleCardSnapshot{}, fmt.Errorf("decode article card key points: %w", err)
	}

	return articleCardSnapshot{
		ID:          row.ID,
		ThemeSlug:   row.ThemeSlug,
		Title:       row.Title,
		Summary:     row.Summary,
		SourceURL:   row.SourceURL,
		PublishedAt: row.PublishedAt,
		StanceLabel: row.StanceLabel,
		PointCount:  len(keyPoints),
	}, nil
}

// loadArticleDetailSnapshot は詳細 API と同じ join 規則で完全な期待値を作る。
func loadArticleDetailSnapshot(ctx context.Context, db *gorm.DB, id string) (articleDetailSnapshot, error) {
	var row struct {
		ID            string
		ThemeSlug     string
		Title         string
		SourceURL     string
		Subreddit     string
		PublishedAt   time.Time
		Translation   string
		Summary       string
		KeyPointsJSON string
		StanceLabel   string
	}

	err := db.WithContext(ctx).
		Table("topic_groups AS tg").
		Select(`
			tg.id,
			tg.theme_slug,
			st.title,
			COALESCE(NULLIF(st.external_url, ''), st.permalink) AS source_url,
			st.subreddit,
			tg.published_at,
			ai.translation_ja AS translation,
			ai.summary_ja AS summary,
			ai.key_points_json,
			ai.stance_label
		`).
		Joins("JOIN source_threads AS st ON st.id = tg.primary_source_thread_id").
		Joins(`
			JOIN ai_summaries AS ai
				ON ai.id = (
					SELECT s2.id
					FROM ai_summaries AS s2
					WHERE s2.topic_group_id = tg.id AND s2.status = ?
					ORDER BY s2.created_at DESC, s2.id DESC
					LIMIT 1
				)
		`, "completed").
		Where("tg.id = ? AND tg.status = ?", id, "published").
		Take(&row).Error
	if err != nil {
		return articleDetailSnapshot{}, fmt.Errorf("load article detail snapshot: %w", err)
	}

	var keyPoints []string
	if err := json.Unmarshal([]byte(row.KeyPointsJSON), &keyPoints); err != nil {
		return articleDetailSnapshot{}, fmt.Errorf("decode article detail key points: %w", err)
	}

	return articleDetailSnapshot{
		ID:              row.ID,
		ThemeSlug:       row.ThemeSlug,
		Title:           row.Title,
		SourceURL:       row.SourceURL,
		SourceSiteLabel: "Reddit / r/" + row.Subreddit,
		PublishedAt:     row.PublishedAt,
		Translation:     row.Translation,
		Summary:         row.Summary,
		KeyPoints:       keyPoints,
		StanceLabel:     row.StanceLabel,
	}, nil
}

// loadJobExecutionByIdempotencyKey は管理 REST が追加した job 行の永続化結果を確認する。
func loadJobExecutionByIdempotencyKey(ctx context.Context, db *gorm.DB, idempotencyKey string) (jobExecutionSnapshot, error) {
	var row struct {
		ID             string
		Type           int32
		Status         int32
		TargetID       string
		TargetLabel    string
		RequestedBy    string
		IdempotencyKey string
		TraceID        string
	}

	err := db.WithContext(ctx).
		Table("job_executions").
		Where("idempotency_key = ?", idempotencyKey).
		Take(&row).Error
	if err != nil {
		return jobExecutionSnapshot{}, fmt.Errorf("load job execution snapshot: %w", err)
	}

	return jobExecutionSnapshot{
		ID:             row.ID,
		Type:           adminv1.JobType(row.Type),
		Status:         adminv1.JobStatus(row.Status),
		TargetID:       row.TargetID,
		TargetLabel:    row.TargetLabel,
		RequestedBy:    row.RequestedBy,
		IdempotencyKey: row.IdempotencyKey,
		TraceID:        row.TraceID,
	}, nil
}
