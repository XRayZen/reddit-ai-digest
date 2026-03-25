// Package theme はテーマ閲覧に関するユースケースを提供する。
package theme

import (
	"context"
	"fmt"

	"github.com/XRayZen/reddit-ai-digest/apps/api/internal/domain"
	"github.com/XRayZen/reddit-ai-digest/apps/api/internal/shared"
)

// Repository はテーマデータの永続化抽象。
type Repository interface {
	ListThemes(ctx context.Context, limit int, offset int) ([]domain.Theme, bool, error)
	GetTheme(ctx context.Context, slug string) (domain.Theme, error)
}

// Service はテーマ閲覧ビジネスロジックを提供する。
type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

// ListThemes はテーマ一覧をページネーション付きで取得する。
func (s *Service) ListThemes(ctx context.Context, pageSize int, pageToken string) ([]domain.Theme, string, error) {
	limit := shared.NormalizePageSize(pageSize)
	offset, err := shared.DecodeOffsetToken(pageToken)
	if err != nil {
		return nil, "", fmt.Errorf("decode theme page token: %w", err)
	}
	items, hasMore, err := s.repo.ListThemes(ctx, limit, offset)
	if err != nil {
		return nil, "", err
	}
	next := ""
	if hasMore {
		next = shared.EncodeOffsetToken(offset + limit)
	}
	return items, next, nil
}

// GetTheme は指定slugのテーマを取得する。
func (s *Service) GetTheme(ctx context.Context, slug string) (domain.Theme, error) {
	return s.repo.GetTheme(ctx, slug)
}
