#!/usr/bin/env bash
# Генерация HytaleServer.aot на том же Java/архитектуре, что и Docker-сервер (Java 25).
#
# В zip 0.5.3 есть HytaleServer.aot.config (профиль обучения Hypixel), но нет готового .aot.
# Сначала: assemble (create) из .config, затем при неудаче — полный train+assemble.
#
# Usage на VPS:
#   bash infra/scripts/hytale-generate-aot.sh
#   bash infra/scripts/hytale-generate-aot.sh /home/hytale/server-prod
#
# После успеха (или при HYTALE_USE_AOT=false в .env):
#   cd infra && docker compose --env-file .env -f docker/hytale/docker-compose.yml restart hytale-server-dev
#   cd infra && docker compose --env-file .env -f docker/hytale/docker-compose.yml restart hytale-server-prod

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SERVER_DIR="${1:-${HYTALE_SERVER_HOST_PATH:-/home/hytale/server-dev}}"
INFRA_ENV="${REPO_ROOT}/infra/.env"
COMPOSE_FILE="${REPO_ROOT}/infra/docker/hytale/docker-compose.yml"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-}"

SERVER_DIR="$(cd "${SERVER_DIR}" && pwd)"

# server-dev → hytale-server-dev, server-prod → hytale-server-prod
resolve_compose_target() {
  if [[ -n "${COMPOSE_SERVICE}" && -n "${CONTAINER}" ]]; then
    return
  fi
  local dev_path="${HYTALE_SERVER_HOST_PATH:-/home/hytale/server-dev}"
  local prod_path="${HYTALE_SERVER_2_HOST_PATH:-/home/hytale/server-prod}"
  if [[ -f "${INFRA_ENV}" ]]; then
    while IFS= read -r line; do
      case "${line}" in
        HYTALE_SERVER_HOST_PATH=*) dev_path="${line#*=}" ;;
        HYTALE_SERVER_2_HOST_PATH=*) prod_path="${line#*=}" ;;
      esac
    done < <(grep -E '^HYTALE_SERVER_(HOST_PATH|2_HOST_PATH)=' "${INFRA_ENV}" 2>/dev/null || true)
  fi
  dev_path="$(cd "${dev_path}" 2>/dev/null && pwd || echo "${dev_path}")"
  prod_path="$(cd "${prod_path}" 2>/dev/null && pwd || echo "${prod_path}")"
  if [[ "${SERVER_DIR}" == "${prod_path}" ]]; then
    COMPOSE_SERVICE="${COMPOSE_SERVICE:-hytale-server-prod}"
    CONTAINER="${CONTAINER:-hytale-server-prod}"
  else
    COMPOSE_SERVICE="${COMPOSE_SERVICE:-hytale-server-dev}"
    CONTAINER="${CONTAINER:-hytale-server-dev}"
  fi
}

resolve_compose_target

JAR="${SERVER_DIR}/HytaleServer.jar"
ASSETS="${SERVER_DIR}/Assets.zip"
AOT_CONFIG="${SERVER_DIR}/HytaleServer.aot.config"
AOT_OUT="${SERVER_DIR}/HytaleServer.aot"
COMPOSE_SERVICE="${HYTALE_COMPOSE_SERVICE:-}"
CONTAINER="${HYTALE_CONTAINER:-}"
TRAIN_WAIT_SEC="${HYTALE_AOT_TRAIN_SEC:-300}"
# Heap для AOTMode=create (сборка .aot часто падает на 4G: ConcurrentHashMap archive)
# shellcheck disable=SC2206
AOT_CREATE_HEAP_ARR=(${HYTALE_AOT_CREATE_HEAP:--Xmx8G -Xms2G})
# shellcheck disable=SC2206
JAVA_EXTRA_ARR=(${HYTALE_AOT_JAVA_EXTRA:--Xmx4G})
AOT_CONFIG_HYPIXEL_BAK="${SERVER_DIR}/HytaleServer.aot.config.hypixel.bak"

