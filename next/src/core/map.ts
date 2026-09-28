// Act map geometry: compile an authored preset into tiles, find routes, reveal fog.
// Pure functions of the preset; no game state, combat or rendering.
import { ACT_PRESETS } from '../data/act-maps.ts';
import type { ActMap, ActPreset, Cell, Room } from './types.ts';

const compiled = new Map<number, ActMap>();

function rotate([x0, y0]: [number, number], preset: ActPreset): Cell {
  let x = x0, y = y0, height = preset.height, width = preset.width;
  for (let turn = 0; turn < preset.rotation; turn++) {
    [x, y] = [height - 1 - y, x];
    [width, height] = [height, width];
  }
  return { x, y };
}

function carve(tiles: number[], preset: ActPreset, [cx, cy]: [number, number], radius = 0): void {
  for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
    const x = cx + dx, y = cy + dy;
    if (x <= 0 || y <= 0 || x >= preset.width - 1 || y >= preset.height - 1) throw new Error(`act terrain leaves its bounds: ${preset.id}`);
    tiles[y * preset.width + x] = 1;
  }
}

function corridor(tiles: number[], preset: ActPreset, points: [number, number][], radius: number): void {
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1], to = points[i];
    if (!from || !to) continue;
    const current: [number, number] = [from[0], from[1]];
    carve(tiles, preset, current, radius);
    for (const axis of [0, 1] as const) {
      while (current[axis] !== to[axis]) {
        current[axis] += Math.sign(to[axis] - current[axis]);
        carve(tiles, preset, current, radius);
      }
    }
  }
}

function roomCenter(preset: ActPreset, id: string): [number, number] {
  const room = preset.rooms.find(r => r[0] === id);
  if (!room) throw new Error(`${preset.id}: unknown room ${id}`);
  return [room[1], room[2]];
}

/** Same carving rules as the old game: rooms, then links, then the one-tile boss threshold. */
function carveFloors(preset: ActPreset): number[] {
  const tiles = new Array<number>(preset.width * preset.height).fill(0);
  for (const [, x, y, rx, ry] of preset.rooms) {
    for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) carve(tiles, preset, [x + dx, y + dy]);
  }
  for (const [from, to, bends = []] of preset.links) {
    corridor(tiles, preset, [roomCenter(preset, from), ...bends, roomCenter(preset, to)], preset.passage === 1 ? 0 : 1);
  }
  corridor(tiles, preset, [roomCenter(preset, preset.approach), preset.gate, roomCenter(preset, 'boss')], 0);
  return tiles;
}

export function actMap(act: number): ActMap {
  const cached = compiled.get(act);
  if (cached) return cached;
  const preset = ACT_PRESETS.find(p => p.act === act);
  if (!preset) throw new Error(`no map for act ${act}`);
  const turned = preset.rotation % 2 === 1;
  const columns = turned ? preset.height : preset.width, rows = turned ? preset.width : preset.height;
  const tiles = new Array<number>(columns * rows).fill(0);
  carveFloors(preset).forEach((value, i) => {
    const p = rotate([i % preset.width, Math.floor(i / preset.width)], preset);
    tiles[p.y * columns + p.x] = value;
  });
  const rooms: Room[] = preset.rooms.map(([id, x, y, rx, ry, role]) => ({
    id, role, ...rotate([x, y], preset), radiusX: turned ? ry : rx, radiusY: turned ? rx : ry
  }));
  const entry = rooms.find(r => r.role === 'entry'), boss = rooms.find(r => r.role === 'boss');
  if (!entry || !boss) throw new Error(`${preset.id}: needs an entry and a boss room`);
  const map: ActMap = { act, id: preset.id, biome: preset.biome, columns, rows, tiles, rooms, entry, boss, gate: rotate(preset.gate, preset) };
  compiled.set(act, map);
  return map;
}

export const tileIndex = (map: ActMap, c: Cell): number => c.y * map.columns + c.x;

export function isFloor(map: ActMap, c: Cell): boolean {
  return c.x >= 0 && c.y >= 0 && c.x < map.columns && c.y < map.rows && map.tiles[tileIndex(map, c)] === 1;
}

const STEPS: readonly Cell[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

/**
 * Shortest four-way route, excluding the start. Empty when unreachable or already there.
 * @param blocked row-major tile indices that cannot be entered (a sealed gate, occupied tiles).
 */
export function route(map: ActMap, from: Cell, to: Cell, blocked: ReadonlySet<number> = new Set()): Cell[] {
  const start = tileIndex(map, from), goal = tileIndex(map, to);
  if (start === goal || !isFloor(map, to) || blocked.has(goal)) return [];
  const parent = new Map<number, number>([[start, -1]]);
  const queue: number[] = [start];
  for (let head = 0; head < queue.length && !parent.has(goal); head++) {
    const current = queue[head]!;
    const cx = current % map.columns, cy = Math.floor(current / map.columns);
    for (const s of STEPS) {
      const next = { x: cx + s.x, y: cy + s.y }, id = tileIndex(map, next);
      if (!isFloor(map, next) || parent.has(id) || blocked.has(id)) continue;
      parent.set(id, current);
      queue.push(id);
    }
  }
  if (!parent.has(goal)) return [];
  const path: Cell[] = [];
  for (let at = goal; at !== start; at = parent.get(at)!) path.push({ x: at % map.columns, y: Math.floor(at / map.columns) });
  return path.reverse();
}

/** Floor tiles within `radius` steps through floor, plus the walls bordering them. */
export function visibleTiles(map: ActMap, from: Cell, radius: number): number[] {
  const seen = new Set<number>();
  const queue: (Cell & { d: number })[] = [{ ...from, d: 0 }];
  for (let head = 0; head < queue.length; head++) {
    const c = queue[head]!;
    const id = tileIndex(map, c);
    if (seen.has(id)) continue;
    seen.add(id);
    if (c.d >= radius || !isFloor(map, c)) continue;
    for (const s of STEPS) {
      const n = { x: c.x + s.x, y: c.y + s.y };
      if (n.x >= 0 && n.y >= 0 && n.x < map.columns && n.y < map.rows) queue.push({ ...n, d: c.d + 1 });
    }
  }
  return [...seen];
}

/** Chebyshev distance: attack reach counts diagonals as one step. */
export const reach = (a: Cell, b: Cell): number => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/** Four-way step count from `from` to every reachable floor tile, keyed by tile index. */
export function distances(map: ActMap, from: Cell, blocked: ReadonlySet<number> = new Set()): Map<number, number> {
  const start = tileIndex(map, from);
  const dist = new Map<number, number>([[start, 0]]);
  const queue: number[] = [start];
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]!;
    const cx = current % map.columns, cy = Math.floor(current / map.columns);
    for (const s of STEPS) {
      const next = { x: cx + s.x, y: cy + s.y }, id = tileIndex(map, next);
      if (!isFloor(map, next) || dist.has(id) || blocked.has(id)) continue;
      dist.set(id, dist.get(current)! + 1);
      queue.push(id);
    }
  }
  return dist;
}

/** True when the straight line between two tiles crosses only floor (Bresenham, ends included). */
export function lineOfSight(map: ActMap, a: Cell, b: Cell, blocked: ReadonlySet<number> = new Set()): boolean {
  let x = a.x, y = a.y;
  const dx = Math.abs(b.x - a.x), dy = -Math.abs(b.y - a.y), sx = Math.sign(b.x - a.x), sy = Math.sign(b.y - a.y);
  for (let err = dx + dy; ; ) {
    if (!isFloor(map, { x, y }) || blocked.has(y * map.columns + x)) return false;
    if (x === b.x && y === b.y) return true;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}
