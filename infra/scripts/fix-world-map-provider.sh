#!/usr/bin/env bash
# Убирает WorldProtectWorldMapProvider из config.json миров (после map.enabled=true он мог сохраниться на диск).
# Запуск на VPS: bash fix-world-map-provider.sh /home/hytale/server-dev
set -euo pipefail

SERVER_ROOT="${1:-/home/hytale/server-dev}"
UNIVERSE="${SERVER_ROOT}/universe"

if [[ ! -d "$UNIVERSE" ]]; then
  echo "Нет каталога universe: $UNIVERSE" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Нужен jq" >&2
  exit 1
fi

fixed=0
while IFS= read -r -d '' cfg; do
  if jq -e '.WorldMapProvider? | type == "object" and (.Id? // .id? // "") | test("WorldProtect"; "i")' "$cfg" >/dev/null 2>&1; then
    echo "Исправляю: $cfg"
    tmp="$(mktemp)"
    jq 'del(.WorldMapProvider)' "$cfg" >"$tmp"
    mv "$tmp" "$cfg"
    fixed=$((fixed + 1))
  fi
done < <(find "$UNIVERSE" -name 'config.json' -print0 2>/dev/null)

echo "Готово. Исправлено файлов: $fixed"
echo "Проверьте Defaults.World в ${SERVER_ROOT}/config.json (должен быть lobby или maze)."
