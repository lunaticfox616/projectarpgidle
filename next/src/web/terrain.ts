// Act terrain drawn in code at the characters' pixel density (1 canvas pixel = 1 art pixel, TILE per
// tile). Floors are carved with rounded corners; a distance field blends the biome's ground, worn
// path and (around elite and boss rooms) paving with ordered dithering; walls get a textured top and
// a lit front face; suspended biomes become platforms over a void. Props line the walls.
import { isFloor } from '../core/map.ts';
import { bayer, hash, outlined, sprite, type Sprite } from './pixel.ts';
import { lookFor, type Look, type PropKind } from './look.ts';
import { propSprite } from './props.ts';
import type { ActMap, Cell } from '../core/types.ts';

/** Art pixels per tile (the hero is about 21 tall). */
export const TILE = 16;
const FACE = 6;

/** A prop standing on the map: its base centre in art pixels. */
export interface Prop { kind: PropKind; x: number; y: number; sprite: Sprite; tile: number }

export interface Terrain { ground: HTMLCanvasElement; props: Prop[]; look: Look }

const yieldFrame = () => new Promise(resolve => setTimeout(resolve, 0));

/** 8-neighbour floor mask with corners kept only where both sides are floor. */
function maskAt(map: ActMap, x: number, y: number): number {
  const around = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]] as const;
  let mask = around.reduce((m, [dx, dy], i) => (isFloor(map, { x: x + dx, y: y + dy }) ? m | (1 << i) : m), 0);
  for (const [corner, a, b] of [[2, 1, 4], [8, 4, 16], [32, 16, 64], [128, 64, 1]] as const) if (!(mask & a) || !(mask & b)) mask &= ~corner;
  return mask;
}

/** Whether pixel (x, y) of a floor tile is floor, rounding outer corners (old game's rule at 16px). */
function inside(mask: number, x: number, y: number): boolean {
  const left = x < 8, top = y < 8, dx = left ? x : 15 - x, dy = top ? y : 15 - y;
  const h = !!(mask & (left ? 64 : 4)), v = !!(mask & (top ? 1 : 16));
  if (!h && !v) return dx >= 3 && dy >= 3 && dx + dy >= 7;
  if (!h) return dx >= 3;
  if (!v) return dy >= 3;
  const bit = top ? (left ? 128 : 2) : (left ? 32 : 8);
  return !!(mask & bit) || dx + dy >= 3;
}

/** Signed distance to the floor edge in art pixels: positive inside, negative outside. */
function distances(map: ActMap): { d: Float32Array; floor: Uint8Array; w: number; h: number } {
  const w = map.columns * TILE, h = map.rows * TILE, floor = new Uint8Array(w * h), d = new Float32Array(w * h).fill(64);
  for (let ty = 0; ty < map.rows; ty++) for (let tx = 0; tx < map.columns; tx++) {
    if (!isFloor(map, { x: tx, y: ty })) continue;
    const mask = maskAt(map, tx, ty);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) floor[(ty * TILE + y) * w + tx * TILE + x] = inside(mask, x, y) ? 1 : 0;
  }
  for (let i = 0; i < d.length; i++) {
    const x = i % w, v = floor[i];
    if ((x > 0 && floor[i - 1] !== v) || (i >= w && floor[i - w] !== v) || (x < w - 1 && floor[i + 1] !== v) || (i + w < d.length && floor[i + w] !== v)) d[i] = 0;
  }
  for (const step of [1, -1]) {
    for (let i = step > 0 ? 0 : w * h - 1; i !== (step > 0 ? w * h : -1); i += step) {
      const x = i % w, prior = i - step * w;
      if (x - step >= 0 && x - step < w) d[i] = Math.min(d[i]!, d[i - step]! + 1);
      if (prior < 0 || prior >= d.length) continue;
      d[i] = Math.min(d[i]!, d[prior]! + 1);
      if (x > 0) d[i] = Math.min(d[i]!, d[prior - 1]! + Math.SQRT2);
      if (x < w - 1) d[i] = Math.min(d[i]!, d[prior + 1]! + Math.SQRT2);
    }
  }
  for (let i = 0; i < d.length; i++) if (!floor[i]) d[i] = -d[i]! - 0.5;
  return { d, floor, w, h };
}

