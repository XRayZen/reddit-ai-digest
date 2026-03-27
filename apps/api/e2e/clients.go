//go:build e2e

package e2e

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"connectrpc.com/connect"
	"github.com/XRayZen/reddit-ai-digest/internal/platform/traceutil"
	articlev1 "github.com/XRayZen/reddit-ai-digest/packages/proto/gen/go/article/v1"
	articlev1connect "github.com/XRayZen/reddit-ai-digest/packages/proto/gen/go/article/v1/articlev1connect"
	themev1 "github.com/XRayZen/reddit-ai-digest/packages/proto/gen/go/theme/v1"
	themev1connect "github.com/XRayZen/reddit-ai-digest/packages/proto/gen/go/theme/v1/themev1connect"
)

// contentClient は Connect read API をまとめて扱う。
// Theme / Article を同じ HTTP transport 上で使い回し、シナリオ側の記述を薄く保つ。
type contentClient struct {
	themes   themev1connect.ThemeServiceClient
	articles articlev1connect.ArticleServiceClient
}

func newContentClient(httpClient *http.Client, baseURL string) *contentClient {
	return &contentClient{
		themes:   themev1connect.NewThemeServiceClient(httpClient, baseURL),
		articles: articlev1connect.NewArticleServiceClient(httpClient, baseURL),
	}
}

func (c *contentClient) listThemes(ctx context.Context, pageSize int32, pageToken string) (*themev1.ListThemesResponse, error) {
	resp, err := c.themes.ListThemes(ctx, connect.NewRequest(&themev1.ListThemesRequest{
		PageSize:  pageSize,
		PageToken: pageToken,
	}))
	if err != nil {
		return nil, err
	}
	return resp.Msg, nil
}

func (c *contentClient) getTheme(ctx context.Context, slug string) (*themev1.GetThemeResponse, error) {
	resp, err := c.themes.GetTheme(ctx, connect.NewRequest(&themev1.GetThemeRequest{Slug: slug}))
	if err != nil {
		return nil, err
	}
	return resp.Msg, nil
}

func (c *contentClient) listArticles(ctx context.Context, themeSlug string, pageSize int32, pageToken string) (*articlev1.ListArticlesResponse, error) {
	resp, err := c.articles.ListArticles(ctx, connect.NewRequest(&articlev1.ListArticlesRequest{
		ThemeSlug: themeSlug,
		PageSize:  pageSize,
		PageToken: pageToken,
	}))
	if err != nil {
		return nil, err
	}
	return resp.Msg, nil
}

func (c *contentClient) getArticle(ctx context.Context, id string) (*articlev1.GetArticleResponse, error) {
	resp, err := c.articles.GetArticle(ctx, connect.NewRequest(&articlev1.GetArticleRequest{Id: id}))
	if err != nil {
		return nil, err
	}
	return resp.Msg, nil
}

type adminClient struct {
	baseURL    string
	token      string
	httpClient *http.Client
}

// adminJobResponse は管理 REST が返す最小レスポンスだけを切り出したもの。
// E2E では UI 用の JSON 形状に追従したいので、proto ではなく REST のレスポンス形をそのまま持つ。
type adminJobResponse struct {
	ID          string `json:"id"`
	Type        string `json:"type"`
	Status      string `json:"status"`
	TargetLabel string `json:"targetLabel"`
	RequestedAt string `json:"requestedAt"`
}

// runJobRequest は収集ジョブと再要約ジョブで共用する JSON payload。
type runJobRequest struct {
	ThemeSlug      string `json:"themeSlug,omitempty"`
	ArticleID      string `json:"articleId,omitempty"`
	RequestedBy    string `json:"requestedBy"`
	IdempotencyKey string `json:"idempotencyKey"`
}

func newAdminClient(httpClient *http.Client, baseURL string, token string) *adminClient {
	return &adminClient{
		baseURL:    baseURL,
		token:      token,
		httpClient: httpClient,
	}
}

func (c *adminClient) listJobs(ctx context.Context, traceID string) ([]adminJobResponse, http.Header, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/api/admin/jobs", nil)
	if err != nil {
		return nil, nil, err
	}
	return doJSON[[]adminJobResponse](c.httpClient, req, c.token, traceID)
}

func (c *adminClient) queueIngestion(ctx context.Context, traceID string, payload runJobRequest) (adminJobResponse, http.Header, error) {
	req, err := c.newJSONRequest(ctx, http.MethodPost, "/api/admin/ingestions/run", payload)
	if err != nil {
		return adminJobResponse{}, nil, err
	}
	return doJSON[adminJobResponse](c.httpClient, req, c.token, traceID)
}

func (c *adminClient) queueResummarization(ctx context.Context, traceID string, payload runJobRequest) (adminJobResponse, http.Header, error) {
	req, err := c.newJSONRequest(ctx, http.MethodPost, "/api/admin/summaries/rerun", payload)
	if err != nil {
		return adminJobResponse{}, nil, err
	}
	return doJSON[adminJobResponse](c.httpClient, req, c.token, traceID)
}

func (c *adminClient) newJSONRequest(ctx context.Context, method string, path string, payload any) (*http.Request, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal admin request: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	return req, nil
}

// doJSON は REST エンドポイントの共通呼び出し。
// 失敗時に method/path/body をまとめて返し、E2E の失敗原因をログなしで追えるようにする。
func doJSON[T any](httpClient *http.Client, req *http.Request, token string, traceID string) (T, http.Header, error) {
	var zero T

	req.Header.Set("X-Admin-Token", token)
	req.Header.Set(traceutil.HeaderTraceID, traceID)

	resp, err := httpClient.Do(req)
	if err != nil {
		return zero, nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusBadRequest {
		body, _ := io.ReadAll(resp.Body)
		return zero, resp.Header, fmt.Errorf("admin request %s %s failed: status=%d body=%s", req.Method, req.URL.Path, resp.StatusCode, string(body))
	}

	var payload T
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return zero, resp.Header, fmt.Errorf("decode admin response: %w", err)
	}
	return payload, resp.Header, nil
}
