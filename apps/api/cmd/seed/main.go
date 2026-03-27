package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/XRayZen/reddit-ai-digest/apps/api/internal/infra/config"
	"github.com/XRayZen/reddit-ai-digest/internal/platform/database"
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

	seedsDir, err := resolveSeedDir("apps/api/sql/seeds")
	if err != nil {
		log.Fatal(err)
	}

	if err := applySeeds(context.Background(), sqlDB, seedsDir, cfg.DatabaseDriver); err != nil {
		log.Fatal(err)
	}
	log.Println("Seed data applied successfully")
}

func resolveSeedDir(relativePath string) (string, error) {
	candidates := []string{
		relativePath,
		filepath.Join("/app", relativePath),
		filepath.Join("/workspace", relativePath),
	}

	for _, candidate := range candidates {
		info, err := os.Stat(candidate)
		if err == nil && info.IsDir() {
			return candidate, nil
		}
	}

	return "", fmt.Errorf("seed directory not found: %s", relativePath)
}

// applySeeds は指定ディレクトリの *.sql ファイルをアルファベット順に実行する。
// マイグレーションと異なりバージョン管理は行わず、再実行可能なSQLであることを前提とする。
func applySeeds(ctx context.Context, db *sql.DB, dir string, dialect string) error {
	entries := make([]string, 0)
	err := filepath.WalkDir(dir, func(path string, osEntry os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if osEntry.IsDir() || !strings.HasSuffix(path, ".sql") {
			return nil
		}
		entries = append(entries, path)
		return nil
	})
	if err != nil {
		return err
	}
	sort.Strings(entries)

	for _, path := range entries {
		body, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		query := string(body)

		// SQLite テストでも同じ seed を使えるよう、MySQL 専用の COMMENT 句だけを落とす
		if dialect == "sqlite" {
			query = sqliteCompatibleSeedQuery(query)
		}

		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, query); err != nil {
			_ = tx.Rollback()
			return err
		}
		if err := tx.Commit(); err != nil {
			return err
		}
		log.Printf("Applied seed: %s", filepath.Base(path))
	}

	return nil
}

// sqliteCompatibleSeedQuery は seed SQL のうち SQLite 非対応の MySQL 構文を吸収する。
// 開発用 seed を 1 本に保ちつつ、Docker 不可環境でも API E2E を実行できるようにする。
func sqliteCompatibleSeedQuery(query string) string {
	query = stripMySQLComments(query)
	query = strings.ReplaceAll(query, "INSERT IGNORE INTO", "INSERT OR IGNORE INTO")
	query = strings.ReplaceAll(query, "insert ignore into", "INSERT OR IGNORE INTO")
	query = rewriteSQLiteUpserts(query)
	return query
}

// stripMySQLComments は MySQL の COMMENT 句を削除する（SQLite 互換化）
// internal/platform/migrate/runner.go と同じ実装
func stripMySQLComments(query string) string {
	var (
		columnCommentPattern = regexp.MustCompile(`(?m)\s+COMMENT\s+'[^']*'`)
		tableCommentPattern  = regexp.MustCompile(`(?m)\)\s+COMMENT='[^']*'`)
		indexCommentPattern  = regexp.MustCompile(`(?m)\s+COMMENT='[^']*'`)
	)
	query = columnCommentPattern.ReplaceAllString(query, "")
	query = tableCommentPattern.ReplaceAllString(query, ")")
	query = indexCommentPattern.ReplaceAllString(query, "")
	return query
}

func rewriteSQLiteUpserts(query string) string {
	upsertPattern := regexp.MustCompile(`(?is)INSERT\s+INTO\s+(job_executions\s*\([^;]+?\)\s*VALUES\s*\([^;]+?\))\s*ON\s+DUPLICATE\s+KEY\s+UPDATE\s+[^;]+;`)

	return upsertPattern.ReplaceAllStringFunc(query, func(statement string) string {
		matches := upsertPattern.FindStringSubmatch(statement)
		if len(matches) < 2 {
			return statement
		}

		return "INSERT OR REPLACE INTO " + matches[1] + ";"
	})
}
