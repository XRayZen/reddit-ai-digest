package connecthandler

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	"github.com/XRayZen/reddit-ai-digest/apps/api/internal/domain"
	"github.com/XRayZen/reddit-ai-digest/apps/api/internal/shared"
	themeusecase "github.com/XRayZen/reddit-ai-digest/apps/api/internal/usecase/theme"
	themev1 "github.com/XRayZen/reddit-ai-digest/packages/proto/gen/go/theme/v1"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// ThemeHandler はテーマ関連のConnect RPCハンドラー。
// ビジネスロジックはusecase.Serviceに委譲し、プロトコル変換のみ担当する。
type ThemeHandler struct {
	service *themeusecase.Service
}

func NewThemeHandler(service *themeusecase.Service) *ThemeHandler {
	return &ThemeHandler{service: service}
}

// ListThemes はテーマ一覧を取得するRPCメソッド。
func (h *ThemeHandler) ListThemes(ctx context.Context, req *connect.Request[themev1.ListThemesRequest]) (*connect.Response[themev1.ListThemesResponse], error) {
	items, nextToken, err := h.service.ListThemes(ctx, int(req.Msg.PageSize), req.Msg.PageToken)
	if err != nil {
		if errors.Is(err, shared.ErrInvalidPageToken) {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	response := &themev1.ListThemesResponse{NextPageToken: nextToken}
	for _, item := range items {
		response.Themes = append(response.Themes, &themev1.Theme{
			Slug:         item.Slug,
			Name:         item.Name,
			Description:  item.Description,
			ArticleCount: int32(item.ArticleCount),
			UpdatedAt:    timestamppb.New(item.UpdatedAt),
		})
	}
	return connect.NewResponse(response), nil
}

// GetTheme はテーマ詳細を取得するRPCメソッド。
func (h *ThemeHandler) GetTheme(ctx context.Context, req *connect.Request[themev1.GetThemeRequest]) (*connect.Response[themev1.GetThemeResponse], error) {
	item, err := h.service.GetTheme(ctx, req.Msg.Slug)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&themev1.GetThemeResponse{
		Theme: &themev1.Theme{
			Slug:         item.Slug,
			Name:         item.Name,
			Description:  item.Description,
			ArticleCount: int32(item.ArticleCount),
			UpdatedAt:    timestamppb.New(item.UpdatedAt),
		},
	}), nil
}