log() { echo "[hytale-generate-aot] $*"; }

die() { echo "[hytale-generate-aot] ОШИБКА: $*" >&2; exit 1; }

[[ -f "${JAR}" ]] || die "нет ${JAR}"
[[ -f "${ASSETS}" ]] || die "нет ${ASSETS}"

compose() {
  local env_args=()
  [[ -f "${INFRA_ENV}" ]] && env_args=(--env-file "${INFRA_ENV}")
  if [[ -n "${COMPOSE_PROJECT}" ]]; then
    docker compose -p "${COMPOSE_PROJECT}" "${env_args[@]}" -f "${COMPOSE_FILE}" "$@"
  else
    docker compose "${env_args[@]}" -f "${COMPOSE_FILE}" "$@"
  fi
}

resolve_image() {
  if docker inspect "${CONTAINER}" &>/dev/null; then
    docker inspect "${CONTAINER}" --format '{{.Config.Image}}'
    return
  fi
  compose images -q "${COMPOSE_SERVICE}" 2>/dev/null | head -1 | xargs -r docker inspect --format '{{.RepoTags}}' 2>/dev/null | tr -d '[]' | cut -d, -f1 | tr -d ' "'
}

run_java() {
  local image="$1"
  shift
  docker run --rm \
    --name hytale-aot-gen \
    -v "${SERVER_DIR}:/home/hytale/server" \
    -v /etc/machine-id:/etc/machine-id:ro \
    -e TZ=Europe/Moscow \
    -w /home/hytale/server \
    --entrypoint /opt/jdk/bin/java \
    "${image}" \
    "$@"
}

# create-сборка: больше heap + JDK_AOT_VM_OPTIONS для дочернего JVM (JEP 514)
run_java_create() {
  local image="$1"
  shift
  docker run --rm \
    --name hytale-aot-gen \
    -v "${SERVER_DIR}:/home/hytale/server" \
    -v /etc/machine-id:/etc/machine-id:ro \
    -e TZ=Europe/Moscow \
    -e "JDK_AOT_VM_OPTIONS=${HYTALE_JDK_AOT_VM_OPTIONS:--Xmx8G}" \
    -w /home/hytale/server \
    --entrypoint /opt/jdk/bin/java \
    "${image}" \
    "${AOT_CREATE_HEAP_ARR[@]}" \
    "$@"
}

stop_server() {
  if docker ps --format '{{.Names}}' | grep -qx "${CONTAINER}"; then
    log "останавливаем ${CONTAINER} (нужен эксклюзивный доступ к jar)"
    docker stop "${CONTAINER}" >/dev/null || true
    STOPPED=1
  fi
}

start_server_if_stopped() {
  if [[ "${STOPPED:-0}" == 1 ]]; then
    log "запускаем ${CONTAINER} (HYTALE_USE_AOT=false)"
    HYTALE_USE_AOT=false compose up -d "${COMPOSE_SERVICE}"
  fi
}

backup_old_aot() {
  if [[ -f "${AOT_OUT}" ]]; then
    local bak="${AOT_OUT}.bak.$(date +%Y%m%d-%H%M%S)"
    log "бэкап ${AOT_OUT} -> ${bak}"
    mv "${AOT_OUT}" "${bak}"
  fi
}

# Оригинальный .config из zip — record/AOTCacheOutput его перезаписывают
backup_hypixel_aot_config() {
  if [[ -f "${AOT_CONFIG}" && ! -f "${AOT_CONFIG_HYPIXEL_BAK}" ]]; then
    cp -a "${AOT_CONFIG}" "${AOT_CONFIG_HYPIXEL_BAK}"
    log "бэкап Hypixel config -> ${AOT_CONFIG_HYPIXEL_BAK}"
  fi
}

