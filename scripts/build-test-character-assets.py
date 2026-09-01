#!/usr/bin/env python3
"""Pack the six playable classes from the source archive into WebP strips."""

from __future__ import annotations

import argparse
import io
import json
import zipfile
from pathlib import Path

from PIL import Image


CHARACTERS = {
    "occultist": {
        "folder": "Idle_6",
        "label": "비술사",
        "walk": "mage_walking_forward_both_hands_raised_and_cupped",
        "attacks": [
            "spellcaster_with_levitating_blue_orb_orb_dims_then",
            "arcanist_channels_a_spell_floating_orb_in_raised_h",
        ],
    },
    "wanderer": {
        "folder": "Idle_5",
        "label": "방랑자",
        "walk": "wanderer_walking_with_graceful_poise_dagger_held_i",
        "attacks": [
            "rogue_slashing_with_a_dagger_in_the_right_hand_fas",
            "rogue_thrusting_a_dagger_forward_with_the_right_ha",
        ],
    },
    "cleric": {
        "folder": "Idle_4",
        "label": "성직자",
        "walk": "cleric_walking_slowly_thurible_on_a_long_chain_hel",
        "attacks": ["spellcaster_swinging_a_chained_censer_thick_smoke"],
    },
    "archer": {
        "folder": "Idle_3",
        "label": "궁수",
        "walk": "archer_walking_bow_gripped_in_the_right_hand_and_c",
        "attacks": [
            "archery_shot_wide_braced_stance_with_feet_planted",
            "archer_in_side_stance_feet_shoulder-width_apart_an",
        ],
    },
    "alchemist": {
        "folder": "Idle_2",
        "label": "연금술사",
        "walk": "alchemist_strutting_forward_tossing_a_potion_flask",
        "attacks": [
            "throwing_a_flask_with_the_right_hand_follow_throug",
            "right-handed_overhand_throw_wind_up_arm_behind_hea",
            "Hurricane_Kick",
        ],
    },
    "warrior": {
        "folder": "Idle",
        "label": "전사",
        "walkState": "pixel_art_knight_sta",
        "walk": "armored_knight_walking_sword_sheathed_at_the_waist",
        "attacks": [
            "The_character_raises_the_greatsword_from_its_low_r",
            "The_character_firmly_grips_the_sword_hilt_with_bot",
            "The_character_holds_the_sword_firmly_with_both_han",
        ],
    },
}

CARDINAL_DIRECTIONS = ("north", "east", "south", "west")
IDLE_DIRECTIONS = ("north", "east", "south")
ATTACK_DIRECTIONS = ("north", "east", "south")
DEFAULT_DIRECTION = "east"


def read_rgba(archive: zipfile.ZipFile, path: str) -> Image.Image:
    with archive.open(path) as source:
        with Image.open(io.BytesIO(source.read())) as image:
            return image.convert("RGBA")


def frame_paths(
    folder: str,
    animation: str | None,
    state: str = "Idle",
    direction: str = DEFAULT_DIRECTION,
) -> list[str]:
    root = f"characters/{folder}/{state}"
    if animation is None:
        return [f"{root}/rotations/{direction}.png"]
    prefix = f"{root}/animations/{animation}/{direction}/frame_"
    return [f"{prefix}{index:03d}.png" for index in range(100)]


def existing_frame_paths(
    archive: zipfile.ZipFile,
    folder: str,
    animation: str | None,
    state: str = "Idle",
    direction: str = DEFAULT_DIRECTION,
) -> list[str]:
    names = set(archive.namelist())
    paths = frame_paths(folder, animation, state, direction)
    found = [path for path in paths if path in names]
    if not found:
        raise RuntimeError(
            f"No {direction} frames found for {folder}/{state}: {animation or 'rotation'}"
        )
    return found


def optional_frame_paths(
    archive: zipfile.ZipFile,
    folder: str,
    animation: str,
    direction: str,
) -> list[str]:
    names = set(archive.namelist())
    return [path for path in frame_paths(folder, animation, direction=direction) if path in names]


def pack_strip(archive: zipfile.ZipFile, paths: list[str], output: Path) -> dict[str, int]:
    frames = [read_rgba(archive, path) for path in paths]
    sizes = {(frame.width, frame.height) for frame in frames}
    if len(sizes) != 1:
        raise RuntimeError(f"Frame sizes differ for {output}: {sorted(sizes)}")
    width, height = next(iter(sizes))
    strip = Image.new("RGBA", (width * len(frames), height), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        strip.alpha_composite(frame, (index * width, 0))
    output.parent.mkdir(parents=True, exist_ok=True)
    strip.save(output, format="WEBP", lossless=True, method=6, exact=True)
    return {"frames": len(frames), "frameWidth": width, "frameHeight": height}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--archive", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    manifest = {}
    with zipfile.ZipFile(args.archive) as archive:
        for character_id, config in CHARACTERS.items():
            target = args.output / character_id
            folder = str(config["folder"])
            walk_state = str(config.get("walkState", "Idle"))
            directional_idles = {}
            for direction in IDLE_DIRECTIONS:
                idle_paths = existing_frame_paths(archive, folder, None, direction=direction)
                filename = "idle.webp" if direction == DEFAULT_DIRECTION else f"idle-{direction}.webp"
                directional_idles[direction] = {
                    "asset": filename,
                    **pack_strip(archive, idle_paths, target / filename),
                }
            directional_walks = {}
            for direction in CARDINAL_DIRECTIONS:
                walk_paths = existing_frame_paths(
                    archive, folder, config["walk"], walk_state, direction
                )
                filename = "walk.webp" if direction == DEFAULT_DIRECTION else f"walk-{direction}.webp"
                directional_walks[direction] = {
                    "asset": filename,
                    **pack_strip(archive, walk_paths, target / filename),
                }
            attacks = [str(animation) for animation in config["attacks"]]
            attack_directions = {direction: [] for direction in ATTACK_DIRECTIONS}
            for index, animation in enumerate(attacks):
                stem = "attack" if index == 0 else f"attack-{index + 1}"
                for direction in ATTACK_DIRECTIONS:
                    attack_paths = optional_frame_paths(archive, folder, animation, direction)
                    if not attack_paths:
                        continue
                    filename = f"{stem}.webp" if direction == DEFAULT_DIRECTION else f"{stem}-{direction}.webp"
                    attack_directions[direction].append({
                        "animation": animation,
                        "asset": filename,
                        **pack_strip(archive, attack_paths, target / filename),
                    })
            attack_variants = attack_directions[DEFAULT_DIRECTION]
            manifest[character_id] = {
                "label": config["label"],
                "sourceFolder": folder,
                "direction": DEFAULT_DIRECTION,
                "walkState": walk_state,
                "walkAnimation": config["walk"],
                "attackAnimation": attacks[0],
                "attackAnimations": attacks,
                "idle": {
                    key: value
                    for key, value in directional_idles[DEFAULT_DIRECTION].items()
                    if key != "asset"
                },
                "idleDirections": directional_idles,
                "walk": {
                    key: value
                    for key, value in directional_walks[DEFAULT_DIRECTION].items()
                    if key != "asset"
                },
                "walkDirections": directional_walks,
                "attack": {key: value for key, value in attack_variants[0].items() if key not in {"animation", "asset"}},
                "attackVariants": attack_variants,
                "attackDirections": attack_directions,
            }
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
