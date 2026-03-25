package main

import (
	"context"
	"log"

	"github.com/XRayZen/reddit-ai-digest/apps/api/internal/adapter/db"
	"github.com/XRayZen/reddit-ai-digest/apps/api/internal/infra/config"
	"github.com/XRayZen/reddit-ai-digest/internal/platform/database"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}
	gormDB, err := database.Open(cfg.DatabaseDriver, cfg.DatabaseDSN)
	if err != nil {
		log.Fatal(err)
	}
	if err := db.Seed(context.Background(), gormDB); err != nil {
		log.Fatal(err)
	}
}
