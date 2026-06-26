#!/usr/bin/env bash
# Сборка патча: vip/admin/op — создание меток, op — конфиг. Использует OpenJDK25 из проекта.
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
BM_JAR="${SCRIPT_DIR}/BetterMap-1.3.3.jar"
SERVER_JAR="${SERVER_JAR:-/home/projects/Hytale/ServerWelcome/libs/Server.jar}"
PATCH_SRC="${SCRIPT_DIR}/patched-src"
PATCH_OUT="${SCRIPT_DIR}/patch-out"
WH_SRC="${SCRIPT_DIR}/decompiled/WorldMapHook_out/dev/ninesliced/utils/WorldMapHook.java"
# OpenJDK25 из проекта
JDK25="/home/projects/Hytale/jdk-25.0.2+10"
if [ -x "${JDK25}/bin/javac" ]; then
  JAVAC="${JDK25}/bin/javac"
  JAR="${JDK25}/bin/jar"
else
  JAVAC="${JAVAC:-javac}"
  JAR="${JAR:-jar}"
fi

if ! "$JAVAC" -version >/dev/null 2>&1; then
  echo "javac not found. Extract OpenJDK25.tar.gz to $JDK25 or set JAVAC= path."
  exit 1
fi
echo "Using: $JAVAC"
if [ ! -f "$BM_JAR" ]; then
  echo "BetterMap-1.3.3.jar not found"
  exit 1
fi
if [ ! -f "$SERVER_JAR" ]; then
  echo "Server.jar not found at $SERVER_JAR. Set SERVER_JAR."
  exit 1
fi

CP="${BM_JAR}:${SERVER_JAR}"
rm -rf "$PATCH_OUT"
mkdir -p "$PATCH_OUT"

echo "Compiling patched PermissionsUtil and AdminCommand..."
"$JAVAC" -cp "$CP" -d "$PATCH_OUT" \
  "$PATCH_SRC/dev/ninesliced/utils/PermissionsUtil.java" \
  "$PATCH_SRC/dev/ninesliced/commands/bettermap/AdminCommand.java"

echo "Compiling patched WorldMapHook..."
if "$JAVAC" -cp "$CP" -d "$PATCH_OUT" "$WH_SRC" 2>/dev/null; then
  echo "WorldMapHook compiled."
else
  echo "WorldMapHook compile failed - JAR will be updated with PermissionsUtil and AdminCommand only."
fi

echo "Updating JAR..."
cd "$PATCH_OUT"
"$JAR" uf "$BM_JAR" dev/ninesliced/utils/PermissionsUtil.class dev/ninesliced/commands/bettermap/AdminCommand.class
[ -f dev/ninesliced/utils/WorldMapHook.class ] && "$JAR" uf "$BM_JAR" dev/ninesliced/utils/WorldMapHook.class
cd "$SCRIPT_DIR"
echo "Done. Patched JAR: $BM_JAR"
echo "Backup original before replacing on server."
