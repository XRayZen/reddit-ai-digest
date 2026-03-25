// Package httptransport は管理用REST APIハンドラーの実装を提供する。
// gRPC/Connectが主インターフェースだが、管理操作など一部用途ではRESTを使用する。
package httptransport

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	adminusecase "github.com/XRayZen/reddit-ai-digest/apps/api/internal/usecase/admin"
	"github.com/XRayZen/reddit-ai-digest/internal/platform/jobs"
	"github.com/XRayZen/reddit-ai-digest/internal/platform/traceutil"
	adminv1 "github.com/XRayZen/reddit-ai-digest/packages/proto/gen/go/admin/v1"
)

// AdminHandler は管理者用REST APIハンドラー。
// 認証はX-Admin-Tokenヘッダーで行う（トークン未設定時は認証スキップ）。
type AdminHandler struct {
	service *adminusecase.Service
	token   string
}

func NewAdminHandler(service *adminusecase.Service, token string) *AdminHandler {
	return &AdminHandler{service: service, token: token}
}

// listJobsResponse はジョブ一覧レスポンスのJSON構造。
type listJobsResponse struct {
	ID          string `json:"id"`
	Type        string `json:"type"`
	Status      string `json:"status"`
	TargetLabel string `json:"targetLabel"`
	RequestedAt string `json:"requestedAt"`
}

// runJobRequest はジョブ実行リクエストのJSON構造。
type runJobRequest struct {
	ThemeSlug      string `json:"themeSlug"`
	ArticleID      string `json:"articleId"`
	RequestedBy    string `json:"requestedBy"`
	IdempotencyKey string `json:"idempotencyKey"`
}

// Register は管理用エンドポイントをServeMuxに登録する。
func (h *AdminHandler) Register(mux *http.ServeMux) {
	mux.HandleFunc("/api/admin/jobs", h.handleListJobs)
	mux.HandleFunc("/api/admin/ingestions/run", h.handleRunIngestion)
	mux.HandleFunc("/api/admin/summaries/rerun", h.handleRunResummarization)
}

// handleListJobs はGET /api/admin/jobsを処理する。
func (h *AdminHandler) handleListJobs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if !h.authorized(r) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	jobsList, err := h.service.ListJobs(r.Context(), 50)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	resp := make([]listJobsResponse, 0, len(jobsList))
	for _, item := range jobsList {
		resp = append(resp, toListJobsResponse(item))
	}
	writeJSON(w, resp, http.StatusOK)
}

// handleRunIngestion はPOST /api/admin/ingestions/runを処理する。
// 収取ジョブをキューに登録する。
func (h *AdminHandler) handleRunIngestion(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if !h.authorized(r) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var req runJobRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json body", http.StatusBadRequest)
		return
	}
	if req.IdempotencyKey == "" {
		req.IdempotencyKey = r.Header.Get("Idempotency-Key")
	}
	job, err := h.service.QueueIngestion(r.Context(), req.ThemeSlug, req.RequestedBy, req.IdempotencyKey, traceutil.FromContext(r.Context()))
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, adminusecase.ErrInvalidArgument) {
			status = http.StatusBadRequest
		}
		http.Error(w, err.Error(), status)
		return
	}
	writeJSON(w, toListJobsResponse(job), http.StatusAccepted)
}

// handleRunResummarization はPOST /api/admin/summaries/rerunを処理する。
// 再要約ジョブをキューに登録する。
func (h *AdminHandler) handleRunResummarization(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if !h.authorized(r) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var req runJobRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json body", http.StatusBadRequest)
		return
	}
	if req.IdempotencyKey == "" {
		req.IdempotencyKey = r.Header.Get("Idempotency-Key")
	}
	job, err := h.service.QueueResummarization(r.Context(), req.ArticleID, req.RequestedBy, req.IdempotencyKey, traceutil.FromContext(r.Context()))
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, adminusecase.ErrInvalidArgument) {
			status = http.StatusBadRequest
		}
		http.Error(w, err.Error(), status)
		return
	}
	writeJSON(w, toListJobsResponse(job), http.StatusAccepted)
}

// authorized はリクエストが認証済みか判定する。
// トークン未設定の場合は全リクエストを許可する（開発用）。
func (h *AdminHandler) authorized(r *http.Request) bool {
	if h.token == "" {
		return true
	}
	return r.Header.Get("X-Admin-Token") == h.token
}

// toListJobsResponse はJobをJSONレスポンス形式に変換する。
func toListJobsResponse(job jobs.Job) listJobsResponse {
	return listJobsResponse{
		ID:          job.ID,
		Type:        strings.TrimPrefix(strings.ToLower(job.Type.String()), "job_type_"),
		Status:      strings.TrimPrefix(strings.ToLower(job.Status.String()), "job_status_"),
		TargetLabel: job.TargetLabel,
		RequestedAt: job.RequestedAt.Format(http.TimeFormat),
	}
}

// writeJSON はJSONレスポンスを書き込むヘルパー関数。
func writeJSON(w http.ResponseWriter, payload any, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

var (
	_ = adminv1.JobType_JOB_TYPE_INGEST
	_ = adminv1.JobStatus_JOB_STATUS_COMPLETED
)
