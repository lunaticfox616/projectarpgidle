#!/usr/bin/env python3
"""Build browser-friendly playable character strips from exported frame folders."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Callable

from PIL import Image


CHARACTERS = {
    "hero1": {
        "source": "Archer",
        "portrait": "Archer Portrait.png",
        "walk": lambda name: "walks_forward" in name,
        "attack": lambda name: "shifts_their_weight" in name,
    },
    "hero2": {
        "source": "warrior",
        "portrait": "worror Portrait.png",
        "walk": lambda name: "maintains_a_guarded" in name,
        "attack": lambda name: "takes_a_brief_focused" in name,
    },
    "hero3": {
        "source": "Druid",
        "portrait": "Druid Portrait.png",
        "walk": lambda name: "performs_a_light_rhythmic" in name,
        "attack": lambda name: "gently_raises" in name,
    },
    "hero4": {
        "source": "Blade",
        "portrait": "Blade Portrait.png",
        "walk": lambda name: "walks_forward" in name,
        "attack": lambda name: "lunges_forward" in name,
    },
    "hero5": {
        "source": "Paladin",
        "portrait": "Paladin Portrait.png",
        "walk": lambda name: "armored_warrior_walks" in name,
        "attack": lambda name: "warrior_shifts_her_weight" in name,
    },
    "hero6": {
        "source": "Sniper",
        "portrait": "Sniper Portrait.png",
        "walk": lambda name: name == "animation",
        "attack": lambda name: "lifts_the_crossbow" in name,
    },
    "hero7": {
        "source": "summoner",
        "portrait": "Summoner Portrait.png",
        "walk": lambda name: "walks_forward" in name,
        "attack": lambda name: "stands_in_place" in name,
    },
    "hero8": {
        "source": "Guardian",
        "portrait": "Guardian Portrait.png",
        "walk": lambda name: "begins_to_walk" in name,
        "attack": lambda name: "shifts_its_weight" in name,
    },
    "hero9": {
        "source": "Sorcerer",
        "portrait": "Corcerer Portrait.png",
        "walk": lambda name: "holds_the_staff" in name,
        "attack": lambda name: "holds_their_staff" in name,
    },
    "hero10": {
        "source": "alchemist",
        "portrait": "Alchemist Portrait.png",
        "walk": lambda name: "walks_forward" in name,
        "attack": lambda name: name == "Attack",
    },
}

COMBAT_DIRECTION = "east"


def select_animation(animation_root: Path, matcher: Callable[[str], bool]) -> Path:
    matches = [path for path in animation_root.iterdir() if path.is_dir() and matcher(path.name)]
    if len(matches) != 1:
        raise RuntimeError(f"Expected one animation in {animation_root}, found: {[p.name for p in matches]}")
    return matches[0]


def load_rgba(path: Path) -> Image.Image:
    with Image.open(path) as source:
        return source.convert("RGBA")


def pack_strip(frame_paths: list[Path], output: Path) -> dict[str, int]:
    if not frame_paths:
        raise RuntimeError(f"No animation frames for {output}")
    frames = [load_rgba(path) for path in frame_paths]
    widths = {frame.width for frame in frames}
    heights = {frame.height for frame in frames}
    if len(widths) != 1 or len(heights) != 1:
        raise RuntimeError(f"Frames must share a size for {output}: {sorted(widths)} x {sorted(heights)}")
    width = next(iter(widths))
    height = next(iter(heights))
    strip = Image.new("RGBA", (width * len(frames), height), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        strip.alpha_composite(frame, (index * width, 0))
    output.parent.mkdir(parents=True, exist_ok=True)
    strip.save(output, format="PNG", optimize=True)
    return {"frames": len(frames), "frameWidth": width, "frameHeight": height}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--characters", type=Path, required=True)
    parser.add_argument("--portraits", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    characters_root = args.characters / "characters"
    playable_root = args.output / "playable"
    portrait_root = args.output / "portraits"
    manifest: dict[str, dict[str, object]] = {}

    for hero_id, config in CHARACTERS.items():
        source_name = str(config["source"])
        source_root = characters_root / source_name / source_name
        animation_root = source_root / "animations"
        hero_output = playable_root / hero_id

        idle_path = source_root / "rotations" / f"{COMBAT_DIRECTION}.png"
        idle_info = pack_strip([idle_path], hero_output / "idle.png")

        walk_dir = select_animation(animation_root, config["walk"])
        attack_dir = select_animation(animation_root, config["attack"])
        walk_frames = sorted((walk_dir / COMBAT_DIRECTION).glob("frame_*.png"))
        attack_frames = sorted((attack_dir / COMBAT_DIRECTION).glob("frame_*.png"))
        walk_info = pack_strip(walk_frames, hero_output / "walk.png")
        attack_info = pack_strip(attack_frames, hero_output / "attack.png")

        portrait_source = args.portraits / str(config["portrait"])
        portrait = load_rgba(portrait_source)
        portrait_root.mkdir(parents=True, exist_ok=True)
        portrait.save(portrait_root / f"{hero_id}.png", format="PNG", optimize=True)

        manifest[hero_id] = {
            "source": source_name,
            "portraitSource": portrait_source.name,
            "combatDirection": COMBAT_DIRECTION,
            "idle": idle_info,
            "walk": walk_info,
            "attack": attack_info,
        }

    playable_root.mkdir(parents=True, exist_ok=True)
    (playable_root / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
