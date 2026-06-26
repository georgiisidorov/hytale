#!/usr/bin/env bash
# Запуск HytaleServer.jar: HYTALE_USE_AOT=false|true|auto (по умолчанию false).
set -euo pipefail

SERVER_DIR="/home/hytale/server"
JAR="${SERVER_DIR}/HytaleServer.jar"
ASSETS="${SERVER_DIR}/Assets.zip"
AOT="${SERVER_DIR}/HytaleServer.aot"
USE_AOT="${HYTALE_USE_AOT:-false}"

JAVA_ARGS=()
case "${USE_AOT}" in
  false|0|no|off)
    echo "[run-hytale-server] HYTALE_USE_AOT=false — запуск без AOT"
    ;;
  true|1|yes|on)
    if [[ ! -f "${AOT}" ]]; then
      echo "[run-hytale-server] HYTALE_USE_AOT=true, но нет ${AOT}" >&2
      exit 1
    fi
    JAVA_ARGS+=("-XX:AOTCache=${AOT}")
    ;;
  auto|*)
    if [[ -f "${AOT}" ]]; then
      JAVA_ARGS+=("-XX:AOTCache=${AOT}")
      echo "[run-hytale-server] AOT: ${AOT}"
    else
      echo "[run-hytale-server] ${AOT} нет — запуск без AOT (сгенерируйте: infra/scripts/hytale-generate-aot.sh)"
    fi
    ;;
esac

exec java "${JAVA_ARGS[@]}" -jar "${JAR}" --assets "${ASSETS}" "$@"
