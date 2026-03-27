package migrate

import (
	"context"
	"path/filepath"
	"strings"
	"testing"

	"github.com/XRayZen/reddit-ai-digest/internal/platform/database"
)

func TestSchemaMigrationsDDLSupportsMySQLPrimaryKey(t *testing.T) {
	ddl := schemaMigrationsDDL("mysql")

	if !strings.Contains(ddl, "version VARCHAR(255) PRIMARY KEY") {
		t.Fatalf("mysql ddl must use varchar primary key, got %q", ddl)
	}
}

func TestSchemaMigrationsDDLDefaultsToTextForSQLite(t *testing.T) {
	ddl := schemaMigrationsDDL("sqlite")

	if !strings.Contains(ddl, "version TEXT PRIMARY KEY") {
		t.Fatalf("sqlite ddl must keep text primary key, got %q", ddl)
	}
}

func TestApplyDirSupportsSQLiteWithMySQLComments(t *testing.T) {
	gormDB, err := database.Open("sqlite", "file:"+t.Name()+"?mode=memory&cache=shared")
	if err != nil {
		t.Fatalf("open sqlite database: %v", err)
	}
	sqlDB, err := gormDB.DB()
	if err != nil {
		t.Fatalf("get sql db: %v", err)
	}

	// SQLite テストでも本番用 migration を直接検証し、方言差分の取りこぼしを防ぐ。
	err = ApplyDir(
		context.Background(),
		sqlDB,
		filepath.Join("..", "..", "..", "apps", "api", "sql", "migrations"),
		"sqlite",
	)
	if err != nil {
		t.Fatalf("ApplyDir returned error: %v", err)
	}
}
