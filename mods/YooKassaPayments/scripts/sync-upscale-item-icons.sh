#!/usr/bin/env bash
# Автоматически: читает item id из YooKassaPayPage.java, вытаскивает PNG из Assets.zip,
# апскейлит Real-ESRGAN (движок Upscayl). Вызывается из Gradle перед processResources.
#
# Инкрементально: обрабатывает только новые/устаревшие иконки (без --force).
# setup-upscayl.sh запускается сам, если нет бинарника.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
JAVA="${ROOT}/src/main/java/com/github/hytale/yookassa/YooKassaPayPage.java"
CATALOG_JAVA="${ROOT}/src/main/java/com/github/hytale/yookassa/MarketCatalog.java"
IMG_BASE="${ROOT}/src/main/resources/Common/UI/Custom/Pages/YooKassa/Images"
SHOP_DIR="${IMG_BASE}/Shop/items"
WHEEL_DIR="${IMG_BASE}/Wheel/items"
WHEEL_ROOT="${IMG_BASE}/Wheel"
WHEEL_STAMP="${WHEEL_ROOT}/.wheel-upscale.stamp"
HEADER_STAMP="${IMG_BASE}/.header-upscale.stamp"
HEADER_SRC="${ROOT}/../../images"
TOOLS="${ROOT}/tools/upscayl"
BIN="${TOOLS}/realesrgan-full/realesrgan-ncnn-vulkan"
MODELS="${TOOLS}/realesrgan-full/models"
STAMP="${IMG_BASE}/.icons-upscale.stamp"

UPSCALE_MODEL="${UPSCALE_MODEL:-realesrgan-x4plus-anime}"
UPSCALE_SCALE="${UPSCALE_SCALE:-4}"
UPSCALE_GPU="${UPSCALE_GPU:-0}"
FORCE=0
QUIET=0
SKIP_UPSCALE="${YOOKASSA_SKIP_ICON_UPSCALE:-0}"

declare -A ICON_ALIASES=(
  [Weapon_Shortbow_Doomed]=Weapon_Bow_Doomed
)

log() {
  [[ "$QUIET" == "1" ]] && return 0
  echo "$@"
}

resolve_assets() {
  local p
  for p in \
    "${HYTALE_ASSETS_ZIP:-}" \
    "${ROOT}/../../Assets.zip" \
    "${ROOT}/../../../Assets.zip" \
    "/home/hytale/server-dev/Assets.zip" \
    "/home/projects/Hytale/Assets.zip"; do
    [[ -n "$p" && -f "$p" ]] || continue
    echo "$p"
    return 0
  done
  return 1
}

ensure_tools() {
  if [[ -x "$BIN" && -f "${MODELS}/${UPSCALE_MODEL}.param" ]]; then
    return 0
  fi
  log "==> Установка Upscayl/Real-ESRGAN (первый раз)..."
  bash "${ROOT}/scripts/setup-upscayl.sh"
  [[ -x "$BIN" ]] || { echo "Не удалось установить upscaler" >&2; return 1; }
}

icon_needs_work() {
  local id="$1" shop="$2" wheel="$3"
  local path assets_mtime=0 java_mtime=0 png_mtime=0

  if [[ "$FORCE" == "1" ]]; then
    return 0
  fi

  assets_mtime=$(stat -c %Y "$ASSETS" 2>/dev/null || echo 0)
  java_mtime=$(stat -c %Y "$JAVA" 2>/dev/null || echo 0)

  if [[ "$shop" == "1" ]]; then
    path="${SHOP_DIR}/${id}.png"
    if [[ ! -f "$path" ]]; then
      return 0
    fi
    png_mtime=$(stat -c %Y "$path" 2>/dev/null || echo 0)
    if [[ "$assets_mtime" -gt "$png_mtime" || "$java_mtime" -gt "$png_mtime" ]]; then
      return 0
    fi
    if ! file "$path" 2>/dev/null | rg -q '256 x 256'; then
      return 0
    fi
  fi

  if [[ "$wheel" == "1" ]]; then
    path="${WHEEL_DIR}/${id}.png"
    if [[ ! -f "$path" ]]; then
      return 0
    fi
    png_mtime=$(stat -c %Y "$path" 2>/dev/null || echo 0)
    if [[ "$assets_mtime" -gt "$png_mtime" || "$java_mtime" -gt "$png_mtime" ]]; then
      return 0
    fi
    if ! file "$path" 2>/dev/null | rg -q '256 x 256'; then
      return 0
    fi
  fi

  return 1
}

