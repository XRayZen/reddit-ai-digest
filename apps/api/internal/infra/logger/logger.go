// Package logger は構造化ログの設定を提供する。
package logger

import (
	"log/slog"
	"os"
)

// NewJSONLogger はJSON形式の構造化ロガーを作成する。
// serviceタグを付与し、CloudWatch Logs等で集約しやすくする。
func NewJSONLogger(service string) *slog.Logger {
	return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{})).With("service", service)
}
