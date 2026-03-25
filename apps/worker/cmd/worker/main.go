package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/XRayZen/reddit-ai-digest/apps/worker/internal/config"
	"github.com/XRayZen/reddit-ai-digest/apps/worker/internal/logger"
	"github.com/XRayZen/reddit-ai-digest/apps/worker/internal/runner"
	"github.com/XRayZen/reddit-ai-digest/internal/platform/database"
	"github.com/XRayZen/reddit-ai-digest/internal/platform/jobs"
	"go.opentelemetry.io/otel"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

func main() {
	if err := run(); err != nil {
		slog.Error("worker exited with error", "error", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	log := logger.NewJSONLogger(cfg.ServiceName)

	traceProvider := sdktrace.NewTracerProvider()
	defer func() {
		_ = traceProvider.Shutdown(context.Background())
	}()
	otel.SetTracerProvider(traceProvider)

	gormDB, err := database.Open(cfg.DatabaseDriver, cfg.DatabaseDSN)
	if err != nil {
		return err
	}
	jobRepo := jobs.NewGormRepository(gormDB)
	jobRunner := runner.New(jobRepo, log)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	log.Info("worker started")
	return jobRunner.Run(ctx, cfg.PollInterval)
}