extract_raw() {
  local source_id="$1" dest="$2"
  local path
  path=$(unzip -Z1 "$ASSETS" 2>/dev/null | rg -i "ItemsGenerated/${source_id}\\.png$" | head -1 || true)
  if [[ -z "$path" ]]; then
    return 1
  fi
  unzip -p "$ASSETS" "$path" >"$dest"
}

upscale_one() {
  local raw="$1" out="$2"
  local -a gpu_args=()
  if [[ -n "$UPSCALE_GPU" ]]; then
    gpu_args=(-g "$UPSCALE_GPU")
  fi
  (cd "$(dirname "$BIN")" && ./"$(basename "$BIN")" \
    -i "$raw" -o "$out" \
    -s "$UPSCALE_SCALE" \
    -n "$UPSCALE_MODEL" \
    -m "$MODELS" \
    -f png \
    "${gpu_args[@]}" \
    >/dev/null 2>&1)
}

# Без GPU: хотя бы 64px из архива, чтобы сборка не падала
extract_fallback() {
  local output_id="$1" shop="$2" wheel="$3"
  local source_id="${ICON_ALIASES[$output_id]:-$output_id}"
  local tmp
  tmp=$(mktemp)
  if ! extract_raw "$source_id" "$tmp"; then
    rm -f "$tmp"
    return 1
  fi
  [[ "$shop" == "1" ]] && cp "$tmp" "${SHOP_DIR}/${output_id}.png"
  [[ "$wheel" == "1" ]] && cp "$tmp" "${WHEEL_DIR}/${output_id}.png"
  rm -f "$tmp"
  log "  WARN ${output_id}: без апскейла (скопирован 64px из Assets)"
  return 0
}

process_icon() {
  local output_id="$1" shop="$2" wheel="$3"
  local source_id="${ICON_ALIASES[$output_id]:-$output_id}"
  local tmp
  tmp=$(mktemp -d)

  if ! extract_raw "$source_id" "${tmp}/raw.png"; then
    log "  SKIP ${output_id}: нет ItemsGenerated/${source_id}.png в Assets.zip" >&2
    rm -rf "$tmp"
    return 1
  fi

  if ! upscale_one "${tmp}/raw.png" "${tmp}/upscaled.png"; then
    rm -rf "$tmp"
    extract_fallback "$output_id" "$shop" "$wheel"
    return 0
  fi

  [[ "$shop" == "1" ]] && cp "${tmp}/upscaled.png" "${SHOP_DIR}/${output_id}.png"
  [[ "$wheel" == "1" ]] && cp "${tmp}/upscaled.png" "${WHEEL_DIR}/${output_id}.png"
  rm -rf "$tmp"
  log "  OK ${output_id} (${source_id}) → ${UPSCALE_SCALE}x"
  return 0
}