/** Smooth value noise in [0, 1): bilinear over a hashed lattice. */
function noise(x: number, y: number, scale: number, seed: number): number {
  const gx = x / scale, gy = y / scale, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
  const s = (t: number) => t * t * (3 - 2 * t), a = hash(x0, y0, seed), b = hash(x0 + 1, y0, seed), c = hash(x0, y0 + 1, seed), e = hash(x0 + 1, y0 + 1, seed);
  return (a + (b - a) * s(fx)) * (1 - s(fy)) + (c + (e - c) * s(fx)) * s(fy);
}

/** Pick a ramp colour for a 0..1 lightness, dithered between neighbouring steps. */
function shade(ramp: string[], light: number, x: number, y: number): string {
  const v = Math.max(0, Math.min(0.999, light)) * ramp.length;
  const i = Math.floor(v), frac = v - i;
  return ramp[Math.min(ramp.length - 1, frac > bayer(x, y) ? i + 1 : i)] ?? ramp[0]!;
}

interface Painter { map: ActMap; look: Look; d: Float32Array; w: number; h: number; ruins: [number, number, number, number][]; roomOf: Int16Array }

/** How much of a pixel is old paving (0..1): ragged patches around elite and boss rooms. */
function stone(p: Painter, x: number, y: number): number {
  let coverage = 0;
  const erosion = (noise(x, y, 9, 11) - 0.5) * 0.7 + (noise(x, y, 3, 12) - 0.5) * 0.25;
  for (const [cx, cy, rx, ry] of p.ruins) {
    const r = Math.hypot((x / TILE - cx) / rx, (y / TILE - cy) / ry);
    coverage = Math.max(coverage, Math.max(0, Math.min(1, (1 - r + erosion) * 3)));
  }
  return coverage;
}

/** Staggered flagstones of 9×7 with bevelled edges; some are cracked or sunk and let moss through. */
function paving(p: Painter, x: number, y: number): string | null {
  const row = Math.floor(y / 7), off = (row % 2) * 4, col = Math.floor((x + off) / 9), lx = (x + off) % 9, ly = y % 7;
  const stoneSeed = hash(col, row, 3);
  if (stoneSeed < 0.12) return null;
  if (lx === 0 || ly === 0) return hash(x, y, 14) < 0.35 ? p.look.path[0]! : p.look.mortar;
  const light = 0.35 + stoneSeed * 0.35 + (lx === 1 || ly === 1 ? 0.2 : 0) - (lx === 8 || ly === 6 ? 0.18 : 0) + (noise(x, y, 4, 15) - 0.5) * 0.2;
  if (hash(x, y, 9) < 0.015) return p.look.mortar;
  return shade(p.look.paving, light, x, y);
}
function groundPixel(p: Painter, x: number, y: number, edge: number): string {
  const { look } = p, n = noise(x, y, 7, 1) * 0.6 + noise(x, y, 3, 2) * 0.4;
  const worn = Math.max(0, Math.min(1, (edge + 2 + (noise(x, y, 5, 4) - 0.5) * 6) / 12));
  const stoneShare = stone(p, x, y) * Math.min(1, edge / 3);
  const slab = stoneShare > bayer(x, y) * 0.9 + 0.05 ? paving(p, x, y) : null;
  if (slab) return slab;
  if (worn > bayer(x + 1, y + 2)) {
    if (hash(x, y, 5) < 0.025) return look.path[2]!;
    return shade(look.path, 0.25 + n * 0.55, x, y);
  }
  const tuft = hash(x, y, 6);
  if (tuft < 0.03) return look.ground[3]!;
  if (tuft > 0.985) return look.ground[0]!;
  return shade(look.ground, 0.2 + n * 0.6, x, y);
}

