package theme

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/XRayZen/reddit-ai-digest/apps/api/internal/domain"
	"github.com/XRayZen/reddit-ai-digest/apps/api/internal/shared"
)

type fakeRepository struct {
	items   []domain.Theme
	hasMore bool
	err     error
}

func (f fakeRepository) ListThemes(_ context.Context, _ int, _ int) ([]domain.Theme, bool, error) {
	return f.items, f.hasMore, f.err
}

func (f fakeRepository) GetTheme(_ context.Context, slug string) (domain.Theme, error) {
	for _, item := range f.items {
		if item.Slug == slug {
			return item, nil
		}
	}
	return domain.Theme{}, domain.ErrNotFound
}

func TestListThemesBuildsNextPageToken(t *testing.T) {
	svc := NewService(fakeRepository{
		items: []domain.Theme{
			{Slug: "software-engineering", UpdatedAt: time.Now()},
		},
		hasMore: true,
	})

	items, nextToken, err := svc.ListThemes(context.Background(), 10, "")
	if err != nil {
		t.Fatalf("ListThemes returned error: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 theme, got %d", len(items))
	}
	if nextToken == "" {
		t.Fatal("expected non-empty next page token")
	}
}

func TestListThemesRejectsInvalidPageToken(t *testing.T) {
	svc := NewService(fakeRepository{})

	if _, _, err := svc.ListThemes(context.Background(), 10, "%%%"); err == nil {
		t.Fatal("expected invalid page token error")
	} else if !errors.Is(err, shared.ErrInvalidPageToken) {
		t.Fatalf("expected ErrInvalidPageToken, got %v", err)
	}
}
