package admin

import (
	"context"
	"errors"
	"testing"

	"github.com/XRayZen/reddit-ai-digest/internal/platform/jobs"
	adminv1 "github.com/XRayZen/reddit-ai-digest/packages/proto/gen/go/admin/v1"
)

type fakeJobRepository struct {
	jobs []jobs.Job
}

func (f *fakeJobRepository) List(_ context.Context, _ int) ([]jobs.Job, error) {
	return nil, nil
}

func (f *fakeJobRepository) FindByIdempotencyKey(_ context.Context, key string) (*jobs.Job, error) {
	for _, job := range f.jobs {
		if job.IdempotencyKey == key {
			copy := job
			return &copy, nil
		}
	}
	return nil, nil
}

func (f *fakeJobRepository) Enqueue(_ context.Context, job jobs.Job) (jobs.Job, error) {
	f.jobs = append(f.jobs, job)
	return job, nil
}

func TestQueueIngestionRejectsEmptyThemeSlug(t *testing.T) {
	repo := &fakeJobRepository{}
	service := NewService(repo)

	_, err := service.QueueIngestion(context.Background(), "", "tester", "idem-1", "trc-1")
	if err == nil {
		t.Fatal("expected invalid argument error")
	}
	if !errors.Is(err, ErrInvalidArgument) {
		t.Fatalf("expected ErrInvalidArgument, got %v", err)
	}
}

func TestQueueResummarizationRejectsEmptyArticleID(t *testing.T) {
	repo := &fakeJobRepository{}
	service := NewService(repo)

	_, err := service.QueueResummarization(context.Background(), "", "tester", "idem-1", "trc-1")
	if err == nil {
		t.Fatal("expected invalid argument error")
	}
	if !errors.Is(err, ErrInvalidArgument) {
		t.Fatalf("expected ErrInvalidArgument, got %v", err)
	}
}

func TestQueueAllowsDifferentTargetsWithSameIdempotencyKey(t *testing.T) {
	repo := &fakeJobRepository{}
	service := NewService(repo)

	first, err := service.QueueIngestion(context.Background(), "software-engineering", "tester", "idem-1", "trc-1")
	if err != nil {
		t.Fatalf("QueueIngestion returned error: %v", err)
	}

	second, err := service.QueueResummarization(context.Background(), "se-001", "tester", "idem-1", "trc-2")
	if err != nil {
		t.Fatalf("QueueResummarization returned error: %v", err)
	}

	if first.ID == second.ID {
		t.Fatalf("expected distinct jobs for different targets, got shared id %s", first.ID)
	}
	if len(repo.jobs) != 2 {
		t.Fatalf("expected 2 queued jobs, got %d", len(repo.jobs))
	}
	if repo.jobs[0].Type != adminv1.JobType_JOB_TYPE_INGEST || repo.jobs[1].Type != adminv1.JobType_JOB_TYPE_RESUMMARIZE {
		t.Fatalf("expected enqueue order to preserve job types, got %#v", repo.jobs)
	}
}

func TestQueueScopesIdempotencyKeyPerJobTypeAndTarget(t *testing.T) {
	repo := &fakeJobRepository{}
	service := NewService(repo)

	job, err := service.QueueIngestion(context.Background(), "software-engineering", "tester", "idem-1", "trc-1")
	if err != nil {
		t.Fatalf("QueueIngestion returned error: %v", err)
	}

	want := "JOB_TYPE_INGEST:software-engineering:idem-1"
	if job.IdempotencyKey != want {
		t.Fatalf("queued job idempotency key = %q, want %q", job.IdempotencyKey, want)
	}
	if repo.jobs[0].IdempotencyKey != want {
		t.Fatalf("persisted job idempotency key = %q, want %q", repo.jobs[0].IdempotencyKey, want)
	}
}
