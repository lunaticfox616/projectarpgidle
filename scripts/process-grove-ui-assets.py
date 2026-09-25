#!/usr/bin/env python3
"""Build the grove UI kit, HP orb frame and stump board into game-ready @2x PNGs.

Source art lives in assets/ui/grove/source/ as hand-drawn 1x pixel art with a
binary alpha channel. Outputs are nearest-neighbour ×2 upscales so the pixel grid
stays crisp; smooth resampling would blur the art against the pixel battlefield.

The stump board source has uneven 5×5 cells (27-29px, 30-32px pitch). The grid
is redrawn with one cell size and one divider width so DOM cells can be laid over
it with a single pitch. manifest.json records every rectangle in output pixels.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter, deque
from pathlib import Path

from PIL import Image

SCALE = 2
GRID_SIZE = 5
DIVIDER_EDGE = (44, 32, 22, 255)

# (name, 1x source rect x/y/w/h, border-image slice top/right/bottom/left or None, role)
KIT_PIECES = [
    ('panel-large', (16, 16, 481, 151), (44, 44, 44, 44), '대화 창·알림 카드·보스 이름판'),
    ('button-plate', (16, 190, 151, 45), (12, 12, 12, 12), '주 버튼·메뉴 탭'),
    ('slot-socket', (16, 258, 57, 57), None, '스킬·젬·장비 칸(고정 크기)'),
    ('field-plate', (304, 266, 193, 37), (10, 14, 10, 14), '검색창·선택 목록·이름 라벨'),
    ('label-knot', (16, 330, 111, 41), None, '장식 머리판(고정 크기)'),
    ('icon-slot', (266, 330, 45, 45), (14, 14, 14, 14), '창 버튼·작은 아이콘 칸'),
    ('tab-plate', (326, 330, 171, 45), (12, 44, 12, 44), '넓은 버튼·목표 머리판·하위 탭'),
    ('socket-round', (8, 391, 89, 91), None, '원형 버튼(지도 등, 고정 크기)'),
    ('gauge-frame', (120, 422, 281, 29), (9, 92, 9, 92), '경험치·진행도 게이지 틀'),
]


def upscale(image: Image.Image) -> Image.Image:
    return image.resize((image.width * SCALE, image.height * SCALE), Image.Resampling.NEAREST)


def scaled(values):
    return [value * SCALE for value in values]


def find_enclosed_holes(image: Image.Image) -> list[tuple[int, int, int, int]]:
    """Return x/y/w/h of transparent regions that do not touch the image edge."""
    width, height = image.size
    alpha = image.getchannel('A').load()
    seen = [[False] * width for _ in range(height)]
    holes = []
    for start_y in range(height):
        for start_x in range(width):
            if seen[start_y][start_x] or alpha[start_x, start_y]:
                continue
            queue = deque([(start_x, start_y)])
            seen[start_y][start_x] = True
            xs, ys, touches_edge = [], [], False
            while queue:
                x, y = queue.popleft()
                xs.append(x)
                ys.append(y)
                touches_edge |= x in (0, width - 1) or y in (0, height - 1)
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < width and 0 <= ny < height and not seen[ny][nx] and not alpha[nx, ny]:
                        seen[ny][nx] = True
                        queue.append((nx, ny))
            if not touches_edge and len(xs) > 50:
                holes.append((min(xs), min(ys), max(xs) - min(xs) + 1, max(ys) - min(ys) + 1))
    return holes


def solve_uniform_grid(span: int, old_gaps: list[int]) -> tuple[int, int]:
    """Pick one cell size and divider width that exactly fill the original span."""
    for divider in range(max(old_gaps), 0, -1):
        cell, remainder = divmod(span - divider * (GRID_SIZE - 1), GRID_SIZE)
        if remainder == 0 and cell > divider:
            return cell, divider
    raise ValueError(f'Cannot split a {span}px grid into {GRID_SIZE} equal cells')


def axis_layout(starts: list[int], ends: list[int]):
    """Old divider ranges between the cell columns (or rows) along one axis."""
    return [(ends[i] + 1, starts[i + 1] - 1) for i in range(GRID_SIZE - 1)]


def brass_colors(pixels, old_range, fixed: int, vertical: bool):
    """Brightest two non-edge colours across an old divider at one row/column."""
    colors = []
    for offset in range(old_range[0], old_range[1] + 1):
        pixel = pixels[fixed, offset] if not vertical else pixels[offset, fixed]
        if pixel[3] and pixel[:3] != DIVIDER_EDGE[:3]:
            colors.append(pixel)
    if not colors:
        return None
    colors.sort(key=lambda color: sum(color[:3]))
    return colors[-2] if len(colors) > 1 else colors[-1], colors[-1]


def draw_divider(pixels, source, start: int, width: int, old_range, span, vertical: bool):
    last = None
    for along in range(span[0], span[1] + 1):
        found = brass_colors(source, old_range, along, vertical)
        last = found or last
        if last is None:
            raise ValueError(f'Divider {old_range} has no brass pixels near {along}')
        profile = [DIVIDER_EDGE, *([last[0]] * (width - 3)), last[1], DIVIDER_EDGE]
        for offset, color in enumerate(profile):
            if vertical:
                pixels[start + offset, along] = color
            else:
                pixels[along, start + offset] = color


def regularize_stump_board(source: Image.Image):
    holes = find_enclosed_holes(source)
    if len(holes) != GRID_SIZE * GRID_SIZE:
        raise ValueError(f'Stump board must have {GRID_SIZE * GRID_SIZE} cells, found {len(holes)}')
    # Cells in one column can start a pixel apart; cluster by rank instead of exact value.
    by_col = sorted(holes, key=lambda h: h[0])
    by_row = sorted(holes, key=lambda h: h[1])
    cols = [by_col[i * GRID_SIZE:(i + 1) * GRID_SIZE] for i in range(GRID_SIZE)]
    rows = [by_row[i * GRID_SIZE:(i + 1) * GRID_SIZE] for i in range(GRID_SIZE)]
    col_starts = [min(h[0] for h in col) for col in cols]
    col_ends = [max(h[0] + h[2] - 1 for h in col) for col in cols]
    row_starts = [min(h[1] for h in row) for row in rows]
    row_ends = [max(h[1] + h[3] - 1 for h in row) for row in rows]
    x0, x1, y0, y1 = col_starts[0], col_ends[-1], row_starts[0], row_ends[-1]
    if x1 - x0 != y1 - y0:
        raise ValueError('Stump board grid area must be square')
    old_cols, old_rows = axis_layout(col_starts, col_ends), axis_layout(row_starts, row_ends)
    gaps = [end - start + 1 for start, end in old_cols + old_rows]
    cell, divider = solve_uniform_grid(x1 - x0 + 1, gaps)
    pitch = cell + divider

    board = source.copy()
    pixels = board.load()
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            pixels[x, y] = (0, 0, 0, 0)
    reference = source.load()
    for index in range(GRID_SIZE - 1):
        draw_divider(pixels, reference, x0 + index * pitch + cell, divider, old_cols[index], (y0, y1), vertical=True)
    for index in range(GRID_SIZE - 1):
        draw_divider(pixels, reference, y0 + index * pitch + cell, divider, old_rows[index], (x0, x1), vertical=False)
    # The source cells have one opaque pixel in each corner; keep that rounded look.
    for row in range(GRID_SIZE):
        for col in range(GRID_SIZE):
            left, top = x0 + col * pitch, y0 + row * pitch
            for cx, cy in ((left, top), (left + cell - 1, top), (left, top + cell - 1), (left + cell - 1, top + cell - 1)):
                pixels[cx, cy] = DIVIDER_EDGE
    geometry = {'origin': [x0, y0], 'cell': cell, 'divider': divider, 'pitch': pitch, 'columns': GRID_SIZE, 'rows': GRID_SIZE}
    before = {'cellWidths': sorted(Counter(h[2] for h in holes)), 'dividerWidths': sorted(set(gaps))}
    return board, geometry, before


def orb_hole(frame: Image.Image) -> dict:
    holes = find_enclosed_holes(frame)
    if len(holes) != 1:
        raise ValueError(f'HP orb frame must have one transparent centre, found {len(holes)}')
    x, y, w, h = holes[0]
    return {'x': x, 'y': y, 'width': w, 'height': h}


def save(image: Image.Image, path: Path) -> list[int]:
    path.parent.mkdir(parents=True, exist_ok=True)
    output = upscale(image)
    output.save(path, optimize=True)
    return [output.width, output.height]


def build(source_dir: Path, output_dir: Path) -> dict:
    manifest = {'scale': SCALE, 'note': '모든 좌표·크기는 출력(@2x) 픽셀 기준입니다.', 'kit': {}, 'orb': {}, 'stumpBoard': {}}
    kit = Image.open(source_dir / 'ui-kit-v1.png').convert('RGBA')
    for name, (x, y, w, h), slice_1x, role in KIT_PIECES:
        piece = kit.crop((x, y, x + w, y + h))
        if piece.getchannel('A').getbbox() != (0, 0, w, h):
            raise ValueError(f'{name} crop does not match its visible bounds')
        file = f'{name}-v1.png'
        manifest['kit'][name] = {
            'file': file, 'size': save(piece, output_dir / file), 'role': role,
            'slice': scaled(slice_1x) if slice_1x else None,
        }
    orb = Image.open(source_dir / 'hp-orb-frame-v1.png').convert('RGBA')
    hole = orb_hole(orb)
    manifest['orb'] = {
        'file': 'hp-orb-frame-v1.png', 'size': save(orb, output_dir / 'hp-orb-frame-v1.png'),
        'hole': {key: value * SCALE for key, value in hole.items()},
    }
    board, geometry, before = regularize_stump_board(Image.open(source_dir / 'stump-board-v1.png').convert('RGBA'))
    manifest['stumpBoard'] = {
        'file': 'stump-board-v1.png', 'size': save(board, output_dir / 'stump-board-v1.png'),
        'grid': {**geometry, 'origin': scaled(geometry['origin']), 'cell': geometry['cell'] * SCALE,
                 'divider': geometry['divider'] * SCALE, 'pitch': geometry['pitch'] * SCALE},
        'sourceBeforeRegularize': before,
    }
    (output_dir / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return manifest


def main():
    root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=root / 'assets/ui/grove/source')
    parser.add_argument('--output', type=Path, default=root / 'assets/ui/grove')
    args = parser.parse_args()
    manifest = build(args.source, args.output)
    grid = manifest['stumpBoard']['grid']
    print(f"grove UI: {len(manifest['kit'])} kit pieces, orb, stump board "
          f"(cell {grid['cell']}px, divider {grid['divider']}px, pitch {grid['pitch']}px)")


if __name__ == '__main__':
    main()
