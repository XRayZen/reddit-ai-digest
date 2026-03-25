#!/usr/bin/env bash
# =============================================================================
# apps/api ローカル開発用 一括品質チェックスクリプト
# =============================================================================
#
# 【目的】
#   バックエンド変更のセルフチェックを 1 本の導線に寄せる。
#   - Proto lint
#   - Go format check
#   - Go test
#   - Docker Compose での migrate / seed / API 起動
#   - apps/api/e2e の API / DB 一貫性検証
#
# 【設計意図】
#   - E2E は apps/api/e2e に集約し、Compose 上の MySQL と実 API を相手に検証する
#   - worker は起動しない。ジョブ投入 E2E で queued 状態を安定検証するため
#   - 終了時は down -v でコンテナと volume を掃除し、毎回 seed からやり直す
#
# 【使用例】
#   ./apps/api/scripts/check-all-local.sh
#
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${API_DIR}/../.." && pwd)"
COMPOSE_ENV_FILE="${REPO_ROOT}/infra/compose/.env"
if [ ! -f "${COMPOSE_ENV_FILE}" ]; then
  COMPOSE_ENV_FILE="${REPO_ROOT}/infra/compose/.env.example"
fi
COMPOSE=(docker compose -f "${REPO_ROOT}/infra/compose/docker-compose.yml" -f "${REPO_ROOT}/infra/compose/docker-compose.override.yml" --env-file "${COMPOSE_ENV_FILE}")

run_step() {
  local label="$1"
  shift

  echo
  echo "==> ${label}"
  "$@"
}

cleanup() {
  if ! command -v docker >/dev/null 2>&1; then
    return 0
  fi
  echo
  echo "==> Docker Compose cleanup"
  "${COMPOSE[@]}" down -v >/dev/null 2>&1 || true
}

wait_for_api() {
  local attempt
  for attempt in $(seq 1 30); do
    if curl --silent --show-error --fail http://127.0.0.1:8080/healthz >/dev/null; then
      return 0
    fi
    sleep 2
  done
  echo "API health check did not become ready in time" >&2
  return 1
}

require_command() {
  local command_name="$1"
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "Required command not found: ${command_name}" >&2
    exit 1
  fi
}

check_gofmt() {
  local files
  mapfile -t files < <(find apps internal packages -name '*.go' -print)
  if [ "${#files[@]}" -eq 0 ]; then
    return 0
  fi

  local unformatted
  unformatted=$(gofmt -l "${files[@]}")
  if [ -n "${unformatted}" ]; then
    echo "Go files need formatting:" >&2
    echo "${unformatted}" >&2
    return 1
  fi
}

trap cleanup EXIT

cd "${REPO_ROOT}"

require_command docker
require_command curl

run_step "Proto lint" corepack pnpm proto:lint
run_step "Go format check" check_gofmt
run_step "Go tests" corepack pnpm test:go

run_step "Reset Compose state" "${COMPOSE[@]}" down -v
run_step "Start MySQL" "${COMPOSE[@]}" up -d --build mysql
run_step "Run migrations" "${COMPOSE[@]}" run --rm migrate
run_step "Seed database" "${COMPOSE[@]}" run --rm seed
run_step "Start API" "${COMPOSE[@]}" up -d --build api
run_step "Wait for API health" wait_for_api
run_step "API E2E tests" env \
  API_E2E_BASE_URL=http://127.0.0.1:8080 \
  API_E2E_DATABASE_DRIVER=mysql \
  API_E2E_DATABASE_DSN='app:app@tcp(127.0.0.1:3306)/reddit_ai_digest?parseTime=true&multiStatements=true' \
  API_E2E_ADMIN_TOKEN=local-admin-token \
  PATH="$HOME/.local/go/bin:$PATH" \
  go test -tags=e2e ./apps/api/e2e/...

echo
echo "All apps/api checks passed."