restore_hypixel_aot_config() {
  if [[ -f "${AOT_CONFIG_HYPIXEL_BAK}" ]]; then
    cp -a "${AOT_CONFIG_HYPIXEL_BAK}" "${AOT_CONFIG}"
    log "восстановлен ${AOT_CONFIG} из .hypixel.bak"
  fi
}

aot_config_for_create() {
  if [[ -f "${AOT_CONFIG_HYPIXEL_BAK}" ]]; then
    echo "${AOT_CONFIG_HYPIXEL_BAK}"
  elif [[ -f "${AOT_CONFIG}" ]]; then
    echo "${AOT_CONFIG}"
  else
    echo ""
  fi
}

aot_ok() {
  [[ -f "${AOT_OUT}" ]] && [[ "$(stat -c%s "${AOT_OUT}" 2>/dev/null || echo 0)" -gt 1048576 ]]
}

# 1) Собрать кэш из HytaleServer.aot.config (из zip), не из перезаписанного record
try_create_from_config() {
  local cfg_host
  cfg_host="$(aot_config_for_create)"
  [[ -n "${cfg_host}" && -f "${cfg_host}" ]] || return 1
  local cfg_in_container="/home/hytale/server/$(basename "${cfg_host}")"
  log "шаг 1: AOTMode=create из $(basename "${cfg_host}") (heap: ${AOT_CREATE_HEAP_ARR[*]})"
  run_java_create "${IMAGE}" \
    -XX:AOTMode=create \
    -XX:AOTConfiguration="${cfg_in_container}" \
    -XX:AOTCache=/home/hytale/server/HytaleServer.aot \
    -jar /home/hytale/server/HytaleServer.jar \
    --assets /home/hytale/server/Assets.zip
}

# 2) Записать профиль на этом железе + собрать кэш (два прохода)
try_record_and_create() {
  local tmpconf="${SERVER_DIR}/HytaleServer.aot.record.aotconfig"
  log "шаг 2a: AOTMode=record (тренировка ~${TRAIN_WAIT_SEC}s, ждём Booted в логе)"
  local logfile
  logfile="$(mktemp)"

  set +e
  run_java "${IMAGE}" \
    "${JAVA_EXTRA_ARR[@]}" \
    -XX:AOTMode=record \
    -XX:AOTConfiguration="/home/hytale/server/$(basename "${tmpconf}")" \
    -jar /home/hytale/server/HytaleServer.jar \
    --assets /home/hytale/server/Assets.zip 2>&1 | tee "${logfile}" &
  local pid=$!
  set -e

  local i=0
  while (( i < TRAIN_WAIT_SEC )); do
    if grep -q "Hytale Server Booted" "${logfile}" 2>/dev/null; then
      log "сервер загрузился — завершаем record (SIGINT)"
      break
    fi
    if ! kill -0 "${pid}" 2>/dev/null; then
      log "процесс record завершился сам"
      break
    fi
    sleep 5
    i=$((i + 5))
  done

  if kill -0 "${pid}" 2>/dev/null; then
    docker stop hytale-aot-gen >/dev/null 2>&1 || kill -INT "${pid}" 2>/dev/null || true
    wait "${pid}" 2>/dev/null || true
  fi

  [[ -f "${tmpconf}" ]] || die "record не создал $(basename "${tmpconf}") — смотрите ${logfile}"
  rm -f "${logfile}"

  log "шаг 2b: AOTMode=create из записанного профиля"
  run_java_create "${IMAGE}" \
    -XX:AOTMode=create \
    -XX:AOTConfiguration="/home/hytale/server/$(basename "${tmpconf}")" \
    -XX:AOTCache=/home/hytale/server/HytaleServer.aot \
    -jar /home/hytale/server/HytaleServer.jar \
    --assets /home/hytale/server/Assets.zip
}

