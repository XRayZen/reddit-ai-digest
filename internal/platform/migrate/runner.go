package migrate

import (
	"context"
	"database/sql"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

func ApplyDir(ctx context.Context, db *sql.DB, dir string, dialect string) error {
	// migration version は MySQL では index 可能な長さの VARCHAR に寄せる。
	if _, err := db.ExecContext(ctx, schemaMigrationsDDL(dialect)); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	entries := make([]string, 0)
	err := filepath.WalkDir(dir, func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.IsDir() || !strings.HasSuffix(path, ".up.sql") {
			return nil
		}
		entries = append(entries, path)
		return nil
	})
	if err != nil {
		return fmt.Errorf("walk migrations: %w", err)
	}
	sort.Strings(entries)

	for _, path := range entries {
		version := filepath.Base(path)
		var exists int
		if err := db.QueryRowContext(ctx, `SELECT COUNT(1) FROM schema_migrations WHERE version = ?`, version).Scan(&exists); err != nil {
			return fmt.Errorf("check migration %s: %w", version, err)
		}
		if exists > 0 {
			continue
		}

		body, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", version, err)
		}
		query := string(body)
		if dialect == "sqlite" {
			// SQLite テストでも同じ migration を使えるよう、MySQL 専用の COMMENT 句だけを落とす。
			query = stripMySQLComments(query)
		}

		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			return fmt.Errorf("begin migration %s: %w", version, err)
		}
		if _, err := tx.ExecContext(ctx, query); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("exec migration %s: %w", version, err)
		}
		if _, err := tx.ExecContext(ctx, `INSERT INTO schema_migrations(version) VALUES (?)`, version); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("record migration %s: %w", version, err)
		}
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("commit migration %s: %w", version, err)
		}
	}

	return nil
}

func schemaMigrationsDDL(dialect string) string {
	versionColumn := "TEXT"
	if dialect == "mysql" {
		versionColumn = "VARCHAR(255)"
	}

	return fmt.Sprintf(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version %s PRIMARY KEY,
			applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`, versionColumn)
}

var (
	columnCommentPattern = regexp.MustCompile(`(?m)\s+COMMENT\s+'[^']*'`)
	tableCommentPattern  = regexp.MustCompile(`(?m)\)\s+COMMENT='[^']*'`)
	indexCommentPattern  = regexp.MustCompile(`(?m)\s+COMMENT='[^']*'`)
)

func stripMySQLComments(query string) string {
	query = columnCommentPattern.ReplaceAllString(query, "")
	query = tableCommentPattern.ReplaceAllString(query, ")")
	query = indexCommentPattern.ReplaceAllString(query, "")
	return query
}
