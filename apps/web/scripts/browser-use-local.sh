#!/usr/bin/env bash
# =============================================================================
# Browser Use ラッパースクリプト
# =============================================================================
#
# 【目的】
#   browser-use (AI エージェント用ブラウザ自動化ツール) の実行環境を設定し、
#   Docker コンテナ内 / Root ユーザー環境でも動作するようにする。
#
# 【使用頻度】
#   - E2E 的なブラウザ操作テスト実行時
#   - スクリーンショット回帰テスト実行時
#   - apps/web/test-scenarios/browser-use-cli.md で記述されたテストシナリオ実行
#
# 【設計意図】
#   - ~/.local/bin を PATH に追加し、uv でインストールしたツールを優先的に使用
#   - browser-use のインストール有無を事前チェック
#   - CONTENT_API_MODE=mock を強制設定（外部 API に依存しないテスト実行のため）
#   - IN_DOCKER=true を設定し、Chromium のサンドボックス問題を回避
#     ※ Root 環境で Chromium サンドボックスが有効だと browser-use がハングする問題への対処
#
# 【使用例】
#   # サイトを開いてスクリーンショット撮影
#   ./apps/web/scripts/browser-use-local.sh --session webcheck open http://127.0.0.1:3000
#   ./apps/web/scripts/browser-use-local.sh --session webcheck screenshot apps/web/artifacts/home.png
#   ./apps/web/scripts/browser-use-local.sh --session webcheck close
#
# 【関連ドキュメント】
#   - apps/web/test-scenarios/browser-use-cli.md
#   - docs/operations/local-development.md
#
# =============================================================================

set -euo pipefail

if [[ -d "$HOME/.local/bin" ]]; then
  export PATH="$HOME/.local/bin:$PATH"
fi

if ! command -v browser-use >/dev/null 2>&1; then
  echo "browser-use command not found. Install it first with 'uv tool install browser-use'." >&2
  echo "This wrapper expects local UI checks to run with CONTENT_API_MODE=mock." >&2
  exit 1
fi

# browser-use hangs when Chromium sandboxing stays enabled in this root-based environment.
exec env CONTENT_API_MODE=mock IN_DOCKER=true browser-use "$@"