main() {
  local -a extra_ids=()
  declare -A want_shop=()
  declare -A want_wheel=()
  local only_shop=0 only_wheel=0
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --shop) only_shop=1 ;;
      --wheel) only_wheel=1 ;;
      --force) FORCE=1 ;;
      --quiet) QUIET=1 ;;
      --ids=*) IFS=',' read -ra extra_ids <<< "${1#--ids=}" ;;
      --ids)
        shift
        IFS=',' read -ra extra_ids <<< "${1:-}"
        ;;
      -h|--help)
        sed -n '2,18p' "$0"
        exit 0
        ;;
    esac
    shift
  done

  if [[ "$SKIP_UPSCALE" == "1" ]]; then
    log "[icons] YOOKASSA_SKIP_ICON_UPSCALE=1 — пропуск shop/wheel id"
    process_header_assets
    exit 0
  fi

  if [[ ! -f "$JAVA" ]]; then
    echo "Нет ${JAVA}" >&2
    exit 1
  fi

  ASSETS=$(resolve_assets) || {
    log "[icons] Assets.zip не найден — используем уже лежащие PNG в resources"
    exit 0
  }

  mkdir -p "$SHOP_DIR" "$WHEEL_DIR"

  if [[ ${#extra_ids[@]} -gt 0 ]]; then
    for id in "${extra_ids[@]}"; do
      [[ -n "$id" ]] || continue
      want_shop["$id"]=1
      want_wheel["$id"]=1
    done
  else
    if [[ -n "${MARKET_CATALOG_URL:-}" ]]; then
      local curl_json key_hdr=()
      [[ -n "${MARKET_CATALOG_API_KEY:-}" ]] && key_hdr=(-H "X-Market-Key: ${MARKET_CATALOG_API_KEY}")
      curl_json=$(curl -fsSL "${key_hdr[@]}" "${MARKET_CATALOG_URL%/}/api/hytale/market/catalog" 2>/dev/null || true)
      if [[ -n "$curl_json" ]]; then
        while IFS= read -r id; do
          [[ -n "$id" ]] || continue
          want_shop["$id"]=1
        done < <(printf '%s' "$curl_json" | rg -o '"item_id"\s*:\s*"([^"]+)"' -r '$1' 2>/dev/null | sort -u || true)
        while IFS= read -r id; do
          [[ -n "$id" ]] || continue
          want_wheel["$id"]=1
        done < <(printf '%s' "$curl_json" | rg -o '"item_id"\s*:\s*"([^"]+)"' -r '$1' 2>/dev/null | sort -u || true)
      fi
    fi
    local src="${CATALOG_JAVA}"
    [[ -f "$src" ]] || src="$JAVA"
    while IFS= read -r id; do
      [[ -n "$id" ]] || continue
      want_shop["$id"]=1
    done < <(rg -o 'new ShopItem\("([^"]+)"' -r '$1' "$src" 2>/dev/null || true)

    while IFS= read -r id; do
      [[ -n "$id" ]] || continue
      want_wheel["$id"]=1
    done < <(rg -o 'new WheelSlot\(\d+,\s*"([^"]+)"' -r '$1' "$src" 2>/dev/null || true)
  fi

  if [[ "$only_shop" == "1" ]]; then
    for id in "${!want_wheel[@]}"; do unset "want_wheel[$id]"; done
  fi
  if [[ "$only_wheel" == "1" ]]; then
    for id in "${!want_shop[@]}"; do unset "want_shop[$id]"; done
  fi

  declare -A all=()
  for id in "${!want_shop[@]}"; do all["$id"]=1; done
  for id in "${!want_wheel[@]}"; do all["$id"]=1; done

  local todo=()
  local id s w
  for id in $(printf '%s\n' "${!all[@]}" | sort); do
    s=0 w=0
    [[ -n "${want_shop[$id]:-}" ]] && s=1
    [[ -n "${want_wheel[$id]:-}" ]] && w=1
    if icon_needs_work "$id" "$s" "$w"; then
      todo+=("$id:$s:$w")
    fi
  done

  if [[ ${#todo[@]} -eq 0 ]]; then
    log "[icons] Актуальны (${#all[@]} id), апскейл не нужен"
    {
      echo "assets=$(stat -c %Y "$ASSETS" 2>/dev/null || echo 0)"
      echo "java=$(stat -c %Y "$JAVA" 2>/dev/null || echo 0)"
      printf '%s\n' "${!all[@]}" | sort
    } >"$STAMP"
    process_wheel_assets
    process_header_assets
    exit 0
  fi

  log "[icons] Обновление ${#todo[@]}/${#all[@]} иконок (Assets: ${ASSETS})"
  local UPSCALE_FALLBACK=0
  ensure_tools || {
    log "[icons] WARN: upscaler недоступен, копируем 64px без AI"
    UPSCALE_FALLBACK=1
  }

  local ok=0
  for entry in "${todo[@]}"; do
    IFS=':' read -r id s w <<< "$entry"
    if [[ "${UPSCALE_FALLBACK:-0}" == "1" ]]; then
      extract_fallback "$id" "$s" "$w" && ok=$((ok + 1))
    elif process_icon "$id" "$s" "$w"; then
      ok=$((ok + 1))
    fi
  done

  {
    echo "assets=$(stat -c %Y "$ASSETS" 2>/dev/null || echo 0)"
    echo "java=$(stat -c %Y "$JAVA" 2>/dev/null || echo 0)"
    printf '%s\n' "${!all[@]}" | sort
  } >"$STAMP"

  log "[icons] Готово: ${ok}/${#todo[@]} обновлено"
  process_wheel_assets
  process_header_assets
}

wheel_asset_needs_work() {
  local f="$1"
  [[ -f "$f" ]] || return 1
  if [[ "$FORCE" == "1" ]]; then
    return 0
  fi
  local assets_mtime java_mtime stamp_mtime file_mtime
  assets_mtime=$(stat -c %Y "$ASSETS" 2>/dev/null || echo 0)
  java_mtime=$(stat -c %Y "$JAVA" 2>/dev/null || echo 0)
  stamp_mtime=$(stat -c %Y "$WHEEL_STAMP" 2>/dev/null || echo 0)
  file_mtime=$(stat -c %Y "$f" 2>/dev/null || echo 0)
  if [[ "$assets_mtime" -gt "$stamp_mtime" || "$java_mtime" -gt "$stamp_mtime" ]]; then
    return 0
  fi
  if [[ "$file_mtime" -le "$stamp_mtime" ]]; then
    return 1
  fi
  return 0
}

process_wheel_assets() {
  if [[ "$SKIP_UPSCALE" == "1" ]]; then
    return 0
  fi
  ASSETS=$(resolve_assets) || {
    log "[wheel] Assets.zip не найден — пропуск апскейла колеса"
    return 0
  }

  local -a assets=(wheel.png)
  local i
  for i in $(seq -w 1 12); do
    assets+=("highlight${i}.png")
  done

  local need=0 f
  for f in "${assets[@]}"; do
    if wheel_asset_needs_work "${WHEEL_ROOT}/${f}"; then
      need=1
      break
    fi
  done
  if [[ "$need" == "0" ]]; then
    log "[wheel] Колесо и сектора актуальны"
    return 0
  fi

  log "[wheel] Апскейл колеса и highlight*.png (${UPSCALE_SCALE}x)"
  ensure_tools || {
    log "[wheel] WARN: upscaler недоступен"
    return 0
  }

  local ok=0 tmp
  for f in "${assets[@]}"; do
    local src="${WHEEL_ROOT}/${f}"
    [[ -f "$src" ]] || continue
    tmp=$(mktemp -d)
    if upscale_one "$src" "${tmp}/up.png"; then
      cp "${tmp}/up.png" "$src"
      ok=$((ok + 1))
      log "  OK ${f}"
    else
      log "  WARN ${f}: апскейл не удался"
    fi
    rm -rf "$tmp"
  done

  {
    echo "assets=$(stat -c %Y "$ASSETS" 2>/dev/null || echo 0)"
    echo "java=$(stat -c %Y "$JAVA" 2>/dev/null || echo 0)"
    printf '%s\n' "${assets[@]}"
  } >"$WHEEL_STAMP"
  log "[wheel] Готово: ${ok}/${#assets[@]} файлов"
}

header_icon_size_ok() {
  local f="$1"
  file "$f" 2>/dev/null | rg -q '256 x 256'
}

header_asset_needs_work() {
  local name="$1"
  local dest="${IMG_BASE}/${name}"

  if [[ "$FORCE" == "1" ]]; then
    return 0
  fi

  local plus_mtime x_mtime stamp_mtime=0
  plus_mtime=$(stat -c %Y "${HEADER_SRC}/plus.png" 2>/dev/null || echo 0)
  x_mtime=$(stat -c %Y "${HEADER_SRC}/x.png" 2>/dev/null || echo 0)
  stamp_mtime=$(stat -c %Y "$HEADER_STAMP" 2>/dev/null || echo 0)
  if [[ "$plus_mtime" -gt "$stamp_mtime" || "$x_mtime" -gt "$stamp_mtime" ]]; then
    return 0
  fi

  [[ -f "$dest" ]] || return 0
  header_icon_size_ok "$dest" && return 1
  return 0
}

process_header_assets() {
  local -a assets=(plus_coins.png plus_crystals.png x.png x_hover.png)
  local need=0 f

  if ! python3 "${ROOT}/scripts/prepare-header-icons.py" >/dev/null 2>&1; then
    log "[header] WARN: prepare-header-icons.py не удался"
  fi

  for f in "${assets[@]}"; do
    if header_asset_needs_work "$f"; then
      need=1
      break
    fi
  done
  if [[ "$need" == "0" ]]; then
    log "[header] header icons актуальны"
    return 0
  fi

  log "[header] Апскейл header icons (${UPSCALE_SCALE}x)"
  ensure_tools || {
    log "[header] WARN: upscaler недоступен — оставляем исходники"
    return 0
  }

  local ok=0 tmp dest
  for f in "${assets[@]}"; do
    dest="${IMG_BASE}/${f}"
    [[ -f "$dest" ]] || {
      log "  SKIP ${f}: нет ${dest}"
      continue
    }
    tmp=$(mktemp -d)
    if upscale_one "$dest" "${tmp}/up.png"; then
      python3 - "$dest" "${tmp}/up.png" <<'PY'
import sys
from PIL import Image
dest, src = sys.argv[1], sys.argv[2]
img = Image.open(src).convert("RGBA")
img = img.resize((256, 256), Image.Resampling.LANCZOS)
img.save(dest, optimize=True)
PY
      ok=$((ok + 1))
      log "  OK ${f}"
    else
      log "  WARN ${f}: апскейл не удался"
    fi
    rm -rf "$tmp"
  done

  {
    echo "plus=$(stat -c %Y "${HEADER_SRC}/plus.png" 2>/dev/null || echo 0)"
    echo "x=$(stat -c %Y "${HEADER_SRC}/x.png" 2>/dev/null || echo 0)"
    printf '%s\n' "${assets[@]}"
  } >"$HEADER_STAMP"
  log "[header] Готово: ${ok}/${#assets[@]} файлов"
}

main "$@"
