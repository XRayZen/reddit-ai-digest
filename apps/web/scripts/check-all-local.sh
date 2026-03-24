#!/usr/bin/env bash
# =============================================================================
# apps/web ローカル開発用 一括品質チェックスクリプト
# =============================================================================
#
# 【目的】
#   プルリクエスト作成前に実行することで、以下の品質チェックを一括実行する:
#   - TypeScript 型チェック
#   - ESLint (リンティング)
#   - Unit テスト (Vitest)
#   - Storybook ビルドテスト
#   - Golden テスト (Visual Regression)
#   - Playwright E2E テスト (主要導線)
#   - Prettier (フォーマットチェック)
#
# 【使用頻度】
#   - プルリク作成前の手動実行
#   - 機能実装完了後のセルフチェック
#   - docs/operations/local-development.md や apps/web/AGENTS.md で言及されている完了条件チェック
#
# 【設計意図】
#   - ローカル開発環境での実行を前提としている
#   - CI (.github/workflows/web-ui.yml) では同等のコマンドを個別に実行
#   - CONTENT_API_MODE 環境変数により、API モードを制御（デフォルト: mock）
#   - 各ステップの進捗が分かりよう "==> ラベル" 形式で出力
#
# 【使用例】
#   ./apps/web/scripts/check-all-local.sh              # mock モードで実行
#   CONTENT_API_MODE=live ./apps/web/scripts/check-all-local.sh  # unit / transport は live 設定で確認しつつ、UI 系は mock 既定で実行
#
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${WEB_DIR}/../.." && pwd)"

run_step() {
  local label="$1"
  shift

  echo
  echo "==> ${label}"
  "$@"
}

cd "${REPO_ROOT}"

export CONTENT_API_MODE="${CONTENT_API_MODE:-mock}"

# Storybook / golden / E2E を backend 非依存で安定させるため、
# UI 系チェックは mock を既定にする。
echo "Using CONTENT_API_MODE=${CONTENT_API_MODE}"
echo "Live transport tests run under Vitest with mocked fetch responses."

run_step "TypeScript typecheck" corepack pnpm --filter @reddit-ai-digest/web typecheck
run_step "ESLint" corepack pnpm --filter @reddit-ai-digest/web lint
run_step "Unit tests" corepack pnpm --filter @reddit-ai-digest/web test
run_step "Storybook build test" corepack pnpm --filter @reddit-ai-digest/web test:storybook
run_step "Golden tests" corepack pnpm --filter @reddit-ai-digest/web test:golden
run_step "Playwright E2E tests" corepack pnpm --filter @reddit-ai-digest/web test:e2e
run_step "Prettier check" corepack pnpm --filter @reddit-ai-digest/web format

echo
echo "All apps/web checks passed."
