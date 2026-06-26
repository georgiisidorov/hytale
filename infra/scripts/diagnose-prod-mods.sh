#!/usr/bin/env bash
# Проверка: видит ли prod контейнер моды с хоста.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE="${REPO_ROOT}/infra/docker/hytale/docker-compose.yml"
ENV_FILE="${REPO_ROOT}/infra/.env"
PROD="${HYTALE_SERVER_2_HOST_PATH:-/home/hytale/server-prod}"
CONTAINER="${HYTALE_PROD_CONTAINER:-hytale-server-prod}"

echo "==> Compose: empty-mods?"
if grep -q 'empty-mods' "${COMPOSE}" 2>/dev/null; then
  echo "  ПРОБЛЕМА: в docker-compose.yml ещё есть bind-mount empty-mods — mods/ на хосте перекрывается."
  echo "  Обновите compose и выполните: docker compose ... up -d --force-recreate ${CONTAINER}"
else
  echo "  OK: empty-mods нет в compose"
fi

echo ""
echo "==> Хост: ${PROD}/mods"
if [[ -d "${PROD}/mods" ]]; then
  ls -la "${PROD}/mods/"*.jar 2>/dev/null || echo "  (нет .jar на хосте)"
else
  echo "  ПРОБЛЕМА: каталог не существует"
fi

echo ""
echo "==> Mounts контейнера ${CONTAINER}"
if ! docker inspect "${CONTAINER}" >/dev/null 2>&1; then
  echo "  контейнер не найден"
  exit 1
fi
docker inspect "${CONTAINER}" --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}' | grep -E 'mods|server' || true

echo ""
echo "==> Внутри контейнера: /home/hytale/server/mods"
docker exec "${CONTAINER}" ls -la /home/hytale/server/mods/ 2>/dev/null || echo "  не удалось прочитать (контейнер остановлен?)"

echo ""
echo "==> Плагины в последних логах (BetterMap / WorldProtect / Compat)"
docker logs "${CONTAINER}" 2>&1 | grep -iE 'BetterMap|WorldProtect|WorldProtectBetterMapCompat|Loading plugin|Enabled plugin' | tail -20 || true
