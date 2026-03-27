// Package article は記事閲覧に関するユースケースを提供する。
package article

import (
	"context"
	"fmt"

	"github.com/XRayZen/reddit-ai-digest/apps/api/internal/domain"
	"github.com/XRayZen/reddit-ai-digest/apps/api/internal/shared"
)

// Repository は記事データの永続化抽象。
// 実装はDBアダプターなどが提供する。
type Repository interface {
	ListArticles(ctx context.Context, themeSlug string, limit int, offset int) ([]domain.ArticleCard, bool, error)
	GetArticle(ctx context.Context, id string) (domain.ArticleDetail, error)
}

// Service は記事閲覧ビジネスロジックを提供する。
// ページネーション、トークンデコードなどの処理を担当し、DBアクセスはRepositoryに委譲する。
type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

// ListArticles は指定テーマの記事一覧をページネーション付きで取得する。
// 戻り値のnextTokenが空でない場合、さらに次のページが存在する。
func (s *Service) ListArticles(ctx context.Context, themeSlug string, pageSize int, pageToken string) ([]domain.ArticleCard, string, error) {
	limit := shared.NormalizePageSize(pageSize)
	offset, err := shared.DecodeOffsetToken(pageToken)
	if err != nil {
		return nil, "", fmt.Errorf("decode article page token: %w", err)
	}
	items, hasMore, err := s.repo.ListArticles(ctx, themeSlug, limit, offset)
	if err != nil {
		return nil, "", err
	}
	next := ""
	if hasMore {
		next = shared.EncodeOffsetToken(offset + limit)
	}
	return items, next, nil
}

// GetArticle は指定IDの記事詳細を取得する。
// 見つからない場合、domain.ErrNotFoundを返す。
func (s *Service) GetArticle(ctx context.Context, id string) (domain.ArticleDetail, error) {
	return s.repo.GetArticle(ctx, id)
}
