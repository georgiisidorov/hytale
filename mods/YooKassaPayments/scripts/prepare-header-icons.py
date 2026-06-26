#!/usr/bin/env python3
"""Квадратные header-иконки + перекраска перед апскейлом."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT.parents[1] / "images"
OUT = ROOT / "src/main/resources/Common/UI/Custom/Pages/YooKassa/Images"

PLUS_COINS = (0xF1, 0xD2, 0x7A)
PLUS_CRYSTALS = (0x8E, 0xC8, 0xFF)
X_DEFAULT = (0xD5, 0xD5, 0xD5)
X_HOVER = (0xFF, 0xFF, 0xFF)


HEADER_SIZE = 256


def square_canvas(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    alpha = img.split()[3]
    bbox = alpha.getbbox()
    if bbox is None:
        bbox = img.getbbox()
    if bbox is None:
        return img
    cropped = img.crop(bbox)
    side = max(cropped.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    ox = (side - cropped.width) // 2
    oy = (side - cropped.height) // 2
    canvas.paste(cropped, (ox, oy), cropped)
    return canvas


def finalize(img: Image.Image) -> Image.Image:
    img = square_canvas(img)
    if img.size != (HEADER_SIZE, HEADER_SIZE):
        img = img.resize((HEADER_SIZE, HEADER_SIZE), Image.Resampling.LANCZOS)
    return img


def tint(img: Image.Image, rgb: tuple[int, int, int]) -> Image.Image:
    img = img.convert("RGBA")
    r, g, b, a = img.split()
    color = Image.new("RGBA", img.size, (*rgb, 0))
    color.putalpha(a)
    return color


def prepare_plus(out_name: str, rgb: tuple[int, int, int]) -> None:
    src = SRC / "plus.png"
    if not src.exists():
        raise SystemExit(f"Нет {src}")
    out = OUT / out_name
    finalize(tint(square_canvas(Image.open(src)), rgb)).save(out, optimize=True)


def prepare_x(out_name: str, rgb: tuple[int, int, int]) -> None:
    src = SRC / "x.png"
    if not src.exists():
        raise SystemExit(f"Нет {src}")
    out = OUT / out_name
    finalize(tint(square_canvas(Image.open(src)), rgb)).save(out, optimize=True)


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    prepare_plus("plus_coins.png", PLUS_COINS)
    prepare_plus("plus_crystals.png", PLUS_CRYSTALS)
    prepare_x("x.png", X_DEFAULT)
    prepare_x("x_hover.png", X_HOVER)
    return 0


if __name__ == "__main__":
    sys.exit(main())
