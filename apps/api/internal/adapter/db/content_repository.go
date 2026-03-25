// Package db はデータベースアクセスのアダプター実装を提供する。
// GORMを使用し、ドメインモデルとDBテーブルのマッピングを担当する。
package db

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/XRayZen/reddit-ai-digest/apps/api/internal/domain"
	"github.com/XRayZen/reddit-ai-digest/internal/platform/traceutil"
	"go.opentelemetry.io/otel"
	"gorm.io/gorm"
)

// ThemeRepository はテーマのデータアクセスを担当する。
type ThemeRepository struct {
	db     *gorm.DB
	logger *slog.Logger
}

// ArticleRepository は記事のデータアクセスを担当する。
// 複数テーブルの結合が必要な複雑なクエリを実行する。
type ArticleRepository struct {
	db     *gorm.DB
	logger *slog.Logger
}

func NewThemeRepository(db *gorm.DB, logger *slog.Logger) *ThemeRepository {
	return &ThemeRepository{db: db, logger: logger}
}

func NewArticleRepository(db *gorm.DB, logger *slog.Logger) *ArticleRepository {
	return &ArticleRepository{db: db, logger: logger}
}

type themeModel struct {
	Slug        string    `gorm:"column:slug;primaryKey"`
	Name        string    `gorm:"column:name"`
	Description string    `gorm:"column:description"`
	IsActive    bool      `gorm:"column:is_active"`
	UpdatedAt   time.Time `gorm:"column:updated_at;autoUpdateTime:false"`
}

func (themeModel) TableName() string { return "themes" }

type topicGroupModel struct {
	ID                    string    `gorm:"column:id;primaryKey"`
	ThemeSlug             string    `gorm:"column:theme_slug"`
	PrimarySourceThreadID string    `gorm:"column:primary_source_thread_id"`
	CanonicalTitle        string    `gorm:"column:canonical_title"`
	Status                string    `gorm:"column:status"`
	PublishedAt           time.Time `gorm:"column:published_at"`
	UpdatedAt             time.Time `gorm:"column:updated_at;autoUpdateTime:false"`
}

func (topicGroupModel) TableName() string { return "topic_groups" }

type sourceThreadModel struct {
	ID               string    `gorm:"column:id;primaryKey"`
	SourceType       string    `gorm:"column:source_type"`
	SourceThreadID   string    `gorm:"column:source_thread_id"`
	ThemeSlug        string    `gorm:"column:theme_slug"`
	Subreddit        string    `gorm:"column:subreddit"`
	Title            string    `gorm:"column:title"`
	BodyText         string    `gorm:"column:body_text"`
	AuthorName       string    `gorm:"column:author_name"`
	Score            int       `gorm:"column:score"`
	NumComments      int       `gorm:"column:num_comments"`
	Permalink        string    `gorm:"column:permalink"`
	ExternalURL      string    `gorm:"column:external_url"`
	RawSnapshotS3Key string    `gorm:"column:raw_snapshot_s3_key"`
	CreatedAtSource  time.Time `gorm:"column:created_at_source"`
	IngestedAt       time.Time `gorm:"column:ingested_at"`
}

func (sourceThreadModel) TableName() string { return "source_threads" }

// aiSummaryModel はAI要約結果のテーブル構造。
// 再要約で複数レコードが存在する場合、created_at順に最新版を選択する。
type aiSummaryModel struct {
	ID            string    `gorm:"column:id;primaryKey"`
	TopicGroupID  string    `gorm:"column:topic_group_id"`
	ProviderName  string    `gorm:"column:provider_name"`
	ModelName     string    `gorm:"column:model_name"`
	PromptVersion string    `gorm:"column:prompt_version"`
	TranslationJA string    `gorm:"column:translation_ja"`
	SummaryJA     string    `gorm:"column:summary_ja"`
	KeyPointsJSON string    `gorm:"column:key_points_json"`
	StanceLabel   string    `gorm:"column:stance_label"`
	TokenInput    int       `gorm:"column:token_input"`
	TokenOutput   int       `gorm:"column:token_output"`
	LatencyMS     int       `gorm:"column:latency_ms"`
	Status        string    `gorm:"column:status"`
	CreatedAt     time.Time `gorm:"column:created_at"`
}

