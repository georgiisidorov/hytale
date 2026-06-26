#!/usr/bin/env bash
set -euo pipefail

# Если задано — перед запуском JVM правит Defaults.GameMode в config.json (см. HytaleServerConfig / Defaults).
# Используется на prod; dev не задаёт переменную — файл не трогаем.
apply_default_gamemode() {
	local gm="${HYTALE_DEFAULT_GAMEMODE:-}"
	[[ -z "${gm}" ]] && return 0
	local cfg="/home/hytale/server/config.json"
	[[ -f "${cfg}" ]] || return 0
	local tmp
	tmp="$(mktemp)"
	if jq --arg gm "${gm}" '.Defaults = (.Defaults // {}) | .Defaults.GameMode = $gm' "${cfg}" >"${tmp}" 2>/dev/null; then
		mv "${tmp}" "${cfg}"
	else
		rm -f "${tmp}"
		echo "[docker-entrypoint] предупреждение: не удалось выставить Defaults.GameMode=${gm} в ${cfg}" >&2
	fi
}

apply_default_gamemode
exec "$@"
