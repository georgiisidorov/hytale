#!/usr/bin/env bash
# Копирует на prod только JAR модов карты + WorldProtect/config.
# Папки BetterMap/, WorldProtect/regions|data|storage — НЕ копируются (на prod вручную).
#
# Usage:
#   bash deploy-map-mods-to-prod.sh
#   bash deploy-map-mods-to-prod.sh /home/hytale/server-dev /home/hytale/server-prod

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEV="${1:-${HYTALE_SERVER_HOST_PATH:-/home/hytale/server-dev}}"
PROD="${2:-${HYTALE_SERVER_2_HOST_PATH:-/home/hytale/server-prod}}"
SET_VER="${REPO_ROOT}/infra/scripts/set-mod-server-version.sh"
SERVER_JAR="${HYTALE_SERVER_JAR:-${PROD}/HytaleServer.jar}"

DEV_MODS="${DEV}/mods"
PROD_MODS="${PROD}/mods"

if [[ ! -d "${DEV_MODS}" ]]; then
  echo "Нет dev mods: ${DEV_MODS}" >&2
  exit 1
fi

mkdir -p "${PROD_MODS}"

PROD_DISABLED="${PROD}/mods-disabled"
MAP_JAR_PATTERNS=(
  'BetterMap-*.jar'
  'WorldProtect-*.jar'
  'WorldProtectBetterMapCompat-*.jar'
)

is_map_jar() {
  local base="$1"
  local pat
  for pat in "${MAP_JAR_PATTERNS[@]}"; do
    case "${base}" in
      ${pat}) return 0 ;;
    esac
  done
  return 1
}

