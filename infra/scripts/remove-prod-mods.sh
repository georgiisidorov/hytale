#!/usr/bin/env bash
# Убирает все моды с prod (jar + папки данных). Dev не трогаем.
#
# Usage на VPS:
#   bash remove-prod-mods.sh
#   DELETE=1 bash remove-prod-mods.sh   # без бэкапа, удалить навсегда

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROD="${1:-${HYTALE_SERVER_2_HOST_PATH:-/home/hytale/server-prod}}"
PROD_MODS="${PROD}/mods"
PROD_DISABLED="${PROD}/mods-disabled"
COMPOSE="${REPO_ROOT}/infra/docker/hytale/docker-compose.yml"
ENV_FILE="${REPO_ROOT}/infra/.env"

if [[ ! -d "${PROD_MODS}" ]]; then
  echo "Нет каталога ${PROD_MODS}" >&2
  exit 1
fi

shopt -s nullglob
items=("${PROD_MODS}"/*)
shopt -u nullglob

if [[ ${#items[@]} -eq 0 ]]; then
  echo "Prod mods уже пуст: ${PROD_MODS}"
else
  if [[ "${DELETE:-}" == "1" ]]; then
    echo "==> Удаляем всё из ${PROD_MODS}"
    rm -rf "${PROD_MODS:?}"/*
  else
    stamp="$(date +%Y%m%d-%H%M%S)"
    backup="${PROD_DISABLED}/prod-removed-${stamp}"
    mkdir -p "${backup}"
    echo "==> Переносим в ${backup}"
    mv "${PROD_MODS}"/* "${backup}/"
  fi
fi

mkdir -p "${PROD_MODS}"
touch "${PROD_MODS}/.keep"

echo ""
echo "==> Пересоздаём prod-контейнер"
if [[ -f "${COMPOSE}" ]]; then
  (cd "${REPO_ROOT}/infra" && docker compose --env-file "${ENV_FILE}" \
    -f docker/hytale/docker-compose.yml up -d --force-recreate hytale-server-prod)
  sleep 3
  echo ""
  echo "В контейнере:"
  docker exec hytale-server-prod ls -la /home/hytale/server/mods/ 2>/dev/null || true
else
  echo "WARN: compose не найден — пересоздайте hytale-server-prod вручную"
fi

echo ""
echo "Готово. Prod без модов."
