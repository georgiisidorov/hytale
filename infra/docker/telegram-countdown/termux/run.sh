#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$SCRIPT_DIR"
mkdir -p data

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

export STATE_PATH="$SCRIPT_DIR/data/state.json"
export TELEGRAM_SESSION_PATH="$SCRIPT_DIR/data/session"

PYTHON="$SCRIPT_DIR/venv/bin/python"
if [[ ! -x "$PYTHON" ]]; then
  echo "Нет venv. Сначала: bash install.sh"
  exit 1
fi

exec "$PYTHON" -u "$ROOT_DIR/main.py" "$@"
