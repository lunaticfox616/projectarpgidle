"""Build compact in-game sprite strips from exported directional character packs.

Usage:
    python scripts/build-playable-character-assets.py --source ".../Playable character/character"
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


CHARACTER_MAP = (
    ("hero1", "Archer"),
    ("hero2", "warrior"),
    ("hero3", "Druid"),
    ("hero4", "Blade"),
    ("hero5", "Paladin"),
    ("hero6", "Sniper"),
    ("hero7", "summoner"),
    ("hero8", "Guardian"),
    ("hero9", "Sorcerer"),
    ("hero10", "alchemist"),
)


def load_pack(source: Path, folder_name: str) -> tuple[Path, dict]:
    package = source / folder_name
    metadata_path = package / "metadata.json"
    if not metadata_path.is_file():
        raise FileNotFoundError(f"Missing character metadata: {metadata_path}")
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    states = metadata.get("states") or []
    if not states:
        raise ValueError(f"No exported state found in {metadata_path}")
    return package, states[0]


def resolve_direction(animation: dict, direction: str) -> list[str]:
    if direction in animation:
        return animation[direction]
    aliases = sorted(key for key in animation if key.startswith(f"{direction}-"))
    if aliases:
        return animation[aliases[0]]
    raise KeyError(f"Animation has no {direction!r} direction")


def trim_transparent(image: Image.Image, padding: int = 2) -> Image.Image:
    bbox = image.getbbox()
    if not bbox:
        return image
    left, top, right, bottom = bbox
    return image.crop(
        (
            max(0, left - padding),
            max(0, top - padding),
            min(image.width, right + padding),
            min(image.height, bottom + padding),
        )
    )


def pack_strip(paths: list[Path]) -> Image.Image:
    frames = [trim_transparent(Image.open(path).convert("RGBA")) for path in paths]
    if not frames:
        raise ValueError("Cannot build an empty animation strip")
    cell_width = max(frame.width for frame in frames)
    cell_height = max(frame.height for frame in frames)
    strip = Image.new("RGBA", (cell_width * len(frames), cell_height), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        x = index * cell_width + (cell_width - frame.width) // 2
        y = cell_height - frame.height
        strip.alpha_composite(frame, (x, y))
    return strip


def build_preview(image: Image.Image, size: int = 128) -> Image.Image:
    bbox = image.getbbox()
    cropped = image.crop(bbox) if bbox else image
    max_extent = max(cropped.width, cropped.height, 1)
    target_extent = int(size * 0.84)
    scale = max(1, target_extent // max_extent)
    if scale > 1:
        cropped = cropped.resize((cropped.width * scale, cropped.height * scale), Image.Resampling.NEAREST)
    if cropped.width > target_extent or cropped.height > target_extent:
        ratio = min(target_extent / cropped.width, target_extent / cropped.height)
        cropped = cropped.resize(
            (max(1, round(cropped.width * ratio)), max(1, round(cropped.height * ratio))),
            Image.Resampling.NEAREST,
        )
    preview = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    preview.alpha_composite(cropped, ((size - cropped.width) // 2, size - cropped.height - 6))
    return preview


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--output", type=Path, default=Path("assets/playable"))
    args = parser.parse_args()

    source = args.source.resolve()
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)

    manifest = {}
    for hero_id, folder_name in CHARACTER_MAP:
        package, state = load_pack(source, folder_name)
        frames = state["frames"]
        idle_path = package / frames["rotations"]["east"]
        animations = frames.get("animations") or {}
        if len(animations) != 1:
            raise ValueError(f"Expected one action animation for {folder_name}, found {len(animations)}")
        animation_name, animation = next(iter(animations.items()))
        action_paths = [package / relative for relative in resolve_direction(animation, "east")]

        idle = trim_transparent(Image.open(idle_path).convert("RGBA"))
        attack = pack_strip(action_paths)
        idle.save(output / f"{hero_id}-idle.png", optimize=True)
        attack.save(output / f"{hero_id}-attack.png", optimize=True)
        build_preview(idle).save(output / f"{hero_id}-preview.png", optimize=True)
        manifest[hero_id] = {
            "source": folder_name,
            "direction": "east",
            "attackFrames": len(action_paths),
            "animation": animation_name,
        }

    (output / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Built {len(manifest)} playable character asset sets in {output}")


if __name__ == "__main__":
    main()
