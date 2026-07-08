#!/usr/bin/env bash
# Сборка плагинов под HytaleServer.jar (Implementation-Version 0.5.x, ServerVersion в manifest — semver range).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$ROOT/.." && pwd)"
SERVER_VER="${HYTALE_SERVER_VERSION_RANGE:-=0.5.4}"

resolve_server_jar() {
  local c
  for c in \
    "${HYTALE_SERVER_JAR:-}" \
    "${REPO_ROOT}/HytaleServer.jar" \
    "$ROOT/ServerWelcome/libs/Server.jar" \
    "$ROOT/HytaleMetricsExporter/libs/Server.jar"; do
    [[ -n "$c" && -f "$c" ]] || continue
    echo "$c"
    return 0
  done
  return 1
}

SERVER_JAR="$(resolve_server_jar)" || { echo "HytaleServer.jar not found (положите в корень репо)" >&2; exit 1; }

mkdir -p "$ROOT/HytaleMetricsExporter/libs" "$ROOT/ServerWelcome/libs" "$ROOT/AutoRankNickname/libs"
cp -f "$SERVER_JAR" "$ROOT/HytaleMetricsExporter/libs/Server.jar"
cp -f "$SERVER_JAR" "$ROOT/ServerWelcome/libs/Server.jar"
cp -f "$SERVER_JAR" "$ROOT/AutoRankNickname/libs/Server.jar"

IMPL_VER="$(unzip -p "$SERVER_JAR" META-INF/MANIFEST.MF 2>/dev/null | tr -d '\r' | awk -F': ' '/Implementation-Version:/{print $2; exit}')"
echo "Server API: ${IMPL_VER:-?}  |  manifest ServerVersion: ${SERVER_VER}"

# HytaleServer.jar собран под Java 25 (class file 69)
if [[ -z "${JAVA_HOME:-}" ]]; then
  for jdk in "${REPO_ROOT}/.jdk25" "${REPO_ROOT}/env/jdk25"; do
    [[ -x "${jdk}/bin/javac" ]] || continue
    export JAVA_HOME="$jdk"
    break
  done
fi
if [[ -z "${JAVA_HOME:-}" && -f "${REPO_ROOT}/OpenJDK25.tar.gz" && ! -x "${REPO_ROOT}/.jdk25/bin/javac" ]]; then
  echo "Распаковка OpenJDK 25..."
  mkdir -p "${REPO_ROOT}/.jdk25"
  tar -xzf "${REPO_ROOT}/OpenJDK25.tar.gz" -C "${REPO_ROOT}/.jdk25" --strip-components=1
  export JAVA_HOME="${REPO_ROOT}/.jdk25"
fi
[[ -n "${JAVA_HOME:-}" ]] && export PATH="${JAVA_HOME}/bin:${PATH}"
JAVAC="${JAVAC:-javac}"
JAR="${JAR:-jar}"
echo "JDK: $($JAVAC -version 2>&1 | head -1)"

build_manual() {
  local dir="$1"
  local version="$2"
  local main_pkg="$3"
  local extra_cp="${4:-}"
  local cp="$SERVER_JAR"
  [[ -n "$extra_cp" ]] && cp="$cp:$ROOT/$extra_cp"
  echo "==> $dir"
  cd "$ROOT/$dir"
  rm -rf build/out
  mkdir -p build/out
  if ! $JAVAC --release 25 -encoding UTF-8 -cp "$cp" -d build/out $main_pkg; then
    echo "    FAIL: $dir (javac)" >&2
    return 1
  fi
  cp src/main/resources/manifest.json build/out/manifest.json
  (cd build/out && $JAR cf "../${dir}-${version}.jar" manifest.json com)
  cp "build/${dir}-${version}.jar" .
  echo "    -> ${dir}-${version}.jar"
}

build_manual BlockToEntity 1.4.5 'src/main/java/com/github/blocktoentity/*.java'
build_manual NoInteraction 1.0.5 'src/main/java/com/nointeraction/*.java'
build_manual ToggleCollision 1.0.0 'src/main/java/com/togglecollision/*.java'
build_manual TeleporterCrashFix 1.0.0 'src/main/java/com/github/teleportercrashfix/*.java'
build_manual RegionInteractionGuard 1.0.31 'src/main/java/com/github/regionguard/*.java'
build_manual RegionSizeGuard 1.0.0 'src/main/java/com/github/regionsizeguard/*.java' 'WorldProtect/WorldProtect-1.0.12.jar'
build_manual WorldProtectBetterMapCompat 1.0.8 'src/main/java/com/github/wpmapcompat/*.java'
build_manual HideRegionMapLabels 1.0.0 'src/main/java/com/github/hideregionmaplabels/*.java'
if ! build_manual MazeSlots 1.0.0 'src/main/java/com/github/mazeslots/*.java'; then
  echo "    WARN: MazeSlots не собран (API 0.5.3 — нужна доработка)"
fi

