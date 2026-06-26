#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> Обновление пакетов Termux"
pkg update -y
pkg install -y python openssl

if command -v termux-wake-lock >/dev/null 2>&1; then
  echo "termux-api уже есть"
else
  echo "==> termux-api (wake-lock для фона)"
  pkg install -y termux-api || echo "Пропуск termux-api — wake-lock недоступен"
fi

echo "==> Виртуальное окружение (в Termux нельзя обновлять pip через pip)"
python -m venv venv
# shellcheck disable=SC1091
source venv/bin/activate
pip install -r requirements.txt
deactivate

mkdir -p data

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Создан .env — отредактируйте: nano $SCRIPT_DIR/.env"
else
  echo ".env уже есть"
fi

chmod +x run.sh start-bg.sh stop.sh status.sh
echo "Готово. Дальше: nano .env && ./run.sh"
