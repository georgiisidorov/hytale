#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="${ROOT_DIR}/infra"

SERVER_COMPOSE="${INFRA_DIR}/docker/hytale/docker-compose.yml"
ADMIN_COMPOSE="${INFRA_DIR}/docker/adminpanel/docker-compose.yml"
CADDY_COMPOSE="${INFRA_DIR}/docker/caddy/docker-compose.yml"
PROM_COMPOSE="${INFRA_DIR}/docker/monitoring/prometheus/docker-compose.yml"
NODEEXP_COMPOSE="${INFRA_DIR}/docker/monitoring/node_exporter/docker-compose.yml"
CADVISOR_COMPOSE="${INFRA_DIR}/docker/monitoring/cadvisor/docker-compose.yml"

ENV_FILE="${INFRA_DIR}/.env"

usage() {
  cat <<'EOF'
Использование:
  infra/start-infra.sh up [all|server|admin|db|caddy|prometheus|nodeexporter|cadvisor|monitoring]
  infra/start-infra.sh down [all|server|admin|db|caddy|prometheus|nodeexporter|cadvisor|monitoring]
  infra/start-infra.sh restart [all|server|admin|db|caddy|prometheus|nodeexporter|cadvisor|monitoring]
  infra/start-infra.sh ps
  infra/start-infra.sh logs [server|server-dev|server2|server-prod|admin|db|migrate|alembic|caddy|prometheus|nodeexporter|cadvisor] [-- -f]

Переменные окружения:
  Создай infra/.env на основе infra/.env.example

Примеры:
  cp infra/.env.example infra/.env
  infra/start-infra.sh up all
  infra/start-infra.sh logs admin -- -f
  infra/start-infra.sh down server
EOF
}

ensure_env() {
  if [[ -f "${ENV_FILE}" ]]; then
    return 0
  fi
  echo "Не найден ${ENV_FILE}."
  echo "Скопируй пример: cp infra/.env.example infra/.env"
  exit 1
}

ensure_network() {
  if docker network inspect hytale-network >/dev/null 2>&1; then
    return 0
  fi
  docker network create hytale-network >/dev/null
}

dc_server() {
  # Подставляет переменные из infra/.env (в т.ч. YOOKASSA_* для плагина оплаты).
  if [[ -f "${ENV_FILE}" ]]; then
    docker compose --env-file "${ENV_FILE}" -f "${SERVER_COMPOSE}" "$@"
  else
    docker compose -f "${SERVER_COMPOSE}" "$@"
  fi
}

dc_admin() {
  ensure_env
  docker compose --env-file "${ENV_FILE}" -f "${ADMIN_COMPOSE}" "$@"
}

dc_caddy() {
  docker compose -f "${CADDY_COMPOSE}" "$@"
}

dc_prometheus() {
  docker compose -f "${PROM_COMPOSE}" "$@"
}

dc_nodeexporter() {
  docker compose -f "${NODEEXP_COMPOSE}" "$@"
}

dc_cadvisor() {
  docker compose -f "${CADVISOR_COMPOSE}" "$@"
}

action="${1:-}"
target="${2:-all}"
shift $(( $# > 0 ? 1 : 0 ))
shift $(( $# > 0 ? 1 : 0 ))

case "${action}" in
  ""|help|-h|--help)
    usage
    exit 0
    ;;
esac

ensure_network

case "${action}" in
  up)
    case "${target}" in
      all)
        dc_nodeexporter up -d
        dc_prometheus up -d
        dc_server up -d
        dc_admin up -d
        dc_caddy up -d
        ;;
      server)
        dc_server up -d
        ;;
      admin)
        dc_admin up -d admin-db alembic-migrate adminpanel
        ;;
      db)
        dc_admin up -d admin-db alembic-migrate
        ;;
      caddy)
        dc_caddy up -d
        ;;
      prometheus)
        dc_prometheus up -d
        ;;
      nodeexporter)
        dc_nodeexporter up -d
        ;;
      cadvisor)
        dc_cadvisor up -d
        ;;
      monitoring)
        dc_nodeexporter up -d
        dc_cadvisor up -d
        dc_prometheus up -d
        ;;
      *)
        echo "Неизвестная цель: ${target}"
        usage
        exit 2
        ;;
    esac
    ;;

  down)
    case "${target}" in
      all)
        dc_caddy down || true
        dc_admin down
        dc_server down
        dc_prometheus down || true
        dc_cadvisor down || true
        dc_nodeexporter down || true
        ;;
      server)
        dc_server down
        ;;
      admin)
        dc_admin stop adminpanel
        ;;
      db)
        dc_admin stop admin-db
        ;;
      caddy)
        dc_caddy down
        ;;
      prometheus)
        dc_prometheus down
        ;;
      nodeexporter)
        dc_nodeexporter down
        ;;
      cadvisor)
        dc_cadvisor down
        ;;
      monitoring)
        dc_prometheus down || true
        dc_cadvisor down || true
        dc_nodeexporter down || true
        ;;
      *)
        echo "Неизвестная цель: ${target}"
        usage
        exit 2
        ;;
    esac
    ;;

  restart)
    case "${target}" in
      all)
        dc_server restart
        dc_admin restart
        dc_caddy restart
        dc_prometheus restart
        dc_nodeexporter restart
        ;;
      server)
        dc_server restart
        ;;
      admin)
        dc_admin restart adminpanel
        ;;
      db)
        dc_admin restart admin-db
        ;;
      caddy)
        dc_caddy restart
        ;;
      prometheus)
        dc_prometheus restart
        ;;
      nodeexporter)
        dc_nodeexporter restart
        ;;
      cadvisor)
        dc_cadvisor restart
        ;;
      monitoring)
        dc_nodeexporter restart
        dc_cadvisor restart
        dc_prometheus restart
        ;;
      *)
        echo "Неизвестная цель: ${target}"
        usage
        exit 2
        ;;
    esac
    ;;

  ps)
    echo "== Server =="
    dc_server ps
    echo
    echo "== Admin =="
    dc_admin ps
    echo
    echo "== Caddy =="
    dc_caddy ps
    echo
    echo "== Monitoring (node_exporter / cadvisor / prometheus) =="
    dc_nodeexporter ps || true
    dc_cadvisor ps || true
    dc_prometheus ps || true
    ;;

  logs)
    # passthrough extra args after optional '--'
    extra=("$@")
    case "${target}" in
      server|server-dev)
        dc_server logs hytale-server-dev "${extra[@]}"
        ;;
      server2|server-prod)
        dc_server logs hytale-server-prod "${extra[@]}"
        ;;
      admin)
        dc_admin logs adminpanel "${extra[@]}"
        ;;
      db)
        dc_admin logs admin-db "${extra[@]}"
        ;;
      migrate|alembic)
        dc_admin logs alembic-migrate "${extra[@]}"
        ;;
      caddy)
        dc_caddy logs "${extra[@]}"
        ;;
      prometheus)
        dc_prometheus logs "${extra[@]}"
        ;;
      nodeexporter)
        dc_nodeexporter logs "${extra[@]}"
        ;;
      cadvisor)
        dc_cadvisor logs "${extra[@]}"
        ;;
      *)
        echo "Для logs укажи цель: server|server-dev|server2|server-prod|admin|db|migrate|alembic|caddy|prometheus|nodeexporter|cadvisor"
        usage
        exit 2
        ;;
    esac
    ;;

  *)
    echo "Неизвестная команда: ${action}"
    usage
    exit 2
    ;;
esac

