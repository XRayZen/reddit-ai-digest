package db

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"testing"

	"github.com/XRayZen/reddit-ai-digest/internal/platform/database"
	"log/slog"
)

func setupTestDB(t *testing.T) *ThemeRepository {
	t.Helper()
	gormDB, err := database.Open("sqlite", "file:"+t.Name()+"?mode=memory&cache=shared")
	if err != nil {
		t.Fatalf("open sqlite database: %v", err)
	}
	sqlDB, err := gormDB.DB()
	if err != nil {
		t.Fatalf("get sql db: %v", err)
	}
	if err := createContentTestSchema(context.Background(), sqlDB); err != nil {
		t.Fatalf("create test schema: %v", err)
	}
	if err := Seed(context.Background(), gormDB); err != nil {
		t.Fatalf("seed database: %v", err)
	}
	return NewThemeRepository(gormDB, slog.Default())
}

func createContentTestSchema(ctx context.Context, db *sql.DB) error {
	statements := []string{
		`CREATE TABLE themes (
			slug TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			description TEXT NOT NULL,
			is_active BOOLEAN NOT NULL DEFAULT 1,
			updated_at TIMESTAMP NOT NULL
		)`,
		`CREATE TABLE source_threads (
			id TEXT PRIMARY KEY,
			source_type TEXT NOT NULL,
			source_thread_id TEXT NOT NULL,
			theme_slug TEXT NOT NULL,
			subreddit TEXT NOT NULL,
			title TEXT NOT NULL,
			body_text TEXT NOT NULL,
			author_name TEXT NOT NULL,
			score INTEGER NOT NULL DEFAULT 0,
			num_comments INTEGER NOT NULL DEFAULT 0,
			permalink TEXT NOT NULL,
			external_url TEXT NOT NULL,
			raw_snapshot_s3_key TEXT NOT NULL,
			created_at_source TIMESTAMP NOT NULL,
			ingested_at TIMESTAMP NOT NULL,
			UNIQUE(source_type, source_thread_id)
		)`,
		`CREATE TABLE topic_groups (
			id TEXT PRIMARY KEY,
			theme_slug TEXT NOT NULL,
			primary_source_thread_id TEXT NOT NULL UNIQUE,
			canonical_title TEXT NOT NULL,
			status TEXT NOT NULL,
			published_at TIMESTAMP NOT NULL,
			updated_at TIMESTAMP NOT NULL
		)`,
		`CREATE TABLE ai_summaries (
			id TEXT PRIMARY KEY,
			topic_group_id TEXT NOT NULL,
			provider_name TEXT NOT NULL,
			model_name TEXT NOT NULL,
			prompt_version TEXT NOT NULL,
			translation_ja TEXT NOT NULL,
			summary_ja TEXT NOT NULL,
			key_points_json TEXT NOT NULL,
			stance_label TEXT NOT NULL,
			token_input INTEGER NOT NULL DEFAULT 0,
			token_output INTEGER NOT NULL DEFAULT 0,
			latency_ms INTEGER NOT NULL DEFAULT 0,
			status TEXT NOT NULL,
			created_at TIMESTAMP NOT NULL
		)`,
		`CREATE TABLE job_executions (
			id TEXT PRIMARY KEY,
			type INTEGER NOT NULL,
			status INTEGER NOT NULL,
			target_id TEXT NOT NULL,
			target_label TEXT NOT NULL,
			requested_by TEXT NOT NULL,
			idempotency_key TEXT NOT NULL UNIQUE,
			trace_id TEXT NOT NULL,
			error_code TEXT NOT NULL DEFAULT '',
			error_message TEXT NOT NULL DEFAULT '',
			requested_at TIMESTAMP NOT NULL,
			started_at TIMESTAMP NULL,
			finished_at TIMESTAMP NULL
		)`,
	}
	for _, stmt := range statements {
		if _, err := db.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("exec schema statement %q: %w", strings.Split(stmt, "\n")[0], err)
		}
	}
	return nil
}

func TestListThemesReturnsSeededCounts(t *testing.T) {
	themeRepo := setupTestDB(t)

	items, hasMore, err := themeRepo.ListThemes(context.Background(), 10, 0)
	if err != nil {
		t.Fatalf("ListThemes returned error: %v", err)
	}
	if hasMore {
		t.Fatal("expected seeded themes to fit into a single page")
	}
	if len(items) != 4 {
		t.Fatalf("expected 4 themes, got %d", len(items))
	}
	if items[3].Slug != "software-engineering" || items[3].ArticleCount != 3 {
		t.Fatalf("expected software-engineering with articleCount=3, got %#v", items[3])
	}
}

func TestArticleQueriesUseLatestSummaryAndNewestFirst(t *testing.T) {
	themeRepo := setupTestDB(t)
	articleRepo := NewArticleRepository(themeRepo.db, slog.Default())

	items, hasMore, err := articleRepo.ListArticles(context.Background(), "software-engineering", 10, 0)
	if err != nil {
		t.Fatalf("ListArticles returned error: %v", err)
	}
	if hasMore {
		t.Fatal("expected software-engineering list to fit into a single page")
	}
	if len(items) != 3 {
		t.Fatalf("expected 3 articles, got %d", len(items))
	}
	if items[0].ID != "se-001" {
		t.Fatalf("expected newest article se-001 first, got %s", items[0].ID)
	}
	if items[0].PointCount != 4 {
		t.Fatalf("expected latest summary with 4 key points, got %d", items[0].PointCount)
	}

	detail, err := articleRepo.GetArticle(context.Background(), "se-001")
	if err != nil {
		t.Fatalf("GetArticle returned error: %v", err)
	}
	if detail.StanceLabel != "運用改善" {
		t.Fatalf("expected latest stance label 運用改善, got %s", detail.StanceLabel)
	}
	if detail.Summary == "old" {
		t.Fatal("expected latest summary, got stale record")
	}
}

func TestArticleQueriesPreferHighestSummaryIDWhenCreatedAtMatches(t *testing.T) {
	themeRepo := setupTestDB(t)
	articleRepo := NewArticleRepository(themeRepo.db, slog.Default())

	// 同秒作成の summary が並んでも、一覧と詳細で同じ 1 件を選ぶことを固定する。
	sameTime := "2026-03-20T12:00:00Z"
	if err := themeRepo.db.Exec(`
		INSERT INTO ai_summaries (
			id, topic_group_id, provider_name, model_name, prompt_version,
			translation_ja, summary_ja, key_points_json, stance_label,
			token_input, token_output, latency_ms, status, created_at
		) VALUES
			('summary-se-001-zz', 'se-001', 'openai-compatible', 'gpt-5-mini', 'v2',
			 'newest-translation', 'newest-summary', '["a","b"]', '同秒後勝ち',
			 0, 0, 0, 'completed', ?)
	`, sameTime).Error; err != nil {
		t.Fatalf("insert same-timestamp summary: %v", err)
	}

	items, _, err := articleRepo.ListArticles(context.Background(), "software-engineering", 10, 0)
	if err != nil {
		t.Fatalf("ListArticles returned error: %v", err)
	}
	if items[0].StanceLabel != "同秒後勝ち" {
		t.Fatalf("expected deterministic latest stance label, got %s", items[0].StanceLabel)
	}

	detail, err := articleRepo.GetArticle(context.Background(), "se-001")
	if err != nil {
		t.Fatalf("GetArticle returned error: %v", err)
	}
	if detail.Summary != "newest-summary" {
		t.Fatalf("expected deterministic latest summary, got %s", detail.Summary)
	}
}
