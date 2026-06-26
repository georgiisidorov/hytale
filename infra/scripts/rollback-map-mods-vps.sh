#!/usr/bin/env bash
# Откат dev/prod к состоянию: jar модов карты + WorldProtect/config, без скопированных папок данных.
# Запускать на VPS от root.
#
# Usage:
#   bash rollback-map-mods-vps.sh

set -euo pipefail

DEV="${HYTALE_SERVER_HOST_PATH:-/home/hytale/server-dev}"
PROD="${HYTALE_SERVER_2_HOST_PATH:-/home/hytale/server-prod}"
REPO="${HYTALE_INFRA_ROOT:-/home/hytale/infra}"
COMPOSE="${REPO}/docker/hytale/docker-compose.yml"
ENV_FILE="${REPO}/.env"

echo "==> Dev: убираем сломанные версии compat (оставить 1.0.4)"
for dir in "${DEV}/mods" "${PROD}/mods"; do
  [[ -d "${dir}" ]] || continue
  rm -f "${dir}"/WorldProtectBetterMapCompat-1.0.{5,6,7}.jar \
        "${dir}"/WorldProtectOverlayFix-*.jar \
        "${dir}"/HideRegionMapLabels-*.jar 2>/dev/null || true
  if [[ ! -f "${dir}"/WorldProtectBetterMapCompat-1.0.4.jar ]]; then
    echo "  WARN: нет ${dir}/WorldProtectBetterMapCompat-1.0.4.jar — скопируйте с машины сборки"
  fi
done

echo ""
echo "==> Prod: удаляем автоматически скопированные папки данных (регионы — вручную)"
for sub in BetterMap WorldProtect/regions WorldProtect/data WorldProtect/storage; do
  path="${PROD}/mods/${sub}"
  if [[ -e "${path}" ]]; then
    rm -rf "${path}"
    echo "  удалено: ${path}"
  fi
done
mkdir -p "${PROD}/mods/WorldProtect/config"

echo ""
echo "==> Prod: map.enabled=false"
WP_CFG="${PROD}/mods/WorldProtect/config/config.properties"
if [[ -f "${WP_CFG}" ]]; then
  if grep -q '^map\.enabled=' "${WP_CFG}"; then
    sed -i 's/^map\.enabled=.*/map.enabled=false/' "${WP_CFG}"
  else
    echo 'map.enabled=false' >>"${WP_CFG}"
  fi
fi

echo ""
echo "==> Деплой jar-only (без папок)"
if [[ -f "${REPO}/scripts/deploy-map-mods-to-prod.sh" ]]; then
  bash "${REPO}/scripts/deploy-map-mods-to-prod.sh"
else
  echo "WARN: нет deploy-map-mods-to-prod.sh — обновите репозиторий на VPS"
fi

echo ""
echo "==> Перезапуск dev"
if [[ -f "${COMPOSE}" ]]; then
  (cd "${REPO}" && docker compose --env-file "${ENV_FILE}" \
    -f docker/hytale/docker-compose.yml restart hytale-server-dev)
fi

echo ""
echo "Готово."
echo "  Dev: только WorldProtectBetterMapCompat-1.0.4.jar"
echo "  Prod: 3 jar + WorldProtect/config; регионы и BetterMap/ — настройте сами"
