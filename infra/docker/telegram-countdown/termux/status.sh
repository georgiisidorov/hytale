#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/data/countdown.pid"
LOG_FILE="$SCRIPT_DIR/data/countdown.log"
STATE_FILE="$SCRIPT_DIR/data/state.json"

if [[ -f "$PID_FILE" ]]; then
  pid="$(cat "$PID_FILE")"
  if kill -0 "$pid" 2>/dev/null; then
    echo "Работает (pid $pid)"
  else
    echo "PID-файл есть, процесс мёртв (pid $pid)"
  fi
else
  echo "Не запущен"
fi

[[ -f "$STATE_FILE" ]] && echo "--- state.json ---" && cat "$STATE_FILE"
[[ -f "$LOG_FILE" ]] && echo "--- последние строки лога ---" && tail -n 15 "$LOG_FILE"
