package article

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/XRayZen/reddit-ai-digest/apps/api/internal/domain"
	"github.com/XRayZen/reddit-ai-digest/apps/api/internal/shared"
)

type fakeRepository struct {
	items  []domain.ArticleCard
	detail domain.ArticleDetail
	err    error
}

func (f fakeRepository) ListArticles(_ context.Context, _ string, _ int, _ int) ([]domain.ArticleCard, bool, error) {
	return f.items, false, f.err
}

func (f fakeRepository) GetArticle(_ context.Context, _ string) (domain.ArticleDetail, error) {
	if f.err != nil {
		return domain.ArticleDetail{}, f.err
	}
	return f.detail, nil
}

func TestGetArticleReturnsDetail(t *testing.T) {
	svc := NewService(fakeRepository{
		detail: domain.ArticleDetail{
			ID:          "se-001",
			PublishedAt: time.Now(),
			KeyPoints:   []string{"one"},
		},
	})

	item, err := svc.GetArticle(context.Background(), "se-001")
	if err != nil {
		t.Fatalf("GetArticle returned error: %v", err)
	}
	if item.ID != "se-001" {
		t.Fatalf("expected article id se-001, got %s", item.ID)
	}
}

func TestListArticlesRejectsInvalidPageToken(t *testing.T) {
	svc := NewService(fakeRepository{})

	if _, _, err := svc.ListArticles(context.Background(), "software-engineering", 10, "%%%"); err == nil {
		t.Fatal("expected invalid page token error")
	} else if !errors.Is(err, shared.ErrInvalidPageToken) {
		t.Fatalf("expected ErrInvalidPageToken, got %v", err)
	}
}

func TestListArticlesReturnsNotFound(t *testing.T) {
	svc := NewService(fakeRepository{err: domain.ErrNotFound})

	if _, _, err := svc.ListArticles(context.Background(), "missing-theme", 10, ""); err == nil {
		t.Fatal("expected not found error")
	} else if !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}
