//go:build e2e

package e2e

import (
	"context"
	"errors"
	"fmt"
	"testing"

	adminv1 "github.com/XRayZen/reddit-ai-digest/packages/proto/gen/go/admin/v1"
	"gorm.io/gorm"
)

// registerJobCleanup は管理 API の E2E で追加した行を後片付けする。
// t.Cleanup に寄せることで、失敗時でも DB を次ケースへ汚染しない。
func registerJobCleanup(t *testing.T, suite *testSuite, idempotencyKey string) {
	t.Helper()

	t.Cleanup(func() {
		ctx, cancel := newScenarioContext(t)
		defer cancel()

		if err := deleteJobExecutionByIdempotencyKey(ctx, suite.db, idempotencyKey); err != nil {
			t.Errorf("cleanup job execution %q: %v", idempotencyKey, err)
			return
		}
		if _, err := loadJobExecutionByIdempotencyKey(ctx, suite.db, idempotencyKey); err == nil {
			t.Errorf("cleanup job execution %q: row still exists", idempotencyKey)
		} else if !errors.Is(err, gorm.ErrRecordNotFound) && !isRecordNotFoundWrapped(err) {
			t.Errorf("cleanup job execution %q: verify delete: %v", idempotencyKey, err)
		}
	})
}

// scopedJobIdempotencyKey は admin service と同じ保存キー規則を E2E でも使う。
// DB 永続化結果と cleanup は raw key ではなく、この scoped key を基準に扱う。
func scopedJobIdempotencyKey(jobType adminv1.JobType, targetID string, rawKey string) string {
	return fmt.Sprintf("%s:%s:%s", jobType.String(), targetID, rawKey)
}

func deleteJobExecutionByIdempotencyKey(ctx context.Context, db *gorm.DB, idempotencyKey string) error {
	result := db.WithContext(ctx).Exec("DELETE FROM job_executions WHERE idempotency_key = ?", idempotencyKey)
	if result.Error != nil {
		return fmt.Errorf("delete job execution by idempotency key: %w", result.Error)
	}
	return nil
}

// isRecordNotFoundWrapped は load 側で文脈付き error に包んだ not found も許容する。
func isRecordNotFoundWrapped(err error) bool {
	return err != nil && (errors.Is(err, gorm.ErrRecordNotFound) || errors.Is(errors.Unwrap(err), gorm.ErrRecordNotFound))
}
