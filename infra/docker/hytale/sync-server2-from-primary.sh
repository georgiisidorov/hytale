#!/usr/bin/env bash
# Копирует данные dev → prod (контейнер hytale-server-prod в compose).
# Останови prod-контейнер перед синхронизацией, иначе возможна порча мира.
#
# Переменные (как в docker-compose / infra/.env):
#   HYTALE_SERVER_HOST_PATH   — dev (по умолчанию: <корень репозитория>/server-dev)
#   HYTALE_SERVER_2_HOST_PATH — prod (по умолчанию: <корень репозитория>/server-prod)
#
# Использование:
#   ./sync-server2-from-primary.sh           # только universe/ (зеркало)
#   ./sync-server2-from-primary.sh --full    # первый раз: весь server кроме logs/

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PRIMARY="${HYTALE_SERVER_HOST_PATH:-${REPO_ROOT}/server-dev}"
SECONDARY="${HYTALE_SERVER_2_HOST_PATH:-${REPO_ROOT}/server-prod}"

if [[ ! -d "${PRIMARY}" ]]; then
  echo "Нет каталога dev-сервера: ${PRIMARY}" >&2
  exit 1
fi

MODE="${1:-}"

if [[ "${MODE}" == "--full" ]]; then
  mkdir -p "${SECONDARY}"
  rsync -a --exclude 'logs/' "${PRIMARY}/" "${SECONDARY}/"
  echo "Полная копия (без logs/) завершена: ${PRIMARY} -> ${SECONDARY}"
  exit 0
fi

if [[ "${MODE}" != "" ]]; then
  echo "Неизвестный аргумент: ${MODE}. Допустимо: --full или без аргументов." >&2
  exit 2
fi

if [[ ! -d "${PRIMARY}/universe" ]]; then
  echo "Нет ${PRIMARY}/universe — нечего копировать." >&2
  exit 1
fi

mkdir -p "${SECONDARY}/universe"
rsync -a --delete "${PRIMARY}/universe/" "${SECONDARY}/universe/"
echo "Синхронизировано universe/: ${PRIMARY} -> ${SECONDARY}"
