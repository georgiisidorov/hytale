#!/usr/bin/env bash
# Deprecated alias: use set-mod-server-version.sh (wildcard "*" does not silence chat warnings).
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/set-mod-server-version.sh" "$@"
