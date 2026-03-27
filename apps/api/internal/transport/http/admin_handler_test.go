package httptransport

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/XRayZen/reddit-ai-digest/apps/api/internal/usecase/admin"
	"github.com/XRayZen/reddit-ai-digest/internal/platform/database"
	"github.com/XRayZen/reddit-ai-digest/internal/platform/jobs"
	"github.com/XRayZen/reddit-ai-digest/internal/platform/traceutil"
)

func setupAdminHandler(t *testing.T) *AdminHandler {
	return setupAdminHandlerWithRepo(t, nil)
}

func setupAdminHandlerWithRepo(t *testing.T, repo admin.JobRepository) *AdminHandler {
	t.Helper()
	gormDB, err := database.Open("sqlite", "file:"+t.Name()+"?mode=memory&cache=shared")
	if err != nil {
		t.Fatalf("open sqlite database: %v", err)
	}
	sqlDB, err := gormDB.DB()
	if err != nil {
		t.Fatalf("get sql db: %v", err)
	}
	if err := createAdminJobTestSchema(context.Background(), sqlDB); err != nil {
		t.Fatalf("create test schema: %v", err)
	}
	if repo == nil {
		repo = jobs.NewGormRepository(gormDB)
	}
	return NewAdminHandler(admin.NewService(repo), "secret")
}

func createAdminJobTestSchema(ctx context.Context, db *sql.DB) error {
	// unit test は migration の正当性ではなく handler の振る舞いだけを確認する。
	if _, err := db.ExecContext(ctx, `
		CREATE TABLE job_executions (
			id TEXT PRIMARY KEY,
			type INTEGER NOT NULL,
			status INTEGER NOT NULL,
			target_id TEXT NOT NULL,
			target_label TEXT NOT NULL,
			requested_by TEXT NOT NULL,
			idempotency_key TEXT NOT NULL UNIQUE,
			trace_id TEXT NOT NULL,
			error_code TEXT NOT NULL DEFAULT '',
			error_message TEXT NOT NULL DEFAULT '',
			requested_at TIMESTAMP NOT NULL,
			started_at TIMESTAMP NULL,
			finished_at TIMESTAMP NULL
		)
	`); err != nil {
		return fmt.Errorf("create job_executions: %w", err)
	}
	return nil
}

func TestListJobsRequiresToken(t *testing.T) {
	handler := setupAdminHandler(t)
	mux := http.NewServeMux()
	handler.Register(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/admin/jobs", nil)
	resp := httptest.NewRecorder()

	mux.ServeHTTP(resp, req)

	if resp.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", resp.Code)
	}
}

func TestRunIngestionIsIdempotent(t *testing.T) {
	handler := setupAdminHandler(t)
	mux := http.NewServeMux()
	handler.Register(mux)

	body, err := json.Marshal(map[string]string{
		"themeSlug":      "software-engineering",
		"requestedBy":    "tester",
		"idempotencyKey": "idem-1",
	})
	if err != nil {
		t.Fatalf("marshal request body: %v", err)
	}

	makeRequest := func() *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodPost, "/api/admin/ingestions/run", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Admin-Token", "secret")
		req = req.WithContext(traceutil.WithTraceID(req.Context(), "trc_test"))
		resp := httptest.NewRecorder()
		mux.ServeHTTP(resp, req)
		return resp
	}

	first := makeRequest()
	second := makeRequest()

	if first.Code != http.StatusAccepted {
		t.Fatalf("expected first request to return 202, got %d", first.Code)
	}
	if second.Code != http.StatusAccepted {
		t.Fatalf("expected second request to return 202, got %d", second.Code)
	}

	var firstPayload listJobsResponse
	if err := json.Unmarshal(first.Body.Bytes(), &firstPayload); err != nil {
		t.Fatalf("decode first payload: %v", err)
	}
	var secondPayload listJobsResponse
	if err := json.Unmarshal(second.Body.Bytes(), &secondPayload); err != nil {
		t.Fatalf("decode second payload: %v", err)
	}
	if firstPayload.ID != secondPayload.ID {
		t.Fatalf("expected idempotent response ids to match, got %s and %s", firstPayload.ID, secondPayload.ID)
	}
}

type failingJobRepository struct{}

func (failingJobRepository) List(_ context.Context, _ int) ([]jobs.Job, error) {
	return nil, errors.New("boom")
}

func (failingJobRepository) FindByIdempotencyKey(_ context.Context, _ string) (*jobs.Job, error) {
	return nil, errors.New("boom")
}

func (failingJobRepository) Enqueue(_ context.Context, _ jobs.Job) (jobs.Job, error) {
	return jobs.Job{}, errors.New("boom")
}

func TestRunIngestionReturnsBadRequestForInvalidInput(t *testing.T) {
	handler := setupAdminHandler(t)
	mux := http.NewServeMux()
	handler.Register(mux)

	body, err := json.Marshal(map[string]string{
		"themeSlug":   "software-engineering",
		"requestedBy": "tester",
	})
	if err != nil {
		t.Fatalf("marshal request body: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/admin/ingestions/run", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Admin-Token", "secret")
	req = req.WithContext(traceutil.WithTraceID(req.Context(), "trc_test"))
	resp := httptest.NewRecorder()

	mux.ServeHTTP(resp, req)

	if resp.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.Code)
	}
}

func TestRunIngestionReturnsBadRequestForEmptyThemeSlug(t *testing.T) {
	handler := setupAdminHandler(t)
	mux := http.NewServeMux()
	handler.Register(mux)

	body, err := json.Marshal(map[string]string{
		"themeSlug":      "",
		"requestedBy":    "tester",
		"idempotencyKey": "idem-1",
	})
	if err != nil {
		t.Fatalf("marshal request body: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/admin/ingestions/run", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Admin-Token", "secret")
	req = req.WithContext(traceutil.WithTraceID(req.Context(), "trc_test"))
	resp := httptest.NewRecorder()

	mux.ServeHTTP(resp, req)

	if resp.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.Code)
	}
}

func TestRunResummarizationReturnsBadRequestForEmptyArticleID(t *testing.T) {
	handler := setupAdminHandler(t)
	mux := http.NewServeMux()
	handler.Register(mux)

	body, err := json.Marshal(map[string]string{
		"articleId":      "",
		"requestedBy":    "tester",
		"idempotencyKey": "idem-1",
	})
	if err != nil {
		t.Fatalf("marshal request body: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/admin/summaries/rerun", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Admin-Token", "secret")
	req = req.WithContext(traceutil.WithTraceID(req.Context(), "trc_test"))
	resp := httptest.NewRecorder()

	mux.ServeHTTP(resp, req)

	if resp.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.Code)
	}
}

func TestRunIngestionReturnsInternalServerErrorForRepositoryFailure(t *testing.T) {
	handler := setupAdminHandlerWithRepo(t, failingJobRepository{})
	mux := http.NewServeMux()
	handler.Register(mux)

	body, err := json.Marshal(map[string]string{
		"themeSlug":      "software-engineering",
		"requestedBy":    "tester",
		"idempotencyKey": "idem-1",
	})
	if err != nil {
		t.Fatalf("marshal request body: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/admin/ingestions/run", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Admin-Token", "secret")
	req = req.WithContext(traceutil.WithTraceID(req.Context(), "trc_test"))
	resp := httptest.NewRecorder()

	mux.ServeHTTP(resp, req)

	if resp.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", resp.Code)
	}
}
