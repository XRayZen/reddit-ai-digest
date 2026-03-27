package config

import (
	"fmt"
	"os"
	"time"
)

type Config struct {
	DatabaseDriver string
	DatabaseDSN    string
	PollInterval   time.Duration
	ServiceName    string
}

func Load() (Config, error) {
	cfg := Config{
		DatabaseDriver: envOr("DATABASE_DRIVER", "mysql"),
		DatabaseDSN:    os.Getenv("DATABASE_DSN"),
		PollInterval:   2 * time.Second,
		ServiceName:    envOr("OTEL_SERVICE_NAME", "reddit-ai-digest-worker"),
	}
	if cfg.DatabaseDriver == "mysql" && cfg.DatabaseDSN == "" {
		return Config{}, fmt.Errorf("DATABASE_DSN is required when DATABASE_DRIVER=mysql")
	}
	return cfg, nil
}

func envOr(key string, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
