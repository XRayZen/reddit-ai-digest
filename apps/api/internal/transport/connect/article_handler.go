// Package connecthandler はConnect RPCハンドラーの実装を提供する。
package connecthandler

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"github.com/XRayZen/reddit-ai-digest/apps/api/internal/domain"
	"github.com/XRayZen/reddit-ai-digest/apps/api/internal/shared"
	articleusecase "github.com/XRayZen/reddit-ai-digest/apps/api/internal/usecase/article"
	articlev1 "github.com/XRayZen/reddit-ai-digest/packages/proto/gen/go/article/v1"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// ArticleHandler は記事関連のConnect RPCハンドラー。
// ビジネスロジックはusecase.Serviceに委譲し、プロトコル変換のみ担当する。
type ArticleHandler struct {
	service *articleusecase.Service
}

func NewArticleHandler(service *articleusecase.Service) *ArticleHandler {
	return &ArticleHandler{service: service}
}

// ListArticles は記事一覧を取得するRPCメソッド。
func (h *ArticleHandler) ListArticles(ctx context.Context, req *connect.Request[articlev1.ListArticlesRequest]) (*connect.Response[articlev1.ListArticlesResponse], error) {
	items, nextToken, err := h.service.ListArticles(ctx, req.Msg.ThemeSlug, int(req.Msg.PageSize), req.Msg.PageToken)
	if err != nil {
		if errors.Is(err, shared.ErrInvalidPageToken) {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		if errors.Is(err, domain.ErrNotFound) {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	response := &articlev1.ListArticlesResponse{NextPageToken: nextToken}
	for _, item := range items {
		response.Articles = append(response.Articles, &articlev1.ArticleCard{
			Id:          item.ID,
			ThemeSlug:   item.ThemeSlug,
			Title:       item.Title,
			Summary:     item.Summary,
			SourceUrl:   item.SourceURL,
			PublishedAt: timestamppb.New(item.PublishedAt),
			StanceLabel: item.StanceLabel,
			PointCount:  int32(item.PointCount),
		})
	}
	return connect.NewResponse(response), nil
}

// GetArticle は記事詳細を取得するRPCメソッド。
func (h *ArticleHandler) GetArticle(ctx context.Context, req *connect.Request[articlev1.GetArticleRequest]) (*connect.Response[articlev1.GetArticleResponse], error) {
	item, err := h.service.GetArticle(ctx, req.Msg.Id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&articlev1.GetArticleResponse{
		Article: &articlev1.ArticleDetail{
			Id:              item.ID,
			ThemeSlug:       item.ThemeSlug,
			Title:           item.Title,
			SourceUrl:       item.SourceURL,
			SourceSiteLabel: item.SourceSiteLabel,
			PublishedAt:     timestamppb.New(item.PublishedAt),
			Translation:     item.Translation,
			Summary:         item.Summary,
			KeyPoints:       item.KeyPoints,
			StanceLabel:     item.StanceLabel,
		},
	}), nil
}
