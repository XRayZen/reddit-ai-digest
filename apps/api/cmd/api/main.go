// Package main はAPIサーバーのエントリーポイント。
// 設定ロード、DB接続、ルーティング、graceful shutdownを担当する。
package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/XRayZen/reddit-ai-digest/apps/api/internal/adapter/db"
	"github.com/XRayZen/reddit-ai-digest/apps/api/internal/infra/config"
	httplayer "github.com/XRayZen/reddit-ai-digest/apps/api/internal/infra/httpserver"
	"github.com/XRayZen/reddit-ai-digest/apps/api/internal/infra/logger"
	connecthandler "github.com/XRayZen/reddit-ai-digest/apps/api/internal/transport/connect"
	httptransport "github.com/XRayZen/reddit-ai-digest/apps/api/internal/transport/http"
	adminusecase "github.com/XRayZen/reddit-ai-digest/apps/api/internal/usecase/admin"
	articleusecase "github.com/XRayZen/reddit-ai-digest/apps/api/internal/usecase/article"
	themeusecase "github.com/XRayZen/reddit-ai-digest/apps/api/internal/usecase/theme"
	"github.com/XRayZen/reddit-ai-digest/internal/platform/database"
	"github.com/XRayZen/reddit-ai-digest/internal/platform/jobs"
	articlev1connect "github.com/XRayZen/reddit-ai-digest/packages/proto/gen/go/article/v1/articlev1connect"
	themev1connect "github.com/XRayZen/reddit-ai-digest/packages/proto/gen/go/theme/v1/themev1connect"
	"go.opentelemetry.io/otel"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

// main はアプリケーションのエントリーポイント。
// エラー時は適切な終了コードで終了する。
func main() {
	if err := run(); err != nil {
		slog.Error("api exited with error", "error", err)
		os.Exit(1)
	}
}

// run はアプリケーションの初期化と実行を行う。
// 設定ロードからサーバー起動、graceful shutdownまでを一括して管理する。
func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	log := logger.NewJSONLogger(cfg.ServiceName)

	// OpenTelemetry TracerProviderの設定。
	// 分散トレーサーの基盤となる。
	traceProvider := sdktrace.NewTracerProvider()
	defer func() {
		_ = traceProvider.Shutdown(context.Background())
	}()
	otel.SetTracerProvider(traceProvider)

	gormDB, err := database.Open(cfg.DatabaseDriver, cfg.DatabaseDSN)
	if err != nil {
		return err
	}

	// Repositoryの作成（DBアダプター）。
	themeRepo := db.NewThemeRepository(gormDB, log)
	articleRepo := db.NewArticleRepository(gormDB, log)
	jobRepo := jobs.NewGormRepository(gormDB)

	// Usecase層の作成（ビジネスロジック）。
	themeHandler := connecthandler.NewThemeHandler(themeusecase.NewService(themeRepo))
	articleHandler := connecthandler.NewArticleHandler(articleusecase.NewService(articleRepo))
	adminHandler := httptransport.NewAdminHandler(adminusecase.NewService(jobRepo), cfg.AdminAPIToken)

	// HTTPルーターの設定。
	// Connect RPCハンドラーと管理用RESTエンドポイントを登録する。
	mux := http.NewServeMux()
	themePath, themeHTTPHandler := themev1connect.NewThemeServiceHandler(themeHandler)
	articlePath, articleHTTPHandler := articlev1connect.NewArticleServiceHandler(articleHandler)
	mux.Handle(themePath, themeHTTPHandler)
	mux.Handle(articlePath, articleHTTPHandler)
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	adminHandler.Register(mux)

	// HTTPサーバーの起動準備。
	// TraceMiddlewareでtraceID伝播とアクセスログを有効化する。
	server := &http.Server{
		Addr:    cfg.HTTPAddr,
		Handler: httplayer.TraceMiddleware(log)(mux),
	}

	// シグナルハンドリングの設定。
	// SIGINT/SIGTERMでgraceful shutdownを開始する。
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// サーバーを非同期で起動し、エラーまたはシグナルを待機する。
	errCh := make(chan error, 1)
	go func() {
		log.Info("api server starting", "addr", cfg.HTTPAddr)
		if serveErr := server.ListenAndServe(); serveErr != nil && serveErr != http.ErrServerClosed {
			errCh <- serveErr
		}
	}()

	select {
	case <-ctx.Done():
	case serveErr := <-errCh:
		return serveErr
	}

	// Graceful shutdown実行。
	// 10秒間のタイムアウトで進行中リクエストの完了を待機する。
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return server.Shutdown(shutdownCtx)
}
