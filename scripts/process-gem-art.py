#!/usr/bin/env python3
"""Crop and resize chroma-keyed gem art into production UI assets."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def process(source: Path, output: Path, size: int) -> None:
    image = Image.open(source).convert("RGBA")
    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError(f"No visible pixels found in {source}")

    left, top, right, bottom = bounds
    visible_size = max(right - left, bottom - top)
    padding = max(2, round(visible_size * 0.035))
    center_x = (left + right) / 2
    center_y = (top + bottom) / 2
    crop_size = visible_size + padding * 2
    crop_box = (
        round(center_x - crop_size / 2),
        round(center_y - crop_size / 2),
        round(center_x + crop_size / 2),
        round(center_y + crop_size / 2),
    )

    cropped = Image.new("RGBA", (crop_size, crop_size), (0, 0, 0, 0))
    source_crop = image.crop(crop_box)
    cropped.alpha_composite(source_crop, (0, 0))
    resized = cropped.resize((size, size), Image.Resampling.LANCZOS)
    output.parent.mkdir(parents=True, exist_ok=True)
    resized.save(output, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--size", type=int, default=256)
    args = parser.parse_args()
    process(args.source, args.output, args.size)


if __name__ == "__main__":
    main()
