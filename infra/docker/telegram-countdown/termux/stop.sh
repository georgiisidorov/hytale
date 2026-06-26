#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/data/countdown.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "Не запущен (нет $PID_FILE)"
  exit 0
fi

pid="$(cat "$PID_FILE")"
if kill -0 "$pid" 2>/dev/null; then
  kill "$pid" || true
  sleep 1
  kill -9 "$pid" 2>/dev/null || true
  echo "Остановлен pid $pid"
else
  echo "Процесс $pid уже не работает"
fi

rm -f "$PID_FILE"

if command -v termux-wake-unlock >/dev/null 2>&1; then
  termux-wake-unlock || true
fi
