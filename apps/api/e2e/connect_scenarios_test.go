//go:build e2e

package e2e

import (
	"testing"
	"time"
)

type scenarioCase struct {
	name string
	run  func(t *testing.T)
}

// TestContentReadEndpoints は read 系 Connect API の契約を seed データ基準で固定する。
// レスポンスと DB の両方を見ることで、transport の変換漏れと repository の選択規則ズレを同時に検知する。
func TestContentReadEndpoints(t *testing.T) {
	suite := requireSuite(t)

	testCases := []scenarioCase{
		{
			name: "テーマ一覧でシードデータと次ページトークンが返る",
			run: func(t *testing.T) {
				ctx, cancel := newScenarioContext(t)
				defer cancel()

				resp, err := suite.themeClient.listThemes(ctx, 2, "")
				if err != nil {
					t.Fatalf("list themes: %v", err)
				}
				if len(resp.Themes) != 2 {
					t.Fatalf("expected 2 themes, got %d", len(resp.Themes))
				}
				if resp.NextPageToken == "" {
					t.Fatal("expected next page token for first theme page")
				}

				expected := []struct {
					slug string
					name string
				}{
					{slug: "amd-rocm", name: "AMD ROCm"},
					{slug: "image-generation", name: "Image Generation AI"},
				}
				// 先頭ページの並び順も API 契約の一部として固定する。
				for index, want := range expected {
					got := resp.Themes[index]
					if got.Slug != want.slug {
						t.Fatalf("theme[%d] slug = %q, want %q", index, got.Slug, want.slug)
					}
					if got.Name != want.name {
						t.Fatalf("theme[%d] name = %q, want %q", index, got.Name, want.name)
					}
					dbRow, err := loadThemeSnapshot(ctx, suite.db, want.slug)
					if err != nil {
						t.Fatalf("load theme snapshot %q: %v", want.slug, err)
					}
					if got.Description != dbRow.Description {
						t.Fatalf("theme[%d] description mismatch", index)
					}
					if int64(got.ArticleCount) != dbRow.ArticleCount {
						t.Fatalf("theme[%d] article count = %d, want %d", index, got.ArticleCount, dbRow.ArticleCount)
					}
					if !got.UpdatedAt.AsTime().Equal(dbRow.UpdatedAt) {
						t.Fatalf("theme[%d] updated_at = %s, want %s", index, got.UpdatedAt.AsTime().Format(time.RFC3339), dbRow.UpdatedAt.Format(time.RFC3339))
					}
				}
			},
		},
		{
			name: "テーマ詳細でシードデータが返る",
			run: func(t *testing.T) {
				ctx, cancel := newScenarioContext(t)
				defer cancel()

				resp, err := suite.themeClient.getTheme(ctx, "software-engineering")
				if err != nil {
					t.Fatalf("get theme: %v", err)
				}
				dbRow, err := loadThemeSnapshot(ctx, suite.db, "software-engineering")
				if err != nil {
					t.Fatalf("load theme snapshot: %v", err)
				}
				if resp.Theme == nil {
					t.Fatal("theme detail is nil")
				}
				if resp.Theme.Slug != dbRow.Slug || resp.Theme.Name != dbRow.Name {
					t.Fatalf("theme detail mismatch: got slug=%q name=%q", resp.Theme.Slug, resp.Theme.Name)
				}
				if resp.Theme.Description != dbRow.Description {
					t.Fatal("theme detail description mismatch")
				}
				if int64(resp.Theme.ArticleCount) != dbRow.ArticleCount {
					t.Fatalf("theme detail article count = %d, want %d", resp.Theme.ArticleCount, dbRow.ArticleCount)
				}
			},
		},
		{
			name: "記事一覧で最新のシード要約が返る",
			run: func(t *testing.T) {
				ctx, cancel := newScenarioContext(t)
				defer cancel()

				resp, err := suite.articleClient.listArticles(ctx, "software-engineering", 2, "")
				if err != nil {
					t.Fatalf("list articles: %v", err)
				}
				if len(resp.Articles) != 2 {
					t.Fatalf("expected 2 article cards, got %d", len(resp.Articles))
				}
				if resp.NextPageToken == "" {
					t.Fatal("expected next page token for first article page")
				}

				expectedIDs := []string{"se-001", "se-002"}
				// ai_summaries の最新 completed レコードが選ばれていることを確認する。
				for index, id := range expectedIDs {
					got := resp.Articles[index]
					dbRow, err := loadArticleCardSnapshot(ctx, suite.db, id)
					if err != nil {
						t.Fatalf("load article card snapshot %q: %v", id, err)
					}
					if got.Id != dbRow.ID {
						t.Fatalf("article[%d] id = %q, want %q", index, got.Id, dbRow.ID)
					}
					if got.Title != dbRow.Title || got.Summary != dbRow.Summary {
						t.Fatalf("article[%d] title/summary mismatch", index)
					}
					if got.SourceUrl != dbRow.SourceURL || got.ThemeSlug != dbRow.ThemeSlug {
						t.Fatalf("article[%d] metadata mismatch", index)
					}
					if got.StanceLabel != dbRow.StanceLabel {
						t.Fatalf("article[%d] stance = %q, want %q", index, got.StanceLabel, dbRow.StanceLabel)
					}
					if int(got.PointCount) != dbRow.PointCount {
						t.Fatalf("article[%d] point_count = %d, want %d", index, got.PointCount, dbRow.PointCount)
					}
				}
			},
		},
		{
			name: "記事詳細でシードデータのペイロードが返る",
			run: func(t *testing.T) {
				ctx, cancel := newScenarioContext(t)
				defer cancel()

				resp, err := suite.articleClient.getArticle(ctx, "se-001")
				if err != nil {
					t.Fatalf("get article: %v", err)
				}
				dbRow, err := loadArticleDetailSnapshot(ctx, suite.db, "se-001")
				if err != nil {
					t.Fatalf("load article detail snapshot: %v", err)
				}
				if resp.Article == nil {
					t.Fatal("article detail is nil")
				}
				if resp.Article.Id != dbRow.ID || resp.Article.ThemeSlug != dbRow.ThemeSlug {
					t.Fatalf("article detail id/theme mismatch")
				}
				if resp.Article.Title != dbRow.Title || resp.Article.SourceUrl != dbRow.SourceURL {
					t.Fatalf("article detail title/source mismatch")
				}
				if resp.Article.SourceSiteLabel != dbRow.SourceSiteLabel {
					t.Fatalf("article detail source site label = %q, want %q", resp.Article.SourceSiteLabel, dbRow.SourceSiteLabel)
				}
				if resp.Article.Translation != dbRow.Translation || resp.Article.Summary != dbRow.Summary {
					t.Fatalf("article detail translation/summary mismatch")
				}
				if resp.Article.StanceLabel != dbRow.StanceLabel {
					t.Fatalf("article detail stance = %q, want %q", resp.Article.StanceLabel, dbRow.StanceLabel)
				}
				if len(resp.Article.KeyPoints) != len(dbRow.KeyPoints) {
					t.Fatalf("article detail key_points len = %d, want %d", len(resp.Article.KeyPoints), len(dbRow.KeyPoints))
				}
				for index, keyPoint := range dbRow.KeyPoints {
					if resp.Article.KeyPoints[index] != keyPoint {
						t.Fatalf("article detail key_points[%d] = %q, want %q", index, resp.Article.KeyPoints[index], keyPoint)
					}
				}
			},
		},
	}

	runScenarioCases(t, testCases)
}

func runScenarioCases(t *testing.T, testCases []scenarioCase) {
	t.Helper()

	for _, tc := range testCases {
		tc := tc
		t.Run(tc.name, tc.run)
	}
}
