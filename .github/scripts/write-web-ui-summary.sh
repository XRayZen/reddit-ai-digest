#!/usr/bin/env bash

set -euo pipefail

# 各 step outcome を絵文字付きの短い表示へ寄せ、Job Summary を一覧で読みやすくする。
format_status() {
  local outcome="$1"

  case "$outcome" in
    success)
      printf '%s' "PASS"
      ;;
    failure)
      printf '%s' "FAIL"
      ;;
    skipped)
      printf '%s' "SKIP"
      ;;
    *)
      printf '%s' "UNKNOWN"
      ;;
  esac
}

# 失敗した確認項目だけ別行で出し、PR 上で再確認が必要な箇所をすぐ特定できるようにする。
collect_failures() {
  local failures=()

  [[ "${LINT_OUTCOME:-}" == "failure" ]] && failures+=("Lint")
  [[ "${TYPECHECK_OUTCOME:-}" == "failure" ]] && failures+=("Typecheck")
  [[ "${UNIT_TESTS_OUTCOME:-}" == "failure" ]] && failures+=("Unit tests")
  [[ "${BUILD_STORYBOOK_OUTCOME:-}" == "failure" ]] && failures+=("Build Storybook")
  [[ "${GOLDEN_TESTS_OUTCOME:-}" == "failure" ]] && failures+=("Storybook golden tests")
  [[ "${E2E_TESTS_OUTCOME:-}" == "failure" ]] && failures+=("Playwright E2E tests")

  if ((${#failures[@]} == 0)); then
    printf '%s\n' "- None"
    return
  fi

  printf -- '- %s\n' "${failures[@]}"
}

{
  # PR の job summary だけで全体像を把握できるよう、品質ゲートを同じ表形式で並べる。
  echo "## Web UI Check Summary"
  echo
  echo "| Check | Result |"
  echo "| --- | --- |"
  echo "| Lint | $(format_status "${LINT_OUTCOME:-unknown}") |"
  echo "| Typecheck | $(format_status "${TYPECHECK_OUTCOME:-unknown}") |"
  echo "| Unit tests | $(format_status "${UNIT_TESTS_OUTCOME:-unknown}") |"
  echo "| Build Storybook | $(format_status "${BUILD_STORYBOOK_OUTCOME:-unknown}") |"
  echo "| Storybook golden tests | $(format_status "${GOLDEN_TESTS_OUTCOME:-unknown}") |"
  echo "| Playwright E2E tests | $(format_status "${E2E_TESTS_OUTCOME:-unknown}") |"
  echo
  # failure 一覧を別に出し、表を見て探さなくても再確認対象が分かるようにする。
  echo "### Failed checks"
  collect_failures
  echo
  echo "### Artifacts"
  echo "- Visual reports and test outputs are uploaded as \`web-ui-artifacts\`."
  echo "- Playwright HTML reports: \`apps/web/playwright-report\`"
  echo "- Playwright raw outputs: \`apps/web/test-results\`"
} >> "${GITHUB_STEP_SUMMARY}"
