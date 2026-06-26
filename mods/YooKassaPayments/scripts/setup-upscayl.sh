#!/usr/bin/env bash
# Скачивает upscayl-bin + модели Real-ESRGAN (тот же движок, что в https://github.com/upscayl/upscayl).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS="${ROOT}/tools/upscayl"
mkdir -p "$TOOLS"
cd "$TOOLS"

UPSCAYL_ZIP="upscayl-bin-20251207-174704-linux.zip"
UPSCAYL_URL="https://github.com/upscayl/upscayl-ncnn/releases/download/20251207-174704/${UPSCAYL_ZIP}"
REALESRGAN_ZIP="realesrgan-ncnn-vulkan-20220424-ubuntu.zip"
REALESRGAN_URL="https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/${REALESRGAN_ZIP}"

if [[ ! -x realesrgan-full/realesrgan-ncnn-vulkan ]]; then
  echo "==> Real-ESRGAN ncnn + models"
  curl -fsSL -o "$REALESRGAN_ZIP" "$REALESRGAN_URL"
  rm -rf realesrgan-full
  unzip -qo "$REALESRGAN_ZIP" -d realesrgan-full
  chmod +x realesrgan-full/realesrgan-ncnn-vulkan
fi

if [[ ! -f upscayl-bin-20251207-174704-linux/upscayl-bin ]]; then
  echo "==> upscayl-bin (optional)"
  curl -fsSL -o "$UPSCAYL_ZIP" "$UPSCAYL_URL"
  unzip -qo "$UPSCAYL_ZIP"
  chmod +x upscayl-bin-20251207-174704-linux/upscayl-bin
fi

# Модели для upscayl-bin (если понадобится)
if [[ ! -d upscayl-bin-20251207-174704-linux/models ]]; then
  cp -r realesrgan-full/models upscayl-bin-20251207-174704-linux/models
fi

echo "OK: $(ls realesrgan-full/models/*.param | wc -l) models, binary: realesrgan-full/realesrgan-ncnn-vulkan"