func (aiSummaryModel) TableName() string { return "ai_summaries" }

// themeRow はテーマ一覧クエリの結果マッピング用。
type themeRow struct {
	Slug         string    `gorm:"column:slug"`
	Name         string    `gorm:"column:name"`
	Description  string    `gorm:"column:description"`
	UpdatedAt    time.Time `gorm:"column:updated_at"`
	ArticleCount int       `gorm:"column:article_count"`
}

// articleListRow は記事一覧クエリの結果マッピング用。
type articleListRow struct {
	ID            string    `gorm:"column:id"`
	ThemeSlug     string    `gorm:"column:theme_slug"`
	Title         string    `gorm:"column:title"`
	Summary       string    `gorm:"column:summary"`
	SourceURL     string    `gorm:"column:source_url"`
	PublishedAt   time.Time `gorm:"column:published_at"`
	StanceLabel   string    `gorm:"column:stance_label"`
	KeyPointsJSON string    `gorm:"column:key_points_json"`
}

// articleDetailRow は記事詳細クエリの結果マッピング用。
type articleDetailRow struct {
	ID            string    `gorm:"column:id"`
	ThemeSlug     string    `gorm:"column:theme_slug"`
	Title         string    `gorm:"column:title"`
	SourceURL     string    `gorm:"column:source_url"`
	Subreddit     string    `gorm:"column:subreddit"`
	PublishedAt   time.Time `gorm:"column:published_at"`
	Translation   string    `gorm:"column:translation"`
	Summary       string    `gorm:"column:summary"`
	KeyPointsJSON string    `gorm:"column:key_points_json"`
	StanceLabel   string    `gorm:"column:stance_label"`
}

// ListThemes はアクティブなテーマ一覧を取得する。
// limit+1件を取得し、hasMoreフラグで次ページの有無を判定する。
func (r *ThemeRepository) ListThemes(ctx context.Context, limit int, offset int) ([]domain.Theme, bool, error) {
	ctx, span := otel.Tracer("apps/api/db").Start(ctx, "ThemeRepository.ListThemes")
	defer span.End()

	r.logger.InfoContext(ctx, "listing themes", "trace_id", traceutil.FromContext(ctx), "limit", limit, "offset", offset)
	var rows []themeRow
	if err := r.db.WithContext(ctx).
		Table("themes AS t").
		Select(`
			t.slug,
			t.name,
			t.description,
			t.updated_at,
			COUNT(tg.id) AS article_count
		`).
		Joins(`LEFT JOIN topic_groups AS tg ON tg.theme_slug = t.slug AND tg.status = 'published'`).
		Where("t.is_active = ?", true).
		Group("t.slug, t.name, t.description, t.updated_at").
		Order("t.name ASC").
		Limit(limit + 1).
		Offset(offset).
		Scan(&rows).Error; err != nil {
		return nil, false, fmt.Errorf("list themes query: %w", err)
	}
	hasMore := len(rows) > limit
	if hasMore {
		rows = rows[:limit]
	}
	items := make([]domain.Theme, 0, len(rows))
	for _, row := range rows {
		items = append(items, domain.Theme{
			Slug:         row.Slug,
			Name:         row.Name,
			Description:  row.Description,
			ArticleCount: row.ArticleCount,
			UpdatedAt:    row.UpdatedAt,
		})
	}
	return items, hasMore, nil
}

// GetTheme は指定slugのテーマを取得する。
// 見つからない場合、domain.ErrNotFoundを返す。
func (r *ThemeRepository) GetTheme(ctx context.Context, slug string) (domain.Theme, error) {
	ctx, span := otel.Tracer("apps/api/db").Start(ctx, "ThemeRepository.GetTheme")
	defer span.End()

	r.logger.InfoContext(ctx, "loading theme", "trace_id", traceutil.FromContext(ctx), "slug", slug)
	var row themeRow
	err := r.db.WithContext(ctx).
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
		Scan(&row).Error
	if err != nil {
		return domain.Theme{}, fmt.Errorf("get theme query: %w", err)
	}
	if row.Slug == "" {
		return domain.Theme{}, domain.ErrNotFound
	}
	return domain.Theme{
		Slug:         row.Slug,
		Name:         row.Name,
		Description:  row.Description,
		ArticleCount: row.ArticleCount,
		UpdatedAt:    row.UpdatedAt,
	}, nil
}

