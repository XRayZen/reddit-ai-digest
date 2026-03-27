package jobs

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/XRayZen/reddit-ai-digest/internal/platform/database"
	adminv1 "github.com/XRayZen/reddit-ai-digest/packages/proto/gen/go/admin/v1"
)

func setupRepository(t *testing.T) *GormRepository {
	t.Helper()

	gormDB, err := database.Open("sqlite", "file:"+t.Name()+"?mode=memory&cache=shared")
	if err != nil {
		t.Fatalf("open sqlite database: %v", err)
	}
	sqlDB, err := gormDB.DB()
	if err != nil {
		t.Fatalf("get sql db: %v", err)
	}
	if _, err := sqlDB.ExecContext(context.Background(), `
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
		t.Fatalf("create test schema: %v", err)
	}
	return NewGormRepository(gormDB)
}

func TestEnqueueReturnsExistingJobForDuplicateIdempotencyKey(t *testing.T) {
	repo := setupRepository(t)
	ctx := context.Background()
	requestedAt := time.Now().UTC()

	first, err := repo.Enqueue(ctx, Job{
		ID:             "job-1",
		Type:           adminv1.JobType_JOB_TYPE_INGEST,
		Status:         adminv1.JobStatus_JOB_STATUS_QUEUED,
		TargetID:       "software-engineering",
		TargetLabel:    "theme:software-engineering",
		RequestedBy:    "tester",
		IdempotencyKey: "idem-1",
		TraceID:        "trc-1",
		RequestedAt:    requestedAt,
	})
	if err != nil {
		t.Fatalf("first Enqueue returned error: %v", err)
	}

	second, err := repo.Enqueue(ctx, Job{
		ID:             "job-2",
		Type:           adminv1.JobType_JOB_TYPE_INGEST,
		Status:         adminv1.JobStatus_JOB_STATUS_QUEUED,
		TargetID:       "software-engineering",
		TargetLabel:    "theme:software-engineering",
		RequestedBy:    "tester",
		IdempotencyKey: "idem-1",
		TraceID:        "trc-2",
		RequestedAt:    requestedAt.Add(time.Second),
	})
	if err != nil {
		t.Fatalf("second Enqueue returned error: %v", err)
	}

	if first.ID != second.ID {
		t.Fatalf("expected duplicate enqueue to return existing job %s, got %s", first.ID, second.ID)
	}
}

func TestClaimNextQueuedOnlyClaimsJobOnce(t *testing.T) {
	repo := setupRepository(t)
	ctx := context.Background()

	_, err := repo.Enqueue(ctx, Job{
		ID:             "job-claim-once",
		Type:           adminv1.JobType_JOB_TYPE_INGEST,
		Status:         adminv1.JobStatus_JOB_STATUS_QUEUED,
		TargetID:       "software-engineering",
		TargetLabel:    "theme:software-engineering",
		RequestedBy:    "tester",
		IdempotencyKey: "idem-claim-once",
		TraceID:        "trc-claim-once",
		RequestedAt:    time.Now().UTC(),
	})
	if err != nil {
		t.Fatalf("Enqueue returned error: %v", err)
	}

	results := make(chan *Job, 2)
	errs := make(chan error, 2)
	var wg sync.WaitGroup
	for range 2 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			job, claimErr := repo.ClaimNextQueued(ctx)
			if claimErr != nil {
				errs <- claimErr
				return
			}
			results <- job
		}()
	}
	wg.Wait()
	close(results)
	close(errs)

	var claimed []*Job
	for job := range results {
		claimed = append(claimed, job)
	}
	if len(claimed) != 1 {
		t.Fatalf("expected exactly one successful claim, got %d", len(claimed))
	}

	var noQueuedCount int
	for claimErr := range errs {
		if claimErr == ErrNoQueuedJobs {
			noQueuedCount++
			continue
		}
		t.Fatalf("unexpected claim error: %v", claimErr)
	}
	if noQueuedCount != 1 {
		t.Fatalf("expected one ErrNoQueuedJobs, got %d", noQueuedCount)
	}
}
