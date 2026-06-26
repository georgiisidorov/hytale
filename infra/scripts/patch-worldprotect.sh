#!/usr/bin/env bash
# Патчит WorldProtect-1.0.11.jar / 1.0.12.jar:
#   1. NOP ItemPickupRollbackListener registration (ClassNotFoundException в 0.5.4)
#   2. NOP ItemDropRollbackListener  registration (ClassNotFoundException в 0.5.4)
#   3. ServerVersion → =0.5.4 (bare 0.5.0 или range ^0.5.0 ломают парсер после zip-u)
#
# Перепаковывает через JDK jar cf — НЕ zip/unzip — чтобы не испортить ZIP-структуру.
# CP-индексы (014b / 015f) идентичны в обеих версиях WP.
#
# Usage: ./patch-worldprotect.sh <jar> [backup]
#   jar    — путь к WorldProtect-*.jar (будет изменён на месте)
#   backup — путь к оригинальному .bak-pickup (опционально; если не задан, jar уже должен быть чистым)

set -euo pipefail

JAR="${1:?Usage: $0 <jar> [backup]}"
BACKUP="${2:-}"
JAR_ABS="$(cd "$(dirname "$JAR")" && pwd)/$(basename "$JAR")"

if [[ -n "$BACKUP" && -f "$BACKUP" ]]; then
    cp "$BACKUP" "$JAR_ABS"
    echo "Restored $JAR_ABS from $BACKUP"
fi

[[ -f "$JAR_ABS" ]] || { echo "JAR not found: $JAR_ABS" >&2; exit 1; }

JAR_CMD="${JAR:-jar}"
[[ -n "${JAVA_HOME:-}" ]] && JAR_CMD="$JAVA_HOME/bin/jar"

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

# Распаковываем через jar xf
(cd "$TMPDIR" && "$JAR_CMD" xf "$JAR_ABS")
echo "Extracted to $TMPDIR"

CLASS="$TMPDIR/dev/worldprotect/worldprotect/WorldProtectPlugin.class"
[[ -f "$CLASS" ]] || { echo "WorldProtectPlugin.class not found in JAR" >&2; exit 1; }

python3 - "$CLASS" << 'PYEOF'
import sys

path = sys.argv[1]
with open(path, 'rb') as f:
    ba = bytearray(f.read())

# ItemPickupRollbackListener (cp#331 = 0x014b)
# aload_0, invokevirtual #0x0120, new #0x014b, dup, aload_0, getfield #0x0142, invokespecial #0x014d, invokevirtual #0x0127
n1 = bytes([0x2a, 0xb6, 0x01, 0x20, 0xbb, 0x01, 0x4b,
            0x59, 0x2a, 0xb4, 0x01, 0x42, 0xb7, 0x01, 0x4d,
            0xb6, 0x01, 0x27])

# ItemDropRollbackListener (cp#351 = 0x015f)
# aload_0, invokevirtual #0x0120, new #0x015f, dup, aload_0, getfield #0x0156, invokespecial #0x0161, invokevirtual #0x0127
n2 = bytes([0x2a, 0xb6, 0x01, 0x20, 0xbb, 0x01, 0x5f,
            0x59, 0x2a, 0xb4, 0x01, 0x56, 0xb7, 0x01, 0x61,
            0xb6, 0x01, 0x27])

i1 = ba.find(n1)
i2 = ba.find(n2)

if i1 < 0:
    print(f"ERROR: ItemPickupRollbackListener needle not found in {path}", flush=True)
    sys.exit(1)
if i2 < 0:
    print(f"ERROR: ItemDropRollbackListener needle not found in {path}", flush=True)
    sys.exit(1)

ba[i1:i1+18] = bytes(18)
ba[i2:i2+18] = bytes(18)

with open(path, 'wb') as f:
    f.write(bytes(ba))

print(f"  NOP'd ItemPickupRollbackListener at class offset {i1}")
print(f"  NOP'd ItemDropRollbackListener   at class offset {i2}")
PYEOF

# Обновляем manifest.json → ServerVersion = =0.5.4
MANIFEST="$TMPDIR/manifest.json"
[[ -f "$MANIFEST" ]] || { echo "manifest.json not found in JAR" >&2; exit 1; }
python3 -c "
import json, sys
with open(sys.argv[1]) as f:
    m = json.load(f)
m['ServerVersion'] = '=0.5.4'
with open(sys.argv[1], 'w') as f:
    json.dump(m, f, indent=2)
print('  ServerVersion → =0.5.4')
" "$MANIFEST"

# Перепаковываем через jar cf (стандартный Java-инструмент, не zip-u)
(cd "$TMPDIR" && "$JAR_CMD" cf "$JAR_ABS" .)
echo "Repacked $JAR_ABS via jar cf"

# Верификация
python3 - "$JAR_ABS" << 'PYEOF'
import sys, zipfile, json

jar = sys.argv[1]
with zipfile.ZipFile(jar) as z:
    ba = bytearray(z.read('dev/worldprotect/worldprotect/WorldProtectPlugin.class'))
    m  = json.loads(z.read('manifest.json'))

n1 = bytes([0x2a, 0xb6, 0x01, 0x20, 0xbb, 0x01, 0x4b, 0x59, 0x2a, 0xb4, 0x01, 0x42, 0xb7, 0x01, 0x4d, 0xb6, 0x01, 0x27])
n2 = bytes([0x2a, 0xb6, 0x01, 0x20, 0xbb, 0x01, 0x5f, 0x59, 0x2a, 0xb4, 0x01, 0x56, 0xb7, 0x01, 0x61, 0xb6, 0x01, 0x27])

ok = True
if ba.find(n1) >= 0:
    print("FAIL: ItemPickupRollbackListener NOT patched"); ok = False
if ba.find(n2) >= 0:
    print("FAIL: ItemDropRollbackListener NOT patched");  ok = False
if m.get('ServerVersion') != '=0.5.4':
    print(f"FAIL: ServerVersion={m.get('ServerVersion')}"); ok = False
if ok:
    print("OK: both listeners NOP'd, ServerVersion=0.5.4")
PYEOF
