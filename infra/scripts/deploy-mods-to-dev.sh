#!/usr/bin/env bash
# Копирует jar в server-dev/mods на VPS и перезапускает hytale-server-dev.
# Использование:
#   bash infra/scripts/deploy-mods-to-dev.sh mods/BlockToEntity/BlockToEntity-1.4.3.jar ...
#   VPS=root@85.239.41.218 MODS_DIR=/home/hytale/server-dev/mods bash infra/scripts/deploy-mods-to-dev.sh ...
set -euo pipefail

VPS="${VPS:-root@85.239.41.218}"
MODS_DIR="${MODS_DIR:-/home/hytale/server-dev/mods}"
INFRA_DIR="${INFRA_DIR:-/home/hytale/infra}"
COMPOSE_FILE="${COMPOSE_FILE:-docker/hytale/docker-compose.yml}"
SERVICE="${SERVICE:-hytale-server-dev}"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <jar> [jar ...]" >&2
  exit 1
fi

JARS=()
for j in "$@"; do
  [[ -f "$j" ]] || { echo "Not found: $j" >&2; exit 1; }
  JARS+=("$(realpath "$j")")
done

echo "==> Upload to ${VPS}:${MODS_DIR}"
for j in "${JARS[@]}"; do
  scp -o ConnectTimeout=15 "$j" "${VPS}:${MODS_DIR}/"
done

echo "==> Remove older versions of the same plugins"
ssh -o ConnectTimeout=15 "$VPS" bash -s -- "${MODS_DIR}" "${JARS[@]##*/}" <<'REMOTE'
set -euo pipefail
mods_dir="$1"
shift
for base in "$@"; do
  name="${base%-*.jar}"
  find "$mods_dir" -maxdepth 1 -name "${name}-*.jar" ! -name "$base" -delete 2>/dev/null || true
done
ls -1 "$mods_dir"/BlockToEntity-*.jar "$mods_dir"/RegionInteractionGuard-*.jar 2>/dev/null || true
REMOTE

echo "==> Restart ${SERVICE}"
ssh -o ConnectTimeout=15 "$VPS" "cd ${INFRA_DIR} && docker compose --env-file .env -f ${COMPOSE_FILE} restart ${SERVICE}"

echo "==> Plugin load (tail)"
ssh -o ConnectTimeout=15 "$VPS" "sleep 3; docker logs --tail 200 ${SERVICE} 2>&1 | rg -i 'BlockToEntity|RegionInteractionGuard|Enabled plugin Custom:|Failed to load|duplicate plugin' | tail -40 || true"

echo "Done."
