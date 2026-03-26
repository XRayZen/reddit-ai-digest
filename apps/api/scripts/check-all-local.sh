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
MANAGED_PIDS=()
MYSQL_SERVICE_NAME="mysql"
MYSQL_DATABASE_NAME="${MYSQL_DATABASE:-reddit_ai_digest}"

run_step() {
  local label="$1"
  shift

  echo
  echo "==> ${label}"
  "$@"
}

register_cleanup_pid() {
  local pid="$1"
  if [ -n "${pid}" ]; then
    # 将来バックグラウンド起動を追加しても、他人の開発プロセスではなく
    # このスクリプトが生やした PID だけを cleanup 対象にできるようにする。
    MANAGED_PIDS+=("${pid}")
  fi
}

compose_service_running() {
  local service_name="$1"
  local container_id

  container_id="$("${COMPOSE[@]}" ps -q "${service_name}" 2>/dev/null || true)"
  if [ -z "${container_id}" ]; then
    return 1
  fi

  docker inspect -f '{{.State.Running}}' "${container_id}" 2>/dev/null | grep -q '^true$'
}

cleanup_managed_processes() {
  local pid
  local still_running=()

  if [ "${#MANAGED_PIDS[@]}" -eq 0 ]; then
    return 0
  fi

  echo
  echo "==> Local process cleanup"

  # スクリプトが起動した補助プロセスだけを止め、既存の開発用プロセスは巻き込まない。
  for pid in "${MANAGED_PIDS[@]}"; do
    if kill -0 "${pid}" 2>/dev/null; then
      kill "${pid}" 2>/dev/null || true
      still_running+=("${pid}")
    fi
  done

  if [ "${#still_running[@]}" -eq 0 ]; then
    return 0
  fi

  sleep 1
  for pid in "${still_running[@]}"; do
    if kill -0 "${pid}" 2>/dev/null; then
      kill -9 "${pid}" 2>/dev/null || true
    fi
  done
}

cleanup_database() {
  if ! command -v docker >/dev/null 2>&1; then
    return 0
  fi
  if ! compose_service_running "${MYSQL_SERVICE_NAME}"; then
    return 0
  fi

  echo
  echo "==> Database cleanup"

  # volume 削除に失敗しても次回導線を seed から再現できるよう、DB 自体も初期化しておく。
  "${COMPOSE[@]}" exec -T "${MYSQL_SERVICE_NAME}" sh -lc '
    mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" <<SQL
DROP DATABASE IF EXISTS `'"${MYSQL_DATABASE_NAME}"'`;
CREATE DATABASE `'"${MYSQL_DATABASE_NAME}"' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SQL
  ' >/dev/null 2>&1 || true
}

cleanup_compose() {
  if ! command -v docker >/dev/null 2>&1; then
    return 0
  fi
  echo
  echo "==> Docker Compose cleanup"
  "${COMPOSE[@]}" down -v >/dev/null 2>&1 || true
}

cleanup() {
  local exit_code="$1"

  # cleanup は exit code を変えずに後始末だけを担わせ、失敗原因の追跡を保つ。
  cleanup_managed_processes
  cleanup_database
  cleanup_compose

  exit "${exit_code}"
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

on_exit() {
  local exit_code="$1"
  # cleanup 内の docker / mysql コマンド失敗で trap が再入すると追跡しづらくなるため、
  # 最初に trap を外して終了経路を 1 回に固定する。
  trap - EXIT INT TERM
  cleanup "${exit_code}"
}

trap 'on_exit $?' EXIT
trap 'on_exit 130' INT
trap 'on_exit 143' TERM

cd "${REPO_ROOT}"

require_command docker
require_command curl

run_step "Proto lint" corepack pnpm proto:lint
run_step "Go format check" check_gofmt
run_step "Go tests" corepack pnpm test:go

run_step "Reset Compose state" "${COMPOSE[@]}" down -v
run_step "Start MySQL" "${COMPOSE[@]}" up -d --build mysql
run_step "Run migrations" "${COMPOSE[@]}" run --rm --build migrate
run_step "Seed database" "${COMPOSE[@]}" run --rm --build seed
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
