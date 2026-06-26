#!/usr/bin/env bash
# Прописает в manifest.json внутри jar ServerVersion для текущего сервера.
# С 0.5.3 нужен SemverRange: "=0.5.3" (не голый "0.5.3" — CodecException).
# Старый формат YYYY.MM.DD-<sha> по-прежнему принимается как wildcard.
#
# Usage:
#   ./set-mod-server-version.sh /path/to/HytaleServer.jar /path/to/plugin.jar [more.jar ...]
#   ./set-mod-server-version.sh 2026.03.26-89796e57b /path/to/plugin.jar ...

set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <HytaleServer.jar|VERSION> <plugin.jar> [plugin2.jar ...]" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Need jq installed." >&2
  exit 1
fi

resolve_version() {
  local arg="$1"
  if [[ -f "$arg" ]]; then
    unzip -p "$arg" META-INF/MANIFEST.MF 2>/dev/null | tr -d '\r' | awk -F': ' '/Implementation-Version:/{print $2; exit}'
  else
    echo "$arg"
  fi
}

# 0 = ok, 2 = нет manifest.json
patch_manifest_in_jar() {
  local jar="$1"
  local ver="$2"
  local jar_abs tmp
  jar_abs="$(cd "$(dirname "$jar")" && pwd)/$(basename "$jar")"
  tmp="$(mktemp -d)"

  if ! unzip -p "$jar_abs" manifest.json 2>/dev/null | grep -q .; then
    rm -rf "$tmp"
    return 2
  fi

  if ! unzip -p "$jar_abs" manifest.json >"$tmp/manifest.json" 2>/dev/null; then
    rm -rf "$tmp"
    return 2
  fi

  # Implementation-Version "0.5.3" → "=0.5.3" для SemverRange
  if [[ "$ver" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    ver="=${ver}"
  fi
  jq --arg v "$ver" '.ServerVersion = $v' "$tmp/manifest.json" >"$tmp/manifest.json.new"
  mv "$tmp/manifest.json.new" "$tmp/manifest.json"

  if (cd "$tmp" && zip -q -u "$jar_abs" manifest.json) 2>/dev/null; then
    :
  else
    zip -q -d "$jar_abs" manifest.json 2>/dev/null || true
    zip -q -j "$jar_abs" "$tmp/manifest.json"
  fi

  rm -rf "$tmp"
  return 0
}

RAW_VER="$(resolve_version "$1")"
if [[ -z "$RAW_VER" ]]; then
  echo "Could not read Implementation-Version from: $1" >&2
  exit 1
fi

VER="$RAW_VER"
PATCH_VER="$RAW_VER"
if [[ "$VER" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  PATCH_VER="=${VER}"
fi

echo "Using ServerVersion: $PATCH_VER"
shift

for jar in "$@"; do
  if [[ ! -f "$jar" ]]; then
    echo "Skip (not found): $jar" >&2
    continue
  fi

  rc=0
  patch_manifest_in_jar "$jar" "$PATCH_VER" || rc=$?

  if [[ "$rc" -eq 2 ]]; then
    echo "Skip (no manifest.json): $jar" >&2
    continue
  fi

  got="$(unzip -p "$jar" manifest.json 2>/dev/null | jq -r '.ServerVersion // empty' || true)"
  if [[ "$got" == "$PATCH_VER" || "$got" == "$RAW_VER" ]]; then
    echo "OK: $jar"
  else
    echo "FAIL: $jar (в jar ServerVersion='$got', нужно '$VER'). Замените jar с dev-машины." >&2
  fi
done