/** Wall pixel: the lit front face just above a floor edge, else the textured top. */
function wallPixel(p: Painter, x: number, y: number, edge: number): string {
  const { look, d, w, h } = p;
  let below = 0;
  for (let k = 1; k <= FACE && y + k < h; k++) if (d[(y + k) * w + x]! >= 0) { below = k; break; }
  if (below) {
    if (below === FACE) return look.wallTop[3]!;
    const streak = hash(x, 0, 8) * 0.3;
    return shade(look.wallFace, 0.85 - below / FACE + streak, x, y);
  }
  if (edge > -2.5 && hash(x, y, 12) < 0.6) return look.ground[1]!;
  const n = noise(x, y, 5, 3) * 0.65 + noise(x, y, 2, 7) * 0.35;
  return shade(look.wallTop, n * 1.05 - 0.05, x, y);
}

/** Suspended biomes: planked or stone platforms over a starlit drop, with a face under each edge. */
function suspendedPixel(p: Painter, x: number, y: number, edge: number): string {
  const { look, d, w } = p, voidRamp = look.void!;
  if (edge >= 0) {
    const room = p.roomOf[Math.floor(y / TILE) * p.map.columns + Math.floor(x / TILE)]! >= 0;
    if (!room) return (x % 4 === 0 || hash(Math.floor(x / 4), y, 4) < 0.04) ? look.path[0]! : shade(look.path, 0.35 + noise(x, y, 4, 1) * 0.4, x, y);
    if (edge < 1.5) return look.ground[3]!;
    if (y % 4 === 0) return look.ground[0]!;
    return shade(look.ground, 0.3 + noise(x, y, 6, 2) * 0.45 + ((x + Math.floor(y / 4) * 7) % 13 === 0 ? -0.3 : 0), x, y);
  }
  for (let k = 1; k <= 5; k++) if (y - k >= 0 && d[(y - k) * w + x]! >= 0) return shade(look.wallFace, 0.9 - k / 6, x, y);
  const star = hash(x, y, 13);
  if (star > 0.996) return look.accent[1]!;
  return shade(voidRamp, noise(x, y, 18, 5) * 0.9, x, y);
}

function roomIndex(map: ActMap): Int16Array {
  const out = new Int16Array(map.columns * map.rows).fill(-1);
  map.rooms.forEach((r, i) => {
    for (let y = r.y - r.radiusY; y <= r.y + r.radiusY; y++) for (let x = r.x - r.radiusX; x <= r.x + r.radiusX; x++) {
      if (x >= 0 && y >= 0 && x < map.columns && y < map.rows) out[y * map.columns + x] = i;
    }
  });
  return out;
}

function wallProps(map: ActMap, look: Look): Prop[] {
  if (!look.wallProps.length) return [];
  const props: Prop[] = [];
  for (let y = 1; y < map.rows - 1; y += 2) for (let x = 1; x < map.columns - 1; x += 2) {
    const jx = x + (hash(x, y, 21) < 0.5 ? 0 : 1), jy = y;
    if (isFloor(map, { x: jx, y: jy })) continue;
    if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isFloor(map, { x: jx + dx!, y: jy + dy! }))) continue;
    if (hash(jx, jy, 22) < 0.3) continue;
    const kind = look.wallProps[Math.floor(hash(jx, jy, 23) * look.wallProps.length)]!;
    props.push({ kind, x: (jx + 0.5) * TILE, y: (jy + 1) * TILE - 1, sprite: propSprite(kind, look, jx * 7 + jy), tile: jy * map.columns + jx });
  }
  return props;
}

/** Small floor props, baked flat into the ground away from room centres. */
function floorDecor(map: ActMap, look: Look, roomOf: Int16Array, ctx: CanvasRenderingContext2D): void {
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.columns; x++) {
    const room = map.rooms[roomOf[y * map.columns + x]!];
    if (!room || !isFloor(map, { x, y }) || hash(x, y, 31) > 0.16) continue;
    if (Math.abs(x - room.x) < room.radiusX && Math.abs(y - room.y) < room.radiusY && hash(x, y, 32) < 0.7) continue;
    const kind = look.floorProps[Math.floor(hash(x, y, 33) * look.floorProps.length)]!;
    const s = propSprite(kind, look, x * 13 + y * 5), px = x * TILE + Math.floor(hash(x, y, 34) * (TILE - s.width)), py = y * TILE + Math.floor(hash(x, y, 35) * (TILE - s.height));
    ctx.drawImage(s.canvas, Math.max(x * TILE, px), Math.max(y * TILE, py));
  }
}

