from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


SLOTS = [
    ("hero", 64, 76),
    ("hero0", 64, 76),
    ("hero1", 64, 76),
    ("bat", 48, 48),
    ("bat0", 48, 48),
    ("bat1", 48, 48),
    ("slime", 48, 48),
    ("slime0", 48, 48),
    ("slime1", 48, 48),
    ("skull", 48, 48),
    ("skull0", 48, 48),
    ("skull1", 48, 48),
    ("mage", 48, 48),
    ("mage0", 48, 48),
    ("mage1", 48, 48),
    ("reaper", 96, 96),
    ("xp", 32, 32),
    ("heart", 32, 32),
    ("magnet", 32, 32),
    ("bomb", 32, 32),
    ("sparkShot", 32, 32),
    ("bladeShot", 32, 32),
    ("boltShot", 32, 32),
    ("flameShot", 32, 32),
]


def distance_from_key(pixel: tuple[int, int, int], key: tuple[int, int, int]) -> int:
    return abs(pixel[0] - key[0]) + abs(pixel[1] - key[1]) + abs(pixel[2] - key[2])


def chroma_to_alpha(image: Image.Image, key: tuple[int, int, int], threshold: int) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            is_key_fringe = r > 170 and b > 150 and g < 95
            if distance_from_key((r, g, b), key) <= threshold or is_key_fringe:
                pixels[x, y] = (r, g, b, 0)
            elif distance_from_key((r, g, b), key) <= threshold * 3:
                pixels[x, y] = (r, g, b, min(a, 210))
    return rgba


def content_bounds(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    if not bounds:
        return (0, 0, image.width, image.height)
    left, top, right, bottom = bounds
    pad = 6
    return (
        max(0, left - pad),
        max(0, top - pad),
        min(image.width, right + pad),
        min(image.height, bottom + pad),
    )


def fit_to_cell(sprite: Image.Image, width: int, height: int) -> Image.Image:
    sprite = sprite.crop(content_bounds(sprite))
    scale = min(width / sprite.width, height / sprite.height) * 0.92
    resized = sprite.resize((max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))), Image.Resampling.LANCZOS)
    cell = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    cell.alpha_composite(resized, ((width - resized.width) // 2, (height - resized.height) // 2))
    return cell


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--cols", type=int, default=4)
    parser.add_argument("--rows", type=int, default=6)
    parser.add_argument("--key", default="255,0,255")
    parser.add_argument("--threshold", type=int, default=42)
    args = parser.parse_args()

    source = Image.open(args.input).convert("RGB")
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    key = tuple(int(part) for part in args.key.split(","))

    for index, (name, target_w, target_h) in enumerate(SLOTS):
        col = index % args.cols
        row = index // args.cols
        left = round((source.width * col) / args.cols)
        right = round((source.width * (col + 1)) / args.cols)
        top = round((source.height * row) / args.rows)
        bottom = round((source.height * (row + 1)) / args.rows)
        raw_cell = source.crop((left, top, right, bottom))
        transparent = chroma_to_alpha(raw_cell, key, args.threshold)
        final = fit_to_cell(transparent, target_w, target_h)
        final.save(out_dir / f"{name}.png")


if __name__ == "__main__":
    main()
