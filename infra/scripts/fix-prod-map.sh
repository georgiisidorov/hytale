#!/usr/bin/env bash
# Карта на prod не обновляется: compat 1.0.8 (таймаут overlay) + config BetterMap с dev.
# Dev не трогаем — там остаётся WorldProtectBetterMapCompat-1.0.4.jar.
#
# Usage на VPS:
#   bash fix-prod-map.sh
#   bash fix-prod-map.sh /home/hytale/server-dev /home/hytale/server-prod

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEV="${1:-${HYTALE_SERVER_HOST_PATH:-/home/hytale/server-dev}}"
PROD="${2:-${HYTALE_SERVER_2_HOST_PATH:-/home/hytale/server-prod}}"
COMPOSE="${REPO_ROOT}/infra/docker/hytale/docker-compose.yml"
ENV_FILE="${REPO_ROOT}/infra/.env"

DEV_MODS="${DEV}/mods"
PROD_MODS="${PROD}/mods"

find_compat_jar() {
  local name="WorldProtectBetterMapCompat-1.0.8.jar"
  if [[ -n "${COMPAT_JAR:-}" && -f "${COMPAT_JAR}" ]]; then
    echo "${COMPAT_JAR}"
    return 0
  fi
  local path
  for path in \
    "${DEV_MODS}/${name}" \
    "${PROD_MODS}/${name}" \
    "${REPO_ROOT}/mods/WorldProtectBetterMapCompat/${name}" \
    "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/mods/WorldProtectBetterMapCompat/${name}"; do
    [[ -f "${path}" ]] || continue
    echo "${path}"
    return 0
  done
  return 1
}

echo "==> Prod: тот же BetterMap.jar, что на dev"
bm="$(ls -1 "${DEV_MODS}"/BetterMap-*.jar 2>/dev/null | sort -V | tail -1 || true)"
if [[ -n "${bm}" ]]; then
  cp -a "${bm}" "${PROD_MODS}/"
  echo "  $(basename "${bm}")"
fi

echo "==> Prod: BetterMap/config.json с dev (без exploration_data)"
if [[ -f "${DEV_MODS}/BetterMap/config.json" ]]; then
  mkdir -p "${PROD_MODS}/BetterMap"
  cp -a "${DEV_MODS}/BetterMap/config.json" "${PROD_MODS}/BetterMap/config.json"
  echo "  config.json скопирован"
fi

echo "==> Prod: сброс кэша исследования BetterMap (prod создаст заново)"
rm -rf "${PROD_MODS}/BetterMap/exploration_data" \
       "${PROD_MODS}/BetterMap/player_configs" \
       "${PROD_MODS}/BetterMap/exploration_data.bak" 2>/dev/null || true

echo "==> Prod: WorldProtectBetterMapCompat-1.0.8 (таймаут overlay, dev остаётся на 1.0.4)"
COMPAT_SRC="$(find_compat_jar || true)"
if [[ -z "${COMPAT_SRC}" ]]; then
  echo "ERROR: не найден WorldProtectBetterMapCompat-1.0.8.jar" >&2
  echo "  Положите файл с машины сборки в один из путей:" >&2
  echo "    ${DEV_MODS}/WorldProtectBetterMapCompat-1.0.8.jar" >&2
  echo "    ${PROD_MODS}/WorldProtectBetterMapCompat-1.0.8.jar" >&2
  echo "  Пример (scp с локальной машины):" >&2
  echo "    scp WorldProtectBetterMapCompat-1.0.8.jar root@VPS:${PROD_MODS}/" >&2
  exit 1
fi
echo "  источник: ${COMPAT_SRC}"
dest="${PROD_MODS}/WorldProtectBetterMapCompat-1.0.8.jar"
if [[ "${COMPAT_SRC}" != "${dest}" ]]; then
  cp -a "${COMPAT_SRC}" "${dest}"
fi
rm -f "${PROD_MODS}"/WorldProtectBetterMapCompat-1.0.[4-7].jar 2>/dev/null || true

WP_CFG="${PROD_MODS}/WorldProtect/config/config.properties"
if [[ -f "${WP_CFG}" ]]; then
  grep -q '^map\.enabled=' "${WP_CFG}" && sed -i 's/^map\.enabled=.*/map.enabled=false/' "${WP_CFG}" \
    || echo 'map.enabled=false' >>"${WP_CFG}"
fi

FIX_MAP="${REPO_ROOT}/infra/scripts/fix-world-map-provider.sh"
[[ -f "${FIX_MAP}" ]] && bash "${FIX_MAP}" "${PROD}" || true

echo "==> Убираем Hytale_Shop и прочий мусор из prod/mods"
PROD_DISABLED="${PROD}/mods-disabled"
mkdir -p "${PROD_DISABLED}"
for jar in "${PROD_MODS}"/*.jar; do
  [[ -f "${jar}" ]] || continue
  case "$(basename "${jar}")" in
    BetterMap-*.jar|WorldProtect-*.jar|WorldProtectBetterMapCompat-*.jar) ;;
    *) mv -f "${jar}" "${PROD_DISABLED}/" ;;
  esac
done
for dir in "${PROD_MODS}"/Hytale_Shop "${PROD_MODS}"/Custom_*; do
  [[ -d "${dir}" ]] || continue
  base="$(basename "${dir}")"
  rm -rf "${PROD_DISABLED}/${base}" 2>/dev/null || true
  mv -f "${dir}" "${PROD_DISABLED}/${base}"
done

echo ""
echo "==> Пересоздаём prod-контейнер"
(cd "${REPO_ROOT}/infra" && docker compose --env-file "${ENV_FILE}" \
  -f docker/hytale/docker-compose.yml up -d --force-recreate hytale-server-prod)

sleep 4
echo ""
echo "После входа в мир проверьте логи:"
echo "  docker logs hytale-server-prod 2>&1 | grep -iE 'Hooked map|EXPLORATION|WpMapCompat' | tail -20"
