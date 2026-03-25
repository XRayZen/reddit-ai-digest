//go:build e2e

package e2e

import (
	"fmt"
	"testing"
	"time"

	"github.com/XRayZen/reddit-ai-digest/internal/platform/traceutil"
	adminv1 "github.com/XRayZen/reddit-ai-digest/packages/proto/gen/go/admin/v1"
)

// TestAdminEndpoints は管理 REST の最小導線を検証する。
// worker を起動しない前提で queued 状態を固定し、enqueue と trace_id 伝播を重点的に見る。
func TestAdminEndpoints(t *testing.T) {
	suite := requireSuite(t)

	testCases := []scenarioCase{
		{
			name: "ListJobs returns seeded jobs",
			run: func(t *testing.T) {
				ctx, cancel := newScenarioContext(t)
				defer cancel()

				traceID := traceutil.NewID()
				resp, headers, err := suite.adminClient.listJobs(ctx, traceID)
				if err != nil {
					t.Fatalf("list jobs: %v", err)
				}
				if len(resp) < 2 {
					t.Fatalf("expected at least 2 seeded jobs, got %d", len(resp))
				}
				if headers.Get(traceutil.HeaderTraceID) != traceID {
					t.Fatalf("trace header = %q, want %q", headers.Get(traceutil.HeaderTraceID), traceID)
				}
			},
		},
		{
			name: "RunIngestion enqueues a queued job and keeps trace id",
			run: func(t *testing.T) {
				ctx, cancel := newScenarioContext(t)
				defer cancel()

				traceID := traceutil.NewID()
				idempotencyKey := fmt.Sprintf("api-e2e-ingest-%d", time.Now().UnixNano())
				registerJobCleanup(t, suite, idempotencyKey)

				// REST 応答と永続化結果の両方で、enqueue された job のメタデータを確認する。
				resp, headers, err := suite.adminClient.queueIngestion(ctx, traceID, runJobRequest{
					ThemeSlug:      "software-engineering",
					RequestedBy:    "api-e2e",
					IdempotencyKey: idempotencyKey,
				})
				if err != nil {
					t.Fatalf("queue ingestion: %v", err)
				}
				if resp.Type != "ingest" || resp.Status != "queued" {
					t.Fatalf("unexpected queue ingestion response: %+v", resp)
				}
				if resp.TargetLabel != "theme:software-engineering" {
					t.Fatalf("queue ingestion target label = %q", resp.TargetLabel)
				}
				if headers.Get(traceutil.HeaderTraceID) != traceID {
					t.Fatalf("trace header = %q, want %q", headers.Get(traceutil.HeaderTraceID), traceID)
				}

				dbRow, err := loadJobExecutionByIdempotencyKey(ctx, suite.db, idempotencyKey)
				if err != nil {
					t.Fatalf("load queued ingestion job: %v", err)
				}
				if dbRow.ID != resp.ID {
					t.Fatalf("queued ingestion job id = %q, want %q", dbRow.ID, resp.ID)
				}
				if dbRow.Type != adminv1.JobType_JOB_TYPE_INGEST {
					t.Fatalf("queued ingestion type = %s", dbRow.Type.String())
				}
				if dbRow.Status != adminv1.JobStatus_JOB_STATUS_QUEUED {
					t.Fatalf("queued ingestion status = %s", dbRow.Status.String())
				}
				if dbRow.TargetID != "software-engineering" || dbRow.TargetLabel != "theme:software-engineering" {
					t.Fatalf("queued ingestion target mismatch")
				}
				if dbRow.RequestedBy != "api-e2e" || dbRow.TraceID != traceID {
					t.Fatalf("queued ingestion metadata mismatch")
				}
			},
		},
		{
			name: "RunResummarization enqueues a queued job and keeps trace id",
			run: func(t *testing.T) {
				ctx, cancel := newScenarioContext(t)
				defer cancel()

				traceID := traceutil.NewID()
				idempotencyKey := fmt.Sprintf("api-e2e-resummary-%d", time.Now().UnixNano())
				registerJobCleanup(t, suite, idempotencyKey)

				resp, headers, err := suite.adminClient.queueResummarization(ctx, traceID, runJobRequest{
					ArticleID:      "se-001",
					RequestedBy:    "api-e2e",
					IdempotencyKey: idempotencyKey,
				})
				if err != nil {
					t.Fatalf("queue resummarization: %v", err)
				}
				if resp.Type != "resummarize" || resp.Status != "queued" {
					t.Fatalf("unexpected queue resummarization response: %+v", resp)
				}
				if resp.TargetLabel != "article:se-001" {
					t.Fatalf("queue resummarization target label = %q", resp.TargetLabel)
				}
				if headers.Get(traceutil.HeaderTraceID) != traceID {
					t.Fatalf("trace header = %q, want %q", headers.Get(traceutil.HeaderTraceID), traceID)
				}

				dbRow, err := loadJobExecutionByIdempotencyKey(ctx, suite.db, idempotencyKey)
				if err != nil {
					t.Fatalf("load queued resummarization job: %v", err)
				}
				if dbRow.ID != resp.ID {
					t.Fatalf("queued resummarization job id = %q, want %q", dbRow.ID, resp.ID)
				}
				if dbRow.Type != adminv1.JobType_JOB_TYPE_RESUMMARIZE {
					t.Fatalf("queued resummarization type = %s", dbRow.Type.String())
				}
				if dbRow.Status != adminv1.JobStatus_JOB_STATUS_QUEUED {
					t.Fatalf("queued resummarization status = %s", dbRow.Status.String())
				}
				if dbRow.TargetID != "se-001" || dbRow.TargetLabel != "article:se-001" {
					t.Fatalf("queued resummarization target mismatch")
				}
				if dbRow.RequestedBy != "api-e2e" || dbRow.TraceID != traceID {
					t.Fatalf("queued resummarization metadata mismatch")
				}
			},
		},
	}

	runScenarioCases(t, testCases)
}
