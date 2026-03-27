package main

import (
	"context"
	"log"

	"github.com/XRayZen/reddit-ai-digest/apps/api/internal/infra/config"
	"github.com/XRayZen/reddit-ai-digest/internal/platform/database"
	"github.com/XRayZen/reddit-ai-digest/internal/platform/migrate"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}
	db, err := database.Open(cfg.DatabaseDriver, cfg.DatabaseDSN)
	if err != nil {
		log.Fatal(err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal(err)
	}
	if err := migrate.ApplyDir(context.Background(), sqlDB, "apps/api/sql/migrations", cfg.DatabaseDriver); err != nil {
		log.Fatal(err)
	}
}