WP_JAR="$ROOT/WorldProtect/WorldProtect-1.0.12.jar"
WP_BAK="$ROOT/WorldProtect/WorldProtect-1.0.12.jar.bak-pickup"
PATCH_WP="$REPO_ROOT/infra/scripts/patch-worldprotect.sh"
SET_VER="$REPO_ROOT/infra/scripts/set-mod-server-version.sh"

# WorldProtect: байткод-патч (NOP ItemPickup/ItemDropRollbackListener) + ServerVersion=0.5.4
# НЕ используем zip -u и НЕ прогоняем set-mod-server-version на WP_JAR:
# zip -u ломает ZIP-структуру и манифест перестаёт парситься сервером.
if [[ -f "$WP_JAR" && -f "$PATCH_WP" ]]; then
  bash "$PATCH_WP" "$WP_JAR" "$WP_BAK" || true
fi

if [[ -f "$SET_VER" ]]; then
  bash "$SET_VER" "${SERVER_VER}" \
    "$ROOT/WorldProtectBetterMapCompat/WorldProtectBetterMapCompat-1.0.8.jar" \
    "$ROOT/HideRegionMapLabels/HideRegionMapLabels-1.0.0.jar" \
    "$ROOT/BlockToEntity/BlockToEntity-1.4.5.jar" \
    "$ROOT/TeleporterCrashFix/TeleporterCrashFix-1.0.0.jar" \
    "$ROOT/RegionInteractionGuard/RegionInteractionGuard-1.0.31.jar" \
    "$ROOT/NoInteraction/NoInteraction-1.0.5.jar" \
    "$ROOT/ToggleCollision/ToggleCollision-1.0.0.jar" \
    "$ROOT/MazeSlots/MazeSlots-1.0.0.jar" \
    "$ROOT/RegionSizeGuard/RegionSizeGuard-1.0.0.jar" 2>/dev/null || true
fi

build_kotlin_mod() {
  local gdir="$1"
  if [[ ! -d "$ROOT/$gdir" ]]; then
    return 0
  fi
  echo "==> $gdir (gradle/kotlin)"
  export HYTALE_JDK25="${HYTALE_JDK25:-${REPO_ROOT}/.jdk25}"
  export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-21-openjdk-amd64}"
  if (cd "$ROOT/$gdir" && ./gradlew clean jar -q); then
    latest="$(ls -1t "$ROOT/$gdir/build/libs/"*.jar 2>/dev/null | grep -v sources | grep -v javadoc | head -1 || true)"
    if [[ -n "$latest" ]]; then
      cp -f "$latest" "$ROOT/$gdir/"
      echo "    -> $(basename "$latest")"
    fi
  else
    echo "    WARN: $gdir не собран" >&2
    return 1
  fi
}

for gdir in ServerWelcome AutoRankNickname RegionMobControl; do
  build_kotlin_mod "$gdir" || true
done

package_gradle_jar() {
  local gdir="$1"
  local classes="$ROOT/$gdir/build/classes/java/main"
  local resources="$ROOT/$gdir/build/resources/main"
  local outdir="$ROOT/$gdir/build/out-package"
  local ver
  ver="$(grep -oP '"Version": "\K[^"]+' "$ROOT/$gdir/src/main/resources/manifest.json" 2>/dev/null | head -1)"
  [[ -n "$ver" ]] || ver="1.0.0"
  [[ -d "$classes" ]] || return 1
  rm -rf "$outdir"
  mkdir -p "$outdir"
  cp -a "$classes"/. "$outdir"/
  [[ -d "$resources" ]] && cp -a "$resources"/. "$outdir"/
  (cd "$outdir" && $JAR cf "$ROOT/$gdir/build/${gdir}-${ver}.jar" .)
  cp "$ROOT/$gdir/build/${gdir}-${ver}.jar" "$ROOT/$gdir/"
  echo "    -> ${gdir}-${ver}.jar (manual package)"
}

for gdir in CustomPopup YooKassaPayments; do
  if [[ -d "$ROOT/$gdir/build/classes" || -d "$ROOT/$gdir/build/classes/java/main" ]]; then
    package_gradle_jar "$gdir" || true
  fi
done

if [[ -f "$SET_VER" ]]; then
  jars=()
  for gdir in ServerWelcome YooKassaPayments CustomPopup HytaleMetricsExporter AutoRankNickname RegionMobControl; do
    j="$(ls -1t "$ROOT/$gdir/build/libs/"*.jar "$ROOT/$gdir"/*.jar 2>/dev/null | grep -v sources | grep -v javadoc | head -1 || true)"
    [[ -n "$j" && -f "$j" ]] && jars+=("$j")
  done
  if [[ ${#jars[@]} -gt 0 ]]; then
    bash "$SET_VER" "${SERVER_VER}" "${jars[@]}" || true
  fi
fi

echo ""
echo "Done (${SERVER_VER}). Скопируйте актуальные jar в server-dev/mods/ и перезапустите сервер."
