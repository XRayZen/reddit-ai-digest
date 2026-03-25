package runner

import (
	"context"
	"testing"

	"github.com/XRayZen/reddit-ai-digest/internal/platform/jobs"
	adminv1 "github.com/XRayZen/reddit-ai-digest/packages/proto/gen/go/admin/v1"
	"log/slog"
)

type fakeJobRepository struct {
	queue      []jobs.Job
	completed  []string
	failed     []string
	failureMsg []string
}

func (f *fakeJobRepository) ClaimNextQueued(_ context.Context) (*jobs.Job, error) {
	if len(f.queue) == 0 {
		return nil, jobs.ErrNoQueuedJobs
	}
	job := f.queue[0]
	f.queue = f.queue[1:]
	return &job, nil
}

func (f *fakeJobRepository) MarkCompleted(_ context.Context, id string) error {
	f.completed = append(f.completed, id)
	return nil
}

func (f *fakeJobRepository) MarkFailed(_ context.Context, id string, _ string, message string) error {
	f.failed = append(f.failed, id)
	f.failureMsg = append(f.failureMsg, message)
	return nil
}

func TestRunUntilDrainedCompletesAndFailsExpectedJobs(t *testing.T) {
	repo := &fakeJobRepository{
		queue: []jobs.Job{
			{ID: "job-ok", TargetID: "software-engineering", Type: adminv1.JobType_JOB_TYPE_INGEST, TraceID: "trc_ok"},
			{ID: "job-fail", TargetID: "force-fail", Type: adminv1.JobType_JOB_TYPE_RESUMMARIZE, TraceID: "trc_fail"},
		},
	}

	runner := New(repo, slog.Default())
	if err := runner.RunUntilDrained(context.Background()); err != nil {
		t.Fatalf("RunUntilDrained returned error: %v", err)
	}
	if len(repo.completed) != 1 || repo.completed[0] != "job-ok" {
		t.Fatalf("expected completed job-ok, got %#v", repo.completed)
	}
	if len(repo.failed) != 1 || repo.failed[0] != "job-fail" {
		t.Fatalf("expected failed job-fail, got %#v", repo.failed)
	}
}
