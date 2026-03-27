// Package httpserver はHTTPサーバーの共通機能を提供する。
package httpserver

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/XRayZen/reddit-ai-digest/internal/platform/traceutil"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
)

// statusCapturingResponseWriter はHTTPステータスコードをキャプチャするResponseWriterラッパー。
type statusCapturingResponseWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusCapturingResponseWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

// TraceMiddleware はtraceID伝播とアクセスログを行うミドルウェア。
// リクエストヘッダーからtraceIDを取得または生成し、コンテキストとレスポンスヘッダーに設定する。
func TraceMiddleware(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			traceID := traceutil.FromHeaderOrNew(r.Header.Get(traceutil.HeaderTraceID))
			ctx := traceutil.WithTraceID(r.Context(), traceID)
			ctx, span := otel.Tracer("apps/api/http").Start(ctx, r.Method+" "+r.URL.Path)
			defer span.End()

			start := time.Now()
			w.Header().Set(traceutil.HeaderTraceID, traceID)
			writer := &statusCapturingResponseWriter{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(writer, r.WithContext(ctx))

			latency := time.Since(start).Milliseconds()
			span.SetAttributes(
				attribute.String("http.method", r.Method),
				attribute.String("http.route", r.URL.Path),
				attribute.Int("http.status_code", writer.status),
				attribute.String("trace_id", traceID),
				attribute.Int64("latency_ms", latency),
			)
			logger.InfoContext(ctx, "request completed",
				"trace_id", traceID,
				"method", r.Method,
				"path", r.URL.Path,
				"status", writer.status,
				"latency_ms", latency,
			)
		})
	}
}
