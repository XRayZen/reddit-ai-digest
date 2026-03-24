#!/usr/bin/env bash

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
