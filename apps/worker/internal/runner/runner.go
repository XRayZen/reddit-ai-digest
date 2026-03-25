package runner

import (
	"context"
	"errors"
	"log/slog"
	"strings"
	"time"

	"github.com/XRayZen/reddit-ai-digest/internal/platform/jobs"
	"github.com/XRayZen/reddit-ai-digest/internal/platform/traceutil"
	"go.opentelemetry.io/otel"
)

type JobRepository interface {
	ClaimNextQueued(ctx context.Context) (*jobs.Job, error)
	MarkCompleted(ctx context.Context, id string) error
	MarkFailed(ctx context.Context, id string, errorCode string, errorMessage string) error
}

type Runner struct {
	repo   JobRepository
	logger *slog.Logger
}

func New(repo JobRepository, logger *slog.Logger) *Runner {
	return &Runner{repo: repo, logger: logger}
}

func (r *Runner) Run(ctx context.Context, interval time.Duration) error {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		if err := r.runOnce(ctx); err != nil {
			return err
		}
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
		}
	}
}

func (r *Runner) RunUntilDrained(ctx context.Context) error {
	for {
		job, err := r.repo.ClaimNextQueued(ctx)
		if err != nil {
			if errors.Is(err, jobs.ErrNoQueuedJobs) {
				return nil
			}
			return err
		}
		if err := r.execute(ctx, *job); err != nil {
			return err
		}
	}
}

func (r *Runner) runOnce(ctx context.Context) error {
	job, err := r.repo.ClaimNextQueued(ctx)
	if err != nil {
		if errors.Is(err, jobs.ErrNoQueuedJobs) {
			return nil
		}
		return err
	}
	return r.execute(ctx, *job)
}

func (r *Runner) execute(ctx context.Context, job jobs.Job) error {
	ctx = traceutil.WithTraceID(ctx, job.TraceID)
	ctx, span := otel.Tracer("apps/worker/jobs").Start(ctx, "jobs.execute")
	defer span.End()

	r.logger.InfoContext(ctx, "processing job",
		"trace_id", job.TraceID,
		"job_id", job.ID,
		"job_type", job.Type.String(),
		"target_id", job.TargetID,
	)

	// Dummy execution keeps the skeleton honest without wiring real Reddit or LLM providers yet.
	time.Sleep(10 * time.Millisecond)
	if strings.Contains(strings.ToLower(job.TargetID), "fail") {
		if err := r.repo.MarkFailed(ctx, job.ID, "dummy_failure", "dummy runner forced failure"); err != nil {
			return err
		}
		return nil
	}
	return r.repo.MarkCompleted(ctx, job.ID)
}
