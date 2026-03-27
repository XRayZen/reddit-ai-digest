package jobs

import (
	"context"
	"errors"
	"fmt"
	"time"

	adminv1 "github.com/XRayZen/reddit-ai-digest/packages/proto/gen/go/admin/v1"
	"gorm.io/gorm"
)

var ErrNoQueuedJobs = errors.New("no queued jobs")

const claimRetryLimit = 8

type Job struct {
	ID             string
	Type           adminv1.JobType
	Status         adminv1.JobStatus
	TargetID       string
	TargetLabel    string
	RequestedBy    string
	IdempotencyKey string
	TraceID        string
	ErrorCode      string
	ErrorMessage   string
	RequestedAt    time.Time
	StartedAt      *time.Time
	FinishedAt     *time.Time
}

type Repository interface {
	List(ctx context.Context, limit int) ([]Job, error)
	FindByIdempotencyKey(ctx context.Context, key string) (*Job, error)
	Enqueue(ctx context.Context, job Job) (Job, error)
	ClaimNextQueued(ctx context.Context) (*Job, error)
	MarkCompleted(ctx context.Context, id string) error
	MarkFailed(ctx context.Context, id string, errorCode string, errorMessage string) error
}

type GormRepository struct {
	db *gorm.DB
}

func NewGormRepository(db *gorm.DB) *GormRepository {
	return &GormRepository{db: db}
}

type model struct {
	ID             string     `gorm:"column:id;primaryKey"`
	Type           int32      `gorm:"column:type;not null"`
	Status         int32      `gorm:"column:status;not null"`
	TargetID       string     `gorm:"column:target_id;not null"`
	TargetLabel    string     `gorm:"column:target_label;not null"`
	RequestedBy    string     `gorm:"column:requested_by;not null"`
	IdempotencyKey string     `gorm:"column:idempotency_key;uniqueIndex;not null"`
	TraceID        string     `gorm:"column:trace_id;not null"`
	ErrorCode      string     `gorm:"column:error_code"`
	ErrorMessage   string     `gorm:"column:error_message"`
	RequestedAt    time.Time  `gorm:"column:requested_at;not null"`
	StartedAt      *time.Time `gorm:"column:started_at"`
	FinishedAt     *time.Time `gorm:"column:finished_at"`
}

func (model) TableName() string {
	return "job_executions"
}

func (r *GormRepository) List(ctx context.Context, limit int) ([]Job, error) {
	if limit <= 0 {
		limit = 50
	}
	var rows []model
	if err := r.db.WithContext(ctx).
		Order("requested_at DESC, id DESC").
		Limit(limit).
		Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("list jobs: %w", err)
	}
	jobs := make([]Job, 0, len(rows))
	for _, row := range rows {
		jobs = append(jobs, row.toDomain())
	}
	return jobs, nil
}

func (r *GormRepository) FindByIdempotencyKey(ctx context.Context, key string) (*Job, error) {
	var row model
	if err := r.db.WithContext(ctx).Where("idempotency_key = ?", key).First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, fmt.Errorf("find job by idempotency key: %w", err)
	}
	job := row.toDomain()
	return &job, nil
}

func (r *GormRepository) Enqueue(ctx context.Context, job Job) (Job, error) {
	row := model{
		ID:             job.ID,
		Type:           int32(job.Type),
		Status:         int32(job.Status),
		TargetID:       job.TargetID,
		TargetLabel:    job.TargetLabel,
		RequestedBy:    job.RequestedBy,
		IdempotencyKey: job.IdempotencyKey,
		TraceID:        job.TraceID,
		ErrorCode:      job.ErrorCode,
		ErrorMessage:   job.ErrorMessage,
		RequestedAt:    job.RequestedAt,
		StartedAt:      job.StartedAt,
		FinishedAt:     job.FinishedAt,
	}
	if err := r.db.WithContext(ctx).Create(&row).Error; err != nil {
		// 同じ idempotency key の競合時は既存 job を返し、リトライを成功扱いに寄せる。
		existing, lookupErr := r.FindByIdempotencyKey(ctx, job.IdempotencyKey)
		if lookupErr == nil && existing != nil {
			return *existing, nil
		}
		if lookupErr != nil {
			return Job{}, fmt.Errorf("enqueue job: %w (lookup existing: %v)", err, lookupErr)
		}
		return Job{}, fmt.Errorf("enqueue job: %w", err)
	}
	return row.toDomain(), nil
}

func (r *GormRepository) ClaimNextQueued(ctx context.Context) (*Job, error) {
	for range claimRetryLimit {
		var claimed *Job
		err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			var row model
			if err := tx.Where("status = ?", int32(adminv1.JobStatus_JOB_STATUS_QUEUED)).
				Order("requested_at ASC, id ASC").
				First(&row).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return ErrNoQueuedJobs
				}
				return err
			}
			now := time.Now().UTC()
			result := tx.Model(&model{}).
				Where("id = ? AND status = ?", row.ID, int32(adminv1.JobStatus_JOB_STATUS_QUEUED)).
				Updates(map[string]any{
					"status":     int32(adminv1.JobStatus_JOB_STATUS_RUNNING),
					"started_at": &now,
				})
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected == 0 {
				// claim 競合後は transaction を張り直し、新しい snapshot で次候補を取り直す。
				return nil
			}
			row.Status = int32(adminv1.JobStatus_JOB_STATUS_RUNNING)
			row.StartedAt = &now
			domainJob := row.toDomain()
			claimed = &domainJob
			return nil
		})
		if err != nil {
			if errors.Is(err, ErrNoQueuedJobs) {
				return nil, ErrNoQueuedJobs
			}
			return nil, fmt.Errorf("claim next queued job: %w", err)
		}
		if claimed != nil {
			return claimed, nil
		}
	}
	return nil, fmt.Errorf("claim next queued job: exceeded retry limit")
}

func (r *GormRepository) MarkCompleted(ctx context.Context, id string) error {
	now := time.Now().UTC()
	if err := r.db.WithContext(ctx).Model(&model{}).
		Where("id = ?", id).
		Updates(map[string]any{
			"status":        int32(adminv1.JobStatus_JOB_STATUS_COMPLETED),
			"finished_at":   &now,
			"error_code":    "",
			"error_message": "",
		}).Error; err != nil {
		return fmt.Errorf("mark job completed: %w", err)
	}
	return nil
}

func (r *GormRepository) MarkFailed(ctx context.Context, id string, errorCode string, errorMessage string) error {
	now := time.Now().UTC()
	if err := r.db.WithContext(ctx).Model(&model{}).
		Where("id = ?", id).
		Updates(map[string]any{
			"status":        int32(adminv1.JobStatus_JOB_STATUS_FAILED),
			"finished_at":   &now,
			"error_code":    errorCode,
			"error_message": errorMessage,
		}).Error; err != nil {
		return fmt.Errorf("mark job failed: %w", err)
	}
	return nil
}

func (m model) toDomain() Job {
	return Job{
		ID:             m.ID,
		Type:           adminv1.JobType(m.Type),
		Status:         adminv1.JobStatus(m.Status),
		TargetID:       m.TargetID,
		TargetLabel:    m.TargetLabel,
		RequestedBy:    m.RequestedBy,
		IdempotencyKey: m.IdempotencyKey,
		TraceID:        m.TraceID,
		ErrorCode:      m.ErrorCode,
		ErrorMessage:   m.ErrorMessage,
		RequestedAt:    m.RequestedAt,
		StartedAt:      m.StartedAt,
		FinishedAt:     m.FinishedAt,
	}
}