# 3) Java 25 one-shot: AOTCacheOutput (перезаписывает .config — только если шаги 1–2 не помогли)
try_aot_cache_output() {
  log "шаг 3: -XX:AOTCacheOutput=... (one-shot; перезапишет HytaleServer.aot.config)"
  local logfile
  logfile="$(mktemp)"

  set +e
  docker run --rm \
    --name hytale-aot-gen \
    -v "${SERVER_DIR}:/home/hytale/server" \
    -v /etc/machine-id:/etc/machine-id:ro \
    -e TZ=Europe/Moscow \
    -e "JDK_AOT_VM_OPTIONS=${HYTALE_JDK_AOT_VM_OPTIONS:--Xmx8G}" \
    -w /home/hytale/server \
    --entrypoint /opt/jdk/bin/java \
    "${IMAGE}" \
    "${JAVA_EXTRA_ARR[@]}" \
    -XX:AOTCacheOutput=/home/hytale/server/HytaleServer.aot \
    -jar /home/hytale/server/HytaleServer.jar \
    --assets /home/hytale/server/Assets.zip 2>&1 | tee "${logfile}" &
  local pid=$!
  set -e

  local i=0
  while (( i < TRAIN_WAIT_SEC )); do
    if grep -q "Hytale Server Booted" "${logfile}" 2>/dev/null; then
      log "Booted — SIGINT для сборки AOT"
      break
    fi
    if ! kill -0 "${pid}" 2>/dev/null; then
      break
    fi
    sleep 5
    i=$((i + 5))
  done

  if kill -0 "${pid}" 2>/dev/null; then
    docker stop hytale-aot-gen >/dev/null 2>&1 || kill -INT "${pid}" 2>/dev/null || true
    wait "${pid}" 2>/dev/null || true
  fi
  rm -f "${logfile}"
}

# --- main ---
STOPPED=0
IMAGE="$(resolve_image)"
[[ -n "${IMAGE}" ]] || die "не найден образ (соберите: cd infra && docker compose -f docker/hytale/docker-compose.yml build ${COMPOSE_SERVICE})"

log "каталог: ${SERVER_DIR}"
log "сервис: ${COMPOSE_SERVICE} (${CONTAINER})"
log "образ: ${IMAGE}"

compose build "${COMPOSE_SERVICE}" >/dev/null
stop_server
backup_old_aot
backup_hypixel_aot_config
restore_hypixel_aot_config

if aot_config_for_create | grep -q .; then
  if try_create_from_config && aot_ok; then
    log "готово (create из HytaleServer.aot.config), размер $(stat -c%s "${AOT_OUT}") байт"
    start_server_if_stopped
    exit 0
  fi
  log "шаг 1 не дал кэш (см. ошибку heap/archive выше) — пробуем record+create"
  log "подсказка: HYTALE_AOT_CREATE_HEAP='-Xmx12G -Xms4G' bash $0 ${SERVER_DIR}"
fi

if try_record_and_create && aot_ok; then
  log "готово (record+create), размер $(stat -c%s "${AOT_OUT}") байт"
  start_server_if_stopped
  exit 0
fi

rm -f "${AOT_OUT}"
if try_aot_cache_output && aot_ok; then
  log "готово (AOTCacheOutput), размер $(stat -c%s "${AOT_OUT}") байт"
  start_server_if_stopped
  exit 0
fi

start_server_if_stopped
restore_hypixel_aot_config
die "не удалось создать ${AOT_OUT}.

Сервер без AOT (работает сразу):
  cd ${REPO_ROOT}/infra
  docker compose --env-file .env -f docker/hytale/docker-compose.yml up -d --force-recreate ${COMPOSE_SERVICE}
  # dev:  ... hytale-server-dev   | prod: ... hytale-server-prod

Повтор create с большим heap (только шаг 1):
  HYTALE_AOT_CREATE_HEAP='-Xmx12G -Xms4G' bash $0 ${SERVER_DIR}

Если нет ${AOT_CONFIG_HYPIXEL_BAK} — снова скопируйте HytaleServer.aot.config из zip 0.5.3."
