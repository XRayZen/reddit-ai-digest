package connecthandler

import (
	"context"
	"errors"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/XRayZen/reddit-ai-digest/apps/api/internal/domain"
	articleusecase "github.com/XRayZen/reddit-ai-digest/apps/api/internal/usecase/article"
	themeusecase "github.com/XRayZen/reddit-ai-digest/apps/api/internal/usecase/theme"
	articlev1 "github.com/XRayZen/reddit-ai-digest/packages/proto/gen/go/article/v1"
	themev1 "github.com/XRayZen/reddit-ai-digest/packages/proto/gen/go/theme/v1"
)

type themeRepoStub struct{}

func (themeRepoStub) ListThemes(_ context.Context, _ int, _ int) ([]domain.Theme, bool, error) {
	return []domain.Theme{{Slug: "software-engineering", UpdatedAt: time.Now()}}, false, nil
}

func (themeRepoStub) GetTheme(_ context.Context, _ string) (domain.Theme, error) {
	return domain.Theme{}, domain.ErrNotFound
}

type articleRepoStub struct{}

func (articleRepoStub) ListArticles(_ context.Context, _ string, _ int, _ int) ([]domain.ArticleCard, bool, error) {
	return []domain.ArticleCard{{ID: "se-001", PublishedAt: time.Now()}}, false, nil
}

func (articleRepoStub) GetArticle(_ context.Context, _ string) (domain.ArticleDetail, error) {
	return domain.ArticleDetail{}, domain.ErrNotFound
}

func TestThemeHandlerMapsInvalidPageTokenToInvalidArgument(t *testing.T) {
	handler := NewThemeHandler(themeusecase.NewService(themeRepoStub{}))

	_, err := handler.ListThemes(context.Background(), connect.NewRequest(&themev1.ListThemesRequest{
		PageSize:  10,
		PageToken: "%%%",
	}))
	if err == nil {
		t.Fatal("expected error")
	}
	connectErr := new(connect.Error)
	if !errors.As(err, &connectErr) {
		t.Fatalf("expected connect error, got %T", err)
	}
	if connectErr.Code() != connect.CodeInvalidArgument {
		t.Fatalf("expected invalid argument, got %v", connectErr.Code())
	}
}

func TestArticleHandlerMapsInvalidPageTokenToInvalidArgument(t *testing.T) {
	handler := NewArticleHandler(articleusecase.NewService(articleRepoStub{}))

	_, err := handler.ListArticles(context.Background(), connect.NewRequest(&articlev1.ListArticlesRequest{
		ThemeSlug: "software-engineering",
		PageSize:  10,
		PageToken: "%%%",
	}))
	if err == nil {
		t.Fatal("expected error")
	}
	connectErr := new(connect.Error)
	if !errors.As(err, &connectErr) {
		t.Fatalf("expected connect error, got %T", err)
	}
	if connectErr.Code() != connect.CodeInvalidArgument {
		t.Fatalf("expected invalid argument, got %v", connectErr.Code())
	}
}
