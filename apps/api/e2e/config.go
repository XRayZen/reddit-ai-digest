//go:build e2e

package e2e

import "os"

const (
	defaultAPIBaseURL   = "http://127.0.0.1:8080"
	defaultDatabaseDSN  = "app:app@tcp(127.0.0.1:3306)/reddit_ai_digest?parseTime=true&multiStatements=true"
	defaultDatabaseType = "mysql"
	defaultAdminToken   = "local-admin-token"
)

// suiteConfig は E2E スイートの接続先設定をまとめる。
// ローカル Compose 実行と CI 上の手動起動の両方から同じテスト群を再利用する。
type suiteConfig struct {
	apiBaseURL     string
	databaseDriver string
	databaseDSN    string
	adminToken     string
}

// loadSuiteConfig は E2E 用の接続先を環境変数から組み立てる。
// API/DB を外から差し替えられるようにしつつ、Compose ローカル実行では何も渡さなくても動く既定値を持たせる。
func loadSuiteConfig() suiteConfig {
	return suiteConfig{
		apiBaseURL:     envOr("API_E2E_BASE_URL", defaultAPIBaseURL),
		databaseDriver: envOr("API_E2E_DATABASE_DRIVER", envOr("DATABASE_DRIVER", defaultDatabaseType)),
		databaseDSN:    envOr("API_E2E_DATABASE_DSN", envOr("DATABASE_DSN", defaultDatabaseDSN)),
		adminToken:     envOr("API_E2E_ADMIN_TOKEN", envOr("ADMIN_API_TOKEN", defaultAdminToken)),
	}
}

// envOr は E2E テスト設定の既定値解決を 1 箇所に寄せる。
func envOr(key string, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
