// Package config はアプリケーション設定のロードを担当する。
// 環境変数から設定を読み込み、デフォルト値を提供する。
package config

import (
	"fmt"
	"os"
)

// Config はアプリケーション設定全体を表す。
type Config struct {
	HTTPAddr       string
	DatabaseDriver string
	DatabaseDSN    string
	AdminAPIToken  string
	ServiceName    string
}

// Load は環境変数から設定をロードする。
// 必須項目が未設定の場合はエラーを返す。
func Load() (Config, error) {
	cfg := Config{
		HTTPAddr:       envOr("API_HTTP_ADDR", ":8080"),
		DatabaseDriver: envOr("DATABASE_DRIVER", "mysql"),
		DatabaseDSN:    os.Getenv("DATABASE_DSN"),
		AdminAPIToken:  os.Getenv("ADMIN_API_TOKEN"),
		ServiceName:    envOr("OTEL_SERVICE_NAME", "reddit-ai-digest-api"),
	}
	if cfg.DatabaseDriver == "mysql" && cfg.DatabaseDSN == "" {
		return Config{}, fmt.Errorf("DATABASE_DSN is required when DATABASE_DRIVER=mysql")
	}
	return cfg, nil
}

// envOr は環境変数を取得し、未設定の場合はフォールバック値を返すヘルパー。
func envOr(key string, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