/** Bake the act's ground and plan its props. Yields between rows so the page keeps painting. */
export async function bakeTerrain(map: ActMap): Promise<Terrain> {
  const look = lookFor(map.biome), { d, w, h } = distances(map);
  const ruins = map.rooms.filter(r => r.role === 'boss' || r.role === 'elite').map(r => [r.x + 0.5, r.y + 0.5, r.radiusX + 0.6, r.radiusY + 0.6] as [number, number, number, number]);
  const p: Painter = { map, look, d, w, h, ruins, roomOf: roomIndex(map) };
  const ground = document.createElement('canvas');
  ground.width = w;
  ground.height = h;
  const ctx = ground.getContext('2d')!, image = ctx.createImageData(w, h), rgb = new Map<string, number[]>();
  const put = (i: number, color: string) => {
    let c = rgb.get(color);
    if (!c) rgb.set(color, (c = [1, 3, 5].map(k => parseInt(color.slice(k, k + 2), 16))));
    image.data.set([c[0]!, c[1]!, c[2]!, 255], i * 4);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x, edge = d[i]!;
      put(i, look.void ? suspendedPixel(p, x, y, edge) : edge >= 0 ? groundPixel(p, x, y, edge) : wallPixel(p, x, y, edge));
    }
    if (y % 96 === 0) await yieldFrame();
  }
  ctx.putImageData(image, 0, 0);
  floorDecor(map, look, p.roomOf, ctx);
  return { ground, props: wallProps(map, look), look };
}

export function drawProp(ctx: CanvasRenderingContext2D, prop: Prop): void {
  ctx.drawImage(prop.sprite.canvas, Math.round(prop.x - prop.sprite.width / 2), Math.round(prop.y - prop.sprite.height));
}

const ARCH = `
  ....cCCCCCCCc....
  ..cCCccccccCCc...
  .cCcc.......ccC..
  .Cc...........cC.
  cCc...........cCc
  cC.............Cc
  cC.............Cc
  cC.............Cc
  dC.............Cd
  dC.............Cd
  dC.............Cd
  dc.............cd
  dc.............cd
  dc.............cd
  dd.............dd
  dd.............dd
  ddd...........ddd`;

/** The boss threshold: a stone arch, filled with a pulsing sealed door until the elites fall. */
export function drawGate(ctx: CanvasRenderingContext2D, look: Look, gate: Cell, sealed: boolean, time: number): void {
  const arch = outlined(sprite(ARCH, { c: look.paving[1]!, C: look.paving[2]!, d: look.paving[0]! }, `arch:${look.paving.join()}`), '#0b0806', `oarch:${look.paving.join()}`);
  const x = Math.round((gate.x + 0.5) * TILE - arch.width / 2), y = Math.round((gate.y + 1) * TILE - arch.height + 1);
  if (sealed) {
    const pulse = 0.55 + 0.45 * Math.sin(time / 280);
    ctx.fillStyle = look.wallFace[0]!;
    ctx.fillRect(x + 3, y + 5, arch.width - 6, arch.height - 6);
    ctx.fillStyle = `rgba(255, 210, 120, ${0.35 + 0.5 * pulse})`;
    const cx = x + Math.floor(arch.width / 2), cy = y + 11;
    for (const [dx, dy] of [[0, -3], [0, -2], [0, -1], [0, 0], [0, 1], [0, 2], [0, 3], [-2, 0], [-1, 0], [1, 0], [2, 0], [-2, -2], [2, -2], [-2, 2], [2, 2]]) ctx.fillRect(cx + dx!, cy + dy!, 1, 1);
  }
  ctx.drawImage(arch.canvas, x, y);
}
