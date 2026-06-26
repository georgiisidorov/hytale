#!/usr/bin/env bash
# Останавливает цикл перезапусков hytale-server-dev, чтобы успеть обновить OAuth (auth login).
#
# Причина цикла: падение при загрузке модов → Shutdown → restart: unless-stopped.
#
# Usage на VPS:
#   bash infra/scripts/hytale-auth-break-restart-loop.sh
#   bash infra/scripts/hytale-auth-break-restart-loop.sh --with-attach
#
# После входа в консоль:
#   auth login device
#   auth status
#   auth select 1          # если аккаунт с несколькими профилями
#   auth persistence Encrypted
#
# Вернуть автоперезапуск:
#   docker update --restart=unless-stopped hytale-server-dev

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE="${REPO_ROOT}/infra/docker/hytale/docker-compose.yml"
ENV_FILE="${REPO_ROOT}/infra/.env"
CONTAINER="${HYTALE_CONTAINER:-hytale-server-dev}"
SERVER_DIR="${HYTALE_SERVER_HOST_PATH:-/home/hytale/server-dev}"
MODS="${SERVER_DIR}/mods"
DISABLED="${SERVER_DIR}/mods-disabled-auth"
ATTACH=false

for arg in "$@"; do
  case "$arg" in
    --with-attach) ATTACH=true ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
  esac
done

echo "==> Останавливаем ${CONTAINER}"
docker stop "${CONTAINER}" 2>/dev/null || true

echo "==> Отключаем автоперезапуск Docker (чтобы контейнер не поднимался сам во время auth)"
docker update --restart=no "${CONTAINER}"

if [[ -d "${MODS}" ]]; then
  mkdir -p "${DISABLED}"
  for jar in \
    RegionInteractionGuard-*.jar \
    BlockToEntity-*.jar; do
    shopt -s nullglob
    for f in "${MODS}"/${jar}; do
      echo "==> Временно убираем $(basename "$f")"
      mv "$f" "${DISABLED}/"
    done
    shopt -u nullglob
  done
fi

echo "==> Запускаем ${CONTAINER}"
docker start "${CONTAINER}"

echo ""
echo "Готово. Дальше:"
echo "  docker attach ${CONTAINER}"
echo "  # в консоли сервера:"
echo "  auth login device"
echo "  auth select 1"
echo "  auth persistence Encrypted"
echo ""
echo "Отсоединиться без остановки: Ctrl+P, Ctrl+Q"
echo "После успешного login:"
echo "  docker update --restart=unless-stopped ${CONTAINER}"
echo "  # вернуть моды из ${DISABLED}/ в ${MODS}/ при необходимости"
echo ""

if [[ "${ATTACH}" == true ]]; then
  exec docker attach "${CONTAINER}"
fi
