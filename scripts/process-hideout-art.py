#!/usr/bin/env python3
"""Build optimized hideout background and placeable WebP assets."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageOps


DECOR_FILENAMES = (
    "stash-v1.webp",
    "forge-v1.webp",
    "map-device-v1.webp",
    "gem-altar-v1.webp",
    "condition-loom-v1.webp",
    "growth-basin-v1.webp",
    "woodsman-trophy-v1.webp",
    "astra-trophy-v1.webp",
    "underking-trophy-v1.webp",
    "leviathan-trophy-v1.webp",
    "observer-trophy-v1.webp",
    "last-breath-trophy-v1.webp",
    "unscarred-trophy-v1.webp",
    "dry-vial-trophy-v1.webp",
    "fourfold-trophy-v1.webp",
)


def save_background(source: Path, output: Path) -> None:
    with Image.open(source) as image:
        rendered = ImageOps.fit(
            image.convert("RGB"),
            (1600, 900),
            method=Image.Resampling.LANCZOS,
            centering=(0.5, 0.5),
        )
    output.parent.mkdir(parents=True, exist_ok=True)
    rendered.save(output, "WEBP", quality=82, method=6)


def trim_and_frame(cell: Image.Image, size: int = 384) -> Image.Image:
    alpha = cell.getchannel("A")
    bounds = alpha.point(lambda value: 255 if value > 5 else 0).getbbox()
    if bounds is None:
        raise ValueError("Atlas cell does not contain visible artwork")
    visible = cell.crop(bounds)
    max_extent = round(size * 0.84)
    scale = min(max_extent / visible.width, max_extent / visible.height)
    dimensions = (
        max(1, round(visible.width * scale)),
        max(1, round(visible.height * scale)),
    )
    visible = visible.resize(dimensions, Image.Resampling.LANCZOS)
    framed = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    offset = ((size - visible.width) // 2, (size - visible.height) // 2)
    framed.alpha_composite(visible, offset)
    return framed


def save_decor_atlas(source: Path, output_dir: Path) -> None:
    with Image.open(source) as atlas_source:
        atlas = atlas_source.convert("RGBA")
    output_dir.mkdir(parents=True, exist_ok=True)
    for index, filename in enumerate(DECOR_FILENAMES):
        column = index % 4
        row = index // 4
        box = (
            round(column * atlas.width / 4),
            round(row * atlas.height / 4),
            round((column + 1) * atlas.width / 4),
            round((row + 1) * atlas.height / 4),
        )
        framed = trim_and_frame(atlas.crop(box))
        framed.save(output_dir / filename, "WEBP", quality=88, method=4, exact=True)


def frame_direction(cell: Image.Image, size: int = 256) -> Image.Image:
    alpha = cell.getchannel("A")
    bounds = alpha.point(lambda value: 255 if value > 5 else 0).getbbox()
    if bounds is None:
        raise ValueError("Directional cell does not contain visible artwork")
    visible = cell.crop(bounds)
    max_width = round(size * 0.88)
    max_height = round(size * 0.84)
    scale = min(max_width / visible.width, max_height / visible.height)
    dimensions = (
        max(1, round(visible.width * scale)),
        max(1, round(visible.height * scale)),
    )
    visible = visible.resize(dimensions, Image.Resampling.LANCZOS)
    framed = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    offset = ((size - visible.width) // 2, size - round(size * 0.06) - visible.height)
    framed.alpha_composite(visible, offset)
    return framed


def save_directional_sheet(source: Path, output: Path, mirror_single: bool = False) -> None:
    with Image.open(source) as source_image:
        image = source_image.convert("RGBA")
    if mirror_single:
        cells = [image, ImageOps.mirror(image), image, ImageOps.mirror(image)]
    else:
        half_width = image.width // 2
        half_height = image.height // 2
        gap_x = max(1, round(half_width * 0.025))
        gap_y = max(1, round(half_height * 0.05))
        cells = [
            image.crop((0, 0, half_width - gap_x, half_height - gap_y)),
            image.crop((half_width + gap_x, 0, image.width, half_height - gap_y)),
            image.crop((0, half_height + gap_y, half_width - gap_x, image.height)),
            image.crop((half_width + gap_x, half_height + gap_y, image.width, image.height)),
        ]
    framed = [frame_direction(cell) for cell in cells]
    sheet = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    for index, cell in enumerate(framed):
        sheet.alpha_composite(cell, ((index % 2) * 256, (index // 2) * 256))
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, "WEBP", quality=76, method=6, exact=True)


def parse_directional_source(value: str) -> tuple[str, Path, bool]:
    name, separator, path_value = value.partition("=")
    if not separator or not name or not path_value:
        raise argparse.ArgumentTypeError("directional source must use NAME=PATH")
    mirror_single = name.endswith(":mirror")
    return name.removesuffix(":mirror"), Path(path_value), mirror_single


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("background_source", type=Path, nargs="?")
    parser.add_argument("atlas_source", type=Path, nargs="?")
    parser.add_argument("output_root", type=Path, nargs="?")
    parser.add_argument("--directional-source", action="append", type=parse_directional_source, default=[])
    parser.add_argument("--directional-output", type=Path)
    args = parser.parse_args()
    positional = (args.background_source, args.atlas_source, args.output_root)
    if all(positional):
        save_background(args.background_source, args.output_root / "root-sanctum-wood-v2.webp")
        save_decor_atlas(args.atlas_source, args.output_root / "decor")
    elif any(positional):
        parser.error("background_source, atlas_source, and output_root must be supplied together")
    if args.directional_source and not args.directional_output:
        parser.error("--directional-output is required with --directional-source")
    for name, source, mirror_single in args.directional_source:
        save_directional_sheet(source, args.directional_output / f"{name}-directions-v1.webp", mirror_single)
    if not all(positional) and not args.directional_source:
        parser.error("no processing task was supplied")


if __name__ == "__main__":
    main()
