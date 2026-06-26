#!/usr/bin/env bash
# Патчит WorldProtect.jar: скрывает подписи spawn и countryside на карте (заливка регионов сохраняется).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WP_JAR="${WP_JAR:-$ROOT/WorldProtect/WorldProtect-1.0.11.jar}"
JAVAC="${JAVAC:-javac}"
JAVA="${JAVA:-java}"
JAVASSIST_VERSION="${JAVASSIST_VERSION:-3.30.2-GA}"
LIBS="$DIR/build/libs"
JAVASSIST_JAR="$LIBS/javassist.jar"

if [[ ! -f "$WP_JAR" ]]; then
  echo "WorldProtect jar not found: $WP_JAR" >&2
  exit 1
fi

mkdir -p "$LIBS" "$DIR/build/tools"

if [[ ! -f "$JAVASSIST_JAR" ]]; then
  echo "Downloading javassist $JAVASSIST_VERSION..."
  curl -fsSL -o "$JAVASSIST_JAR" \
    "https://repo1.maven.org/maven2/org/javassist/javassist/${JAVASSIST_VERSION}/javassist-${JAVASSIST_VERSION}.jar"
fi

echo "==> PatchWorldProtectLabels"
$JAVAC --release 21 -encoding UTF-8 \
  -cp "$JAVASSIST_JAR" \
  -d "$DIR/build/tools" \
  "$DIR/tools/PatchWorldProtectLabels.java"

$JAVA -cp "$DIR/build/tools:$JAVASSIST_JAR:$WP_JAR" \
  com.github.hideregionmaplabels.tools.PatchWorldProtectLabels \
  "$WP_JAR"

echo "Done. Deploy patched $WP_JAR + HideRegionMapLabels + WorldProtectBetterMapCompat; map.enabled=false."