// ListArticles は指定テーマの記事一覧を取得する。
// topic_groups, source_threads, ai_summariesを結合し、最新の要約を含む記事を返す。
// limit+1件を取得し、hasMoreフラグで次ページの有無を判定する。
func (r *ArticleRepository) ListArticles(ctx context.Context, themeSlug string, limit int, offset int) ([]domain.ArticleCard, bool, error) {
	ctx, span := otel.Tracer("apps/api/db").Start(ctx, "ArticleRepository.ListArticles")
	defer span.End()

	r.logger.InfoContext(ctx, "listing articles", "trace_id", traceutil.FromContext(ctx), "theme_slug", themeSlug, "limit", limit, "offset", offset)
	var rows []articleListRow
	if err := r.db.WithContext(ctx).
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
		// created_at だけでは同秒の再要約を一意に選べないため、id を tie-breaker にして最新 1 件へ固定する。
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
		Where("tg.theme_slug = ? AND tg.status = ?", themeSlug, "published").
		Order("tg.published_at DESC, tg.id DESC").
		Limit(limit + 1).
		Offset(offset).
		Scan(&rows).Error; err != nil {
		return nil, false, fmt.Errorf("list articles query: %w", err)
	}

	hasMore := len(rows) > limit
	if hasMore {
		rows = rows[:limit]
	}
	items := make([]domain.ArticleCard, 0, len(rows))
	for _, row := range rows {
		var keyPoints []string
		if err := json.Unmarshal([]byte(row.KeyPointsJSON), &keyPoints); err != nil {
			return nil, false, fmt.Errorf("decode article list key points: %w", err)
		}
		items = append(items, domain.ArticleCard{
			ID:          row.ID,
			ThemeSlug:   row.ThemeSlug,
			Title:       row.Title,
			Summary:     row.Summary,
			SourceURL:   row.SourceURL,
			PublishedAt: row.PublishedAt,
			StanceLabel: row.StanceLabel,
			PointCount:  len(keyPoints),
		})
	}
	return items, hasMore, nil
}

// GetArticle は指定IDの記事詳細を取得する。
// ListArticlesと同じ結合規則を使用し、一覧と詳細でレスポンスが整合するようにする。
func (r *ArticleRepository) GetArticle(ctx context.Context, id string) (domain.ArticleDetail, error) {
	ctx, span := otel.Tracer("apps/api/db").Start(ctx, "ArticleRepository.GetArticle")
	defer span.End()

	r.logger.InfoContext(ctx, "loading article", "trace_id", traceutil.FromContext(ctx), "id", id)
	var row articleDetailRow
	err := r.db.WithContext(ctx).
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
		// 詳細も一覧と同じ選択規則を使い、レスポンスごとの差異が出ないようにする。
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
		Scan(&row).Error
	if err != nil {
		return domain.ArticleDetail{}, fmt.Errorf("get article query: %w", err)
	}
	if row.ID == "" {
		return domain.ArticleDetail{}, domain.ErrNotFound
	}
	var keyPoints []string
	if err := json.Unmarshal([]byte(row.KeyPointsJSON), &keyPoints); err != nil {
		return domain.ArticleDetail{}, fmt.Errorf("decode article detail key points: %w", err)
	}
	return domain.ArticleDetail{
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

// ensureThemeExists は指定テーマが存在するか検証する。
// 存在しない場合、domain.ErrNotFoundを返す。
func (r *ArticleRepository) ensureThemeExists(ctx context.Context, themeSlug string) error {
	var theme themeModel
	if err := r.db.WithContext(ctx).Where("slug = ? AND is_active = ?", themeSlug, true).First(&theme).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return domain.ErrNotFound
		}
		return err
	}
	return nil
}