strip_non_map_mods() {
  if [[ "${KEEP_ALL_PROD_MODS:-}" == "1" ]]; then
    echo "==> KEEP_ALL_PROD_MODS=1 — лишние jar не трогаем"
    return 0
  fi
  echo "==> Prod: только моды карты (остальные jar -> mods-disabled/)"
  mkdir -p "${PROD_DISABLED}"
  shopt -s nullglob
  for jar in "${PROD_MODS}"/*.jar; do
    if is_map_jar "$(basename "${jar}")"; then
      continue
    fi
    mv -f "${jar}" "${PROD_DISABLED}/"
    echo "  disabled: $(basename "${jar}")"
  done
  shopt -u nullglob
  for dir in "${PROD_MODS}"/Custom_* "${PROD_MODS}"/LuckPerms_* \
             "${PROD_MODS}"/Zuxaw_* "${PROD_MODS}"/com.* \
             "${PROD_MODS}"/lucko_* "${PROD_MODS}"/Hytale_Shop; do
    [[ -d "${dir}" ]] || continue
    base="$(basename "${dir}")"
    rm -rf "${PROD_DISABLED}/${base}" 2>/dev/null || true
    mv -f "${dir}" "${PROD_DISABLED}/${base}"
    echo "  disabled dir: ${base}"
  done
}

copy_jar() {
  local pattern="$1"
  local src
  src="$(ls -1 "${DEV_MODS}"/${pattern} 2>/dev/null | sort -V | tail -1 || true)"
  if [[ -z "${src}" ]]; then
    echo "WARN: на dev не найден ${pattern}" >&2
    return 1
  fi
  cp -a "${src}" "${PROD_MODS}/"
  echo "  jar: $(basename "${src}")"
}

echo "==> JAR: dev -> prod (только .jar, папки данных не копируем)"
copy_jar 'BetterMap-*.jar' || true
copy_jar 'WorldProtect-*.jar' || true
copy_jar 'WorldProtectBetterMapCompat-*.jar' || true

echo "==> WorldProtect/config (без regions/data/storage)"
if [[ -d "${DEV_MODS}/WorldProtect/config" ]]; then
  mkdir -p "${PROD_MODS}/WorldProtect/config"
  rsync -a "${DEV_MODS}/WorldProtect/config/" "${PROD_MODS}/WorldProtect/config/"
else
  echo "WARN: нет ${DEV_MODS}/WorldProtect/config/" >&2
fi

WP_CFG="${PROD_MODS}/WorldProtect/config/config.properties"
if [[ -f "${WP_CFG}" ]]; then
  if grep -q '^map\.enabled=' "${WP_CFG}"; then
    sed -i 's/^map\.enabled=.*/map.enabled=false/' "${WP_CFG}"
  else
    echo 'map.enabled=false' >>"${WP_CFG}"
  fi
  echo "  map.enabled=false в ${WP_CFG}"
fi

echo "==> Удаляем лишнее на prod"
rm -f "${PROD_MODS}"/WorldProtectOverlayFix-*.jar \
      "${PROD_MODS}"/HideRegionMapLabels-*.jar \
      "${PROD_MODS}"/WorldProtectBetterMapCompat-1.0.[5-7].jar 2>/dev/null || true

if [[ -f "${SET_VER}" && -f "${SERVER_JAR}" ]]; then
  echo "==> ServerVersion в manifest.json"
  bash "${SET_VER}" "${SERVER_JAR}" \
    "${PROD_MODS}"/BetterMap-*.jar \
    "${PROD_MODS}"/WorldProtect-*.jar \
    "${PROD_MODS}"/WorldProtectBetterMapCompat-*.jar 2>/dev/null || true
fi

FIX_MAP="${REPO_ROOT}/infra/scripts/fix-world-map-provider.sh"
if [[ -f "${FIX_MAP}" ]]; then
  echo "==> WorldMapProvider в universe (убираем WorldProtect провайдер)"
  bash "${FIX_MAP}" "${PROD}" || true
fi

COMPOSE_FILE="${REPO_ROOT}/infra/docker/hytale/docker-compose.yml"
ENV_FILE="${REPO_ROOT}/infra/.env"
DIAG="${REPO_ROOT}/infra/scripts/diagnose-prod-mods.sh"

fix_empty_mods_compose() {
  if [[ ! -f "${COMPOSE_FILE}" ]]; then
    return 0
  fi
  if ! grep -q 'empty-mods' "${COMPOSE_FILE}"; then
    return 0
  fi
  echo "==> Убираем empty-mods из docker-compose.yml (иначе контейнер не видит mods/)"
  cp -a "${COMPOSE_FILE}" "${COMPOSE_FILE}.bak-empty-mods"
  sed -i '/empty-mods/d' "${COMPOSE_FILE}"
  sed -i 's/Без модов:.*/# Prod: mods из server-prod\/mods (deploy-map-mods-to-prod.sh)/' "${COMPOSE_FILE}" || true
}

fix_empty_mods_compose
strip_non_map_mods

echo ""
echo "Готово. Моды на хосте в ${PROD_MODS}:"
ls -1 "${PROD_MODS}"/BetterMap-*.jar "${PROD_MODS}"/WorldProtect-*.jar \
  "${PROD_MODS}"/WorldProtectBetterMapCompat-*.jar 2>/dev/null || true
echo ""
echo "Папки BetterMap/, WorldProtect/regions — на prod настраивайте вручную."

if grep -q 'empty-mods' "${COMPOSE_FILE}" 2>/dev/null; then
  echo ""
  echo "ERROR: empty-mods всё ещё в compose — правка не сработала." >&2
  exit 1
fi

if [[ "${SKIP_RECREATE:-}" != "1" && -f "${COMPOSE_FILE}" ]]; then
  echo ""
  echo "==> Пересоздаём prod-контейнер (применить volumes из compose)"
  (cd "${REPO_ROOT}/infra" && docker compose --env-file "${ENV_FILE}" \
    -f docker/hytale/docker-compose.yml up -d --force-recreate hytale-server-prod)
  sleep 3
  if [[ -f "${DIAG}" ]]; then
    bash "${DIAG}" || true
  fi
else
  echo ""
  echo "Пересоздайте prod (restart НЕ обновляет mount-ы):"
  echo "  cd ${REPO_ROOT}/infra && docker compose --env-file .env -f docker/hytale/docker-compose.yml up -d --force-recreate hytale-server-prod"
fi
