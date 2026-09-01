"""Normalize a generated 5x5 passive-icon sheet into a safe 5x4 WebP atlas."""

from __future__ import annotations

import colorsys
import sys
from collections import deque
from pathlib import Path

from PIL import Image


GRID_SIZE = 5
USED_ROWS = 4
CELL_SIZE = 128
ICON_MAX_SIZE = 82
SLOT_MAX_SIZE = 100
ATTRIBUTE_STAR_INDEX = 4


def is_checker_pixel(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, alpha = pixel
    return alpha > 0 and min(red, green, blue) >= 220 and max(red, green, blue) - min(red, green, blue) <= 12


def remove_connected_checker(image: Image.Image, include_center: bool = False) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    queued = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        index = y * width + x
        if queued[index] or not is_checker_pixel(pixels[x, y]):
            return
        queued[index] = 1
        queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)
    if include_center:
        enqueue(width // 2, height // 2)

    while queue:
        x, y = queue.popleft()
        red, green, blue, _ = pixels[x, y]
        pixels[x, y] = (red, green, blue, 0)
        if x > 0:
            enqueue(x - 1, y)
        if x + 1 < width:
            enqueue(x + 1, y)
        if y > 0:
            enqueue(x, y - 1)
        if y + 1 < height:
            enqueue(x, y + 1)
    return rgba


def crop_grid_cell(image: Image.Image, column: int, row: int) -> Image.Image:
    width, height = image.size
    left = round(column * width / GRID_SIZE)
    top = round(row * height / GRID_SIZE)
    right = round((column + 1) * width / GRID_SIZE)
    bottom = round((row + 1) * height / GRID_SIZE)
    return image.crop((left, top, right, bottom))


def retain_primary_components(cell: Image.Image) -> Image.Image:
    rgba = cell.copy()
    alpha = rgba.getchannel("A")
    width, height = rgba.size
    mask = bytearray(1 if value >= 12 else 0 for value in alpha.get_flattened_data())
    visited = bytearray(width * height)
    components: list[list[int]] = []
    for start in range(width * height):
        if not mask[start] or visited[start]:
            continue
        visited[start] = 1
        queue = deque([start])
        component: list[int] = []
        while queue:
            index = queue.popleft()
            component.append(index)
            x, y = index % width, index // width
            for neighbor in (index - 1 if x else -1, index + 1 if x + 1 < width else -1,
                             index - width if y else -1, index + width if y + 1 < height else -1):
                if neighbor >= 0 and mask[neighbor] and not visited[neighbor]:
                    visited[neighbor] = 1
                    queue.append(neighbor)
        components.append(component)

    if not components:
        return rgba
    minimum_area = max(24, round(max(map(len, components)) * 0.08))
    kept = bytearray(width * height)
    for component in components:
        if len(component) >= minimum_area:
            for index in component:
                kept[index] = 1
    pixels = rgba.load()
    for index, keep in enumerate(kept):
        if not keep:
            x, y = index % width, index // width
            red, green, blue, _ = pixels[x, y]
            pixels[x, y] = (red, green, blue, 0)
    return rgba


def normalize_icon(cell: Image.Image, max_size: int = ICON_MAX_SIZE, vertical_bias: int = -4) -> Image.Image:
    cell = retain_primary_components(cell)
    alpha = cell.getchannel("A")
    bounds = alpha.point(lambda value: 255 if value >= 12 else 0).getbbox()
    target = Image.new("RGBA", (CELL_SIZE, CELL_SIZE), (0, 0, 0, 0))
    if not bounds:
        return target
    icon = cell.crop(bounds)
    icon.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    offset = ((CELL_SIZE - icon.width) // 2, (CELL_SIZE - icon.height) // 2 + vertical_bias)
    target.alpha_composite(icon, offset)
    return target


def recolor_attribute_star(icon: Image.Image, hue: float) -> Image.Image:
    recolored = icon.copy()
    pixels = recolored.load()
    for y in range(recolored.height):
        for x in range(recolored.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0:
                continue
            _, saturation, value = colorsys.rgb_to_hsv(red / 255, green / 255, blue / 255)
            if saturation < 0.12:
                continue
            new_red, new_green, new_blue = colorsys.hsv_to_rgb(hue, saturation, value)
            pixels[x, y] = (round(new_red * 255), round(new_green * 255), round(new_blue * 255), alpha)
    return recolored


def validate_cells(cells: list[list[Image.Image]]) -> None:
    attribute_alpha = [cells[row][ATTRIBUTE_STAR_INDEX].getchannel("A").tobytes() for row in range(3)]
    if len(set(attribute_alpha)) != 1:
        raise ValueError("attribute stars must share one exact silhouette")
    for row_cells in cells:
        for icon in row_cells:
            bounds = icon.getchannel("A").getbbox()
            if not bounds:
                continue
            if bounds[0] < 18 or bounds[1] < 18 or bounds[2] > 110 or bounds[3] > 110:
                raise ValueError(f"icon escaped its 92px safe area: {bounds}")


def build_atlas(source_path: Path, output_path: Path) -> None:
    source = remove_connected_checker(Image.open(source_path))
    cells = [[normalize_icon(crop_grid_cell(source, column, row)) for column in range(GRID_SIZE)] for row in range(USED_ROWS)]
    strength_star = cells[0][ATTRIBUTE_STAR_INDEX]
    cells[1][ATTRIBUTE_STAR_INDEX] = recolor_attribute_star(strength_star, 1 / 3)
    cells[2][ATTRIBUTE_STAR_INDEX] = recolor_attribute_star(strength_star, 0.62)
    validate_cells(cells)

    atlas = Image.new("RGBA", (GRID_SIZE * CELL_SIZE, USED_ROWS * CELL_SIZE), (0, 0, 0, 0))
    for row, row_cells in enumerate(cells):
        for column, icon in enumerate(row_cells):
            atlas.alpha_composite(icon, (column * CELL_SIZE, row * CELL_SIZE))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(output_path, "WEBP", quality=86, method=6, exact=True)
    print(f"wrote {output_path} ({atlas.width}x{atlas.height}, {output_path.stat().st_size} bytes)")


def build_slot(source_path: Path, output_path: Path) -> None:
    source = remove_connected_checker(Image.open(source_path), include_center=True)
    slot = normalize_icon(source, SLOT_MAX_SIZE, -2)
    bounds = slot.getchannel("A").getbbox()
    if not bounds or bounds[3] > 112:
        raise ValueError(f"slot lacks the required bottom safe area: {bounds}")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    slot.save(output_path, "WEBP", quality=88, method=6, exact=True)
    print(f"wrote {output_path} ({slot.width}x{slot.height}, {output_path.stat().st_size} bytes)")


if __name__ == "__main__":
    if len(sys.argv) == 4 and sys.argv[1] == "slot":
        build_slot(Path(sys.argv[2]), Path(sys.argv[3]))
        raise SystemExit(0)
    if len(sys.argv) != 3:
        raise SystemExit("usage: build-passive-icon-atlas.py [slot] SOURCE.png OUTPUT.webp")
    build_atlas(Path(sys.argv[1]), Path(sys.argv[2]))
