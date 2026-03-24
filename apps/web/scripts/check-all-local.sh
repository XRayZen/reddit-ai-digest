#!/usr/bin/env bash

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

echo "Using CONTENT_API_MODE=${CONTENT_API_MODE}"
echo "Live transport tests run under Vitest with mocked fetch responses."

run_step "TypeScript typecheck" corepack pnpm --filter @reddit-ai-digest/web typecheck
run_step "ESLint" corepack pnpm --filter @reddit-ai-digest/web lint
run_step "Unit tests" corepack pnpm --filter @reddit-ai-digest/web test
run_step "Storybook build test" corepack pnpm --filter @reddit-ai-digest/web test:storybook
run_step "Golden tests" corepack pnpm --filter @reddit-ai-digest/web test:golden
run_step "Prettier check" corepack pnpm --filter @reddit-ai-digest/web format

echo
echo "All apps/web checks passed."
