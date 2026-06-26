#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
mkdir -p data

PID_FILE="$SCRIPT_DIR/data/countdown.pid"
LOG_FILE="$SCRIPT_DIR/data/countdown.log"

if [[ -f "$PID_FILE" ]]; then
  old_pid="$(cat "$PID_FILE")"
  if kill -0 "$old_pid" 2>/dev/null; then
    echo "Уже запущен (pid $old_pid). Лог: $LOG_FILE"
    exit 1
  fi
fi

if command -v termux-wake-lock >/dev/null 2>&1; then
  termux-wake-lock
  echo "wake-lock включён"
fi

nohup "$SCRIPT_DIR/run.sh" >>"$LOG_FILE" 2>&1 &
echo $! >"$PID_FILE"
echo "Запущен pid $(cat "$PID_FILE"), лог: $LOG_FILE"
