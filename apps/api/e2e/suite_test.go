//go:build e2e

package e2e

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"testing"
	"time"

	"github.com/XRayZen/reddit-ai-digest/internal/platform/database"
	"gorm.io/gorm"
)

// testSuite は E2E 用の共有接続を保持する。
// 各シナリオはここから API client と DB handle を受け取り、実際の疎通を検証する。
type testSuite struct {
	cfg           suiteConfig
	httpClient    *http.Client
	themeClient   *contentClient
	articleClient *contentClient
	adminClient   *adminClient
	db            *gorm.DB
}

var sharedSuite *testSuite

func TestMain(m *testing.M) {
	cfg := loadSuiteConfig()
	gormDB, err := database.Open(cfg.databaseDriver, cfg.databaseDSN)
	if err != nil {
		fmt.Fprintf(os.Stderr, "open database for api e2e: %v\n", err)
		os.Exit(1)
	}

	httpClient := &http.Client{Timeout: 10 * time.Second}
	sharedSuite = &testSuite{
		cfg:           cfg,
		httpClient:    httpClient,
		themeClient:   newContentClient(httpClient, cfg.apiBaseURL),
		articleClient: newContentClient(httpClient, cfg.apiBaseURL),
		adminClient:   newAdminClient(httpClient, cfg.apiBaseURL, cfg.adminToken),
		db:            gormDB,
	}

	os.Exit(m.Run())
}

func requireSuite(t *testing.T) *testSuite {
	t.Helper()

	if sharedSuite == nil {
		t.Fatal("api e2e suite is not initialized")
	}
	return sharedSuite
}

func newScenarioContext(t *testing.T) (context.Context, context.CancelFunc) {
	t.Helper()

	return context.WithTimeout(context.Background(), 10*time.Second)
}
