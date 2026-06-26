#!/usr/bin/env bash
# Диагностика: почему игроки не могут зайти после OAuth.
# Usage на VPS:
#   bash infra/scripts/hytale-auth-check.sh
#   bash infra/scripts/hytale-auth-check.sh --logs

set -euo pipefail

CONTAINER="${HYTALE_CONTAINER:-hytale-server-dev}"
SHOW_LOGS=false
for arg in "$@"; do
  [[ "$arg" == "--logs" ]] && SHOW_LOGS=true
done

echo "=== Контейнер ==="
docker ps -a --filter "name=${CONTAINER}" --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

echo ""
echo "=== UDP 5520 на хосте ==="
ss -ulnp 2>/dev/null | rg ':5520' || echo "(порт 5520/udp не слушается?)"

echo ""
echo "=== auth.enc (OAuth сохранён?) ==="
docker exec "${CONTAINER}" ls -la /home/hytale/server/auth.enc 2>/dev/null || echo "нет auth.enc — нужен auth login + auth persistence Encrypted"

echo ""
echo "=== В консоли сервера выполните ==="
cat <<'EOF'
auth status
auth persistence Encrypted
# если несколько профилей:
auth select 1

# тест: подключитесь с клиента и сразу:
# docker logs --tail 80 hytale-server-dev 2>&1 | rg -i 'auth|login|session|token|closed|reject|grant'
EOF

if [[ "${SHOW_LOGS}" == true ]]; then
  echo ""
  echo "=== Последние строки лога (connect/auth) ==="
  docker logs --tail 120 "${CONTAINER}" 2>&1 | rg -i 'auth|login|session|token|QUICTransport|closed|reject|grant|Authentication' || true
fi
