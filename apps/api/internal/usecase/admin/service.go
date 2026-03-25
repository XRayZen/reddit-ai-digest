// Package admin は管理者用操作（ジョブ実行など）のユースケースを提供する。
package admin

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/XRayZen/reddit-ai-digest/internal/platform/jobs"
	"github.com/XRayZen/reddit-ai-digest/internal/platform/traceutil"
	adminv1 "github.com/XRayZen/reddit-ai-digest/packages/proto/gen/go/admin/v1"
)

// JobRepository はジョブキューへのアクセスを抽象化する。
type JobRepository interface {
	List(ctx context.Context, limit int) ([]jobs.Job, error)
	FindByIdempotencyKey(ctx context.Context, key string) (*jobs.Job, error)
	Enqueue(ctx context.Context, job jobs.Job) (jobs.Job, error)
}

// Service は管理者操作のビジネスロジックを提供する。
// 収取ジョブ、再要約ジョブの登録とべき等性制御を担当する。
type Service struct {
	repo JobRepository
}

var ErrInvalidArgument = errors.New("invalid admin request")

func NewService(repo JobRepository) *Service {
	return &Service{repo: repo}
}

// ListJobs は直近のジョブ一覧を取得する。
func (s *Service) ListJobs(ctx context.Context, limit int) ([]jobs.Job, error) {
	return s.repo.List(ctx, limit)
}

// QueueIngestion は収取ジョブをキューに登録する。
// 同一idempotencyKeyで既に登録済みの場合、既存ジョブを返す（べき等性）。
func (s *Service) QueueIngestion(ctx context.Context, themeSlug string, requestedBy string, idempotencyKey string, traceID string) (jobs.Job, error) {
	return s.enqueue(ctx, adminv1.JobType_JOB_TYPE_INGEST, themeSlug, "theme:"+themeSlug, requestedBy, idempotencyKey, traceID)
}

// QueueResummarization は再要約ジョブをキューに登録する。
// 同一idempotencyKeyで既に登録済みの場合、既存ジョブを返す（べき等性）。
func (s *Service) QueueResummarization(ctx context.Context, articleID string, requestedBy string, idempotencyKey string, traceID string) (jobs.Job, error) {
	return s.enqueue(ctx, adminv1.JobType_JOB_TYPE_RESUMMARIZE, articleID, "article:"+articleID, requestedBy, idempotencyKey, traceID)
}

// enqueue はジョブ登録の共通ロジック。
// idempotencyKeyによる重複チェックを行い、重複時は既存ジョブを返す。
func (s *Service) enqueue(ctx context.Context, jobType adminv1.JobType, targetID string, targetLabel string, requestedBy string, idempotencyKey string, traceID string) (jobs.Job, error) {
	if idempotencyKey == "" {
		return jobs.Job{}, fmt.Errorf("%w: idempotency key is required", ErrInvalidArgument)
	}
	existing, err := s.repo.FindByIdempotencyKey(ctx, idempotencyKey)
	if err != nil {
		return jobs.Job{}, err
	}
	if existing != nil {
		return *existing, nil
	}

	job := jobs.Job{
		ID:             "job_" + traceutil.NewID(),
		Type:           jobType,
		Status:         adminv1.JobStatus_JOB_STATUS_QUEUED,
		TargetID:       targetID,
		TargetLabel:    targetLabel,
		RequestedBy:    requestedBy,
		IdempotencyKey: idempotencyKey,
		TraceID:        traceID,
		RequestedAt:    time.Now().UTC(),
	}
	return s.repo.Enqueue(ctx, job)
}
