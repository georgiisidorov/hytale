#!/usr/bin/env bash
# Сброс настроек WorldProtect после удаления HideRegionMapLabels / WorldProtectBetterMapCompat / OverlayFix.
# По умолчанию у WP: map.enabled=true (регионы на карте через свой генератор).
#
# Usage:
#   bash reset-worldprotect-defaults.sh /home/hytale/server-dev

set -euo pipefail

SERVER_ROOT="${1:-/home/hytale/server-dev}"
MODS="${SERVER_ROOT}/mods"
WP_CFG="${MODS}/WorldProtect/config/config.properties"
WP_JAR="${MODS}/WorldProtect-1.0.11.jar"
WP_BAK="${MODS}/WorldProtect/WorldProtect-1.0.11.jar.bak-labels"
WP_BAK2="${MODS}/WorldProtect-1.0.11.jar.bak-labels"

echo "==> Удаляем overlay-плагины (если остались)"
rm -f "${MODS}"/WorldProtectOverlayFix-*.jar \
      "${MODS}"/HideRegionMapLabels-*.jar \
      "${MODS}"/WorldProtectBetterMapCompat-*.jar
rm -rf "${MODS}/WorldProtectOverlayFix" 2>/dev/null || true

echo "==> map.enabled=true (default WorldProtect)"
if [[ -f "$WP_CFG" ]]; then
  if grep -q '^map\.enabled=' "$WP_CFG"; then
    sed -i 's/^map\.enabled=.*/map.enabled=true/' "$WP_CFG"
  else
    echo 'map.enabled=true' >>"$WP_CFG"
  fi
  echo "    $WP_CFG"
else
  mkdir -p "$(dirname "$WP_CFG")"
  printf '%s\n' 'map.enabled=true' >"$WP_CFG"
  echo "    создан $WP_CFG"
fi

echo "==> Оригинальный WorldProtect.jar (не патчить — подписи скрывает WorldProtectBetterMapCompat)"
restored=0
for bak in "$WP_BAK" "$WP_BAK2" \
  "${MODS}/WorldProtect/WorldProtect-1.0.11.jar.bak-labels"; do
  if [[ -f "$bak" ]]; then
    if jar tf "$bak" 2>/dev/null | rg -q 'RegionLabelFilter'; then
      echo "    пропуск $bak (это пропатченный бэкап)" >&2
      continue
    fi
    cp "$bak" "$WP_JAR"
    echo "    восстановлен из $bak"
    restored=1
    break
  fi
done
if [[ "$restored" -eq 0 ]]; then
  echo "    бэкап .bak-labels не найден — оставляем текущий $WP_JAR"
  echo "    (если был патч HideRegionMapLabels, положите чистый jar вручную)"
fi

echo "==> Готово. Перезапустите сервер:"
echo "    cd /home/hytale/infra && docker compose --env-file .env -f docker/hytale/docker-compose.yml restart hytale-server-dev"
