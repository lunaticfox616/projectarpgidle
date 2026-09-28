// Act terrain, ported from the old game's canvas-exploration-art.js: floors are carved with rounded
// corners, a distance field blends dense growth → meadow → dirt trail (with paving around elite and
// boss rooms), suspended biomes become platforms over a void, and prop art (trees, ruins, roots)
// lines the walls. Pure presentation: reads the act map, never game state.
import { ACT_ART } from '../data/act-art.ts';
import { isFloor } from '../core/map.ts';
import { loadImage } from './art.ts';
import { OLD_ASSETS } from './art-paths.ts';
import type { ActArtProfile } from '../data/act-art-profile.ts';
import type { ActMap } from '../core/types.ts';

/** Art pixels per tile in the world (the hero is about 21 tall). */
export const TILE = 16;
/** Baked terrain pixels per tile, as in the old game. */
export const BAKE = 32;

/** Biomes without their own art borrow the closest one. */
const BORROW: Record<string, string> = { veil: 'ruins', canopy: 'aerial', crown: 'sanctum' };
export const profileFor = (biome: string): ActArtProfile => ACT_ART[biome] ?? ACT_ART[BORROW[biome] ?? 'root'] ?? ACT_ART.root!;

export interface Kit {
  profile: ActArtProfile;
  props: HTMLImageElement;
  /** Four material quadrants (paving, path, growth, ground) as 128px tiles. */
  quadrants: HTMLCanvasElement[];
}

/** [prop index, x in tiles, y (base) in tiles, width in tiles] */
export type Placement = [number, number, number, number];

export interface Terrain { ground: HTMLCanvasElement; kit: Kit; gateKit: Kit; scenery: Placement[] }

const yieldFrame = () => new Promise(resolve => setTimeout(resolve, 0));

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

const kits = new Map<ActArtProfile, Promise<Kit>>();

/** Images are only ever drawn, never read back, so this also works from file:// (tainted canvases). */
function loadKit(profile: ActArtProfile): Promise<Kit> {
  let pending = kits.get(profile);
  if (!pending) {
    pending = (async () => {
      const path = (p: string) => OLD_ASSETS + p.replace(/^assets\//, '');
      const [material, props] = await Promise.all([loadImage(path(profile.material)), loadImage(path(profile.props))]);
      if (!material || !props) throw new Error(`terrain: art for ${profile.material} did not load`);
      const half = material.width / 2;
      const quadrants = [0, 1, 2, 3].map(q => {
        const c = canvas(128, 128), ctx = c.getContext('2d')!;
        ctx.drawImage(material, (q % 2) * half, Math.floor(q / 2) * half, half, half, 0, 0, 128, 128);
        return c;
      });
      return { profile, props, quadrants };
    })();
    kits.set(profile, pending);
  }
  return pending;
}

/** 8-neighbour floor mask with corners kept only where both sides are floor. */
function maskAt(map: ActMap, x: number, y: number): number {
  const around = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]] as const;
  let mask = around.reduce((m, [dx, dy], i) => (isFloor(map, { x: x + dx, y: y + dy }) ? m | (1 << i) : m), 0);
  for (const [corner, a, b] of [[2, 1, 4], [8, 4, 16], [32, 16, 64], [128, 64, 1]] as const) if (!(mask & a) || !(mask & b)) mask &= ~corner;
  return mask;
}

/** Whether a pixel of a floor tile is floor, rounding outer corners (tile-local x, y in 0..31). */
function inside(mask: number, x: number, y: number): boolean {
  const left = x < 16, top = y < 16, dx = left ? x : 31 - x, dy = top ? y : 31 - y;
  const h = !!(mask & (left ? 64 : 4)), v = !!(mask & (top ? 1 : 16));
  if (!h && !v) return dx >= 5 && dy >= 5 && dx + dy >= 14;
  if (!h) return dx >= 5;
  if (!v) return dy >= 5;
  const bit = top ? (left ? 128 : 2) : (left ? 32 : 8);
  return !!(mask & bit) || dx + dy >= 5;
}

/** Signed distance to the floor edge in pixels: positive inside, negative outside. */
async function groundDistances(map: ActMap): Promise<Float32Array> {
  const w = map.columns * BAKE, h = map.rows * BAKE, occupied = new Uint8Array(w * h), distance = new Float32Array(w * h).fill(32);
  for (let ty = 0; ty < map.rows; ty++) {
    for (let tx = 0; tx < map.columns; tx++) {
      if (!isFloor(map, { x: tx, y: ty })) continue;
      const mask = maskAt(map, tx, ty);
      for (let y = 0; y < BAKE; y++) for (let x = 0; x < BAKE; x++) occupied[(ty * BAKE + y) * w + tx * BAKE + x] = inside(mask, x, y) ? 1 : 0;
    }
    if (ty % 8 === 0) await yieldFrame();
  }
  for (let i = 0; i < distance.length; i++) {
    const x = i % w, v = occupied[i];
    if ((x > 0 && occupied[i - 1] !== v) || (i >= w && occupied[i - w] !== v) || (x < w - 1 && occupied[i + 1] !== v) || (i + w < distance.length && occupied[i + w] !== v)) distance[i] = 0;
  }
  for (const step of [1, -1]) {
    for (let i = step > 0 ? 0 : w * h - 1; i !== (step > 0 ? w * h : -1); i += step) {
      const x = i % w, prior = i - step * w;
      if (x - step >= 0 && x - step < w) distance[i] = Math.min(distance[i]!, distance[i - step]! + 1);
      if (prior < 0 || prior >= distance.length) continue;
      distance[i] = Math.min(distance[i]!, distance[prior]! + 1);
      if (x > 0) distance[i] = Math.min(distance[i]!, distance[prior - 1]! + Math.SQRT2);
      if (x < w - 1) distance[i] = Math.min(distance[i]!, distance[prior + 1]! + Math.SQRT2);
    }
    await yieldFrame();
  }
  for (let i = 0; i < distance.length; i++) if (!occupied[i]) distance[i] = -distance[i]! - 0.5;
  return distance;
}

/** Paving strength around elite and boss rooms, with an eroded rim. */
function stoneCoverage(ruins: [number, number, number, number][], x: number, y: number): number {
  let coverage = 0;
  for (const [cx, cy, rx, ry] of ruins) {
    const radius = Math.hypot((x - cx) / rx, (y - cy) / ry), erosion = 0.08 * Math.sin(x * 2.7 + y * 0.8) + 0.06 * Math.sin(y * 3.1 - x);
    coverage = Math.max(coverage, Math.max(0, Math.min(1, (1 - radius + erosion) * 4)));
  }
  return coverage;
}

/** A texture filling the whole map, kept only where `mask` is opaque, tinted by `shade` (multiply). */
function maskedLayer(size: [number, number], texture: HTMLCanvasElement, mask: HTMLCanvasElement, shade?: string): HTMLCanvasElement {
  const layer = canvas(size[0], size[1]), ctx = layer.getContext('2d')!;
  ctx.fillStyle = ctx.createPattern(texture, 'repeat')!;
  ctx.fillRect(0, 0, size[0], size[1]);
  if (shade) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, size[0], size[1]);
  }
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(mask, 0, 0);
  return layer;
}

/** Alpha masks computed per pixel from our own data; one canvas per mask. */
async function buildMasks(w: number, h: number, count: number, alphaAt: (x: number, y: number, out: number[]) => void): Promise<HTMLCanvasElement[]> {
  const images = Array.from({ length: count }, () => new ImageData(w, h)), values = new Array<number>(count).fill(0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      alphaAt(x, y, values);
      for (let m = 0; m < count; m++) images[m]!.data[(y * w + x) * 4 + 3] = values[m]! * 255;
    }
    if (y % 64 === 0) await yieldFrame();
  }
  return images.map(image => {
    const c = canvas(w, h);
    c.getContext('2d')!.putImageData(image, 0, 0);
    return c;
  });
}

/** Growth → meadow → dirt trail → paving, blended by distance to the floor edge (old game's formula). */
async function openGround(map: ActMap, kit: Kit, distance: Float32Array): Promise<HTMLCanvasElement> {
  const w = map.columns * BAKE, h = map.rows * BAKE;
  const ruins = map.rooms.filter(r => r.role === 'boss' || r.role === 'elite').map(r => [r.x + 0.5, r.y + 0.5, r.radiusX + 1, r.radiusY + 1] as [number, number, number, number]);
  const paving = kit.profile.paving ?? 0;
  const [meadowMask, dirtMask, stoneMask] = await buildMasks(w, h, 3, (x, y, out) => {
    const edge = distance[y * w + x]! + 3 * Math.sin(x * 0.083 + Math.sin(y * 0.06)) + 2 * Math.sin(y * 0.13 + x * 0.04);
    const dirt = Math.max(0, Math.min(1, (edge + 5) / 26));
    out[0] = Math.max(0, Math.min(1, (edge + 24) / 22));
    out[1] = dirt;
    out[2] = Math.max(paving, stoneCoverage(ruins, x / BAKE, y / BAKE)) * dirt;
  }) as [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement];
  const out = canvas(w, h), ctx = out.getContext('2d')!;
  ctx.fillStyle = ctx.createPattern(kit.quadrants[2]!, 'repeat')!;
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(maskedLayer([w, h], kit.quadrants[3]!, meadowMask), 0, 0);
  ctx.drawImage(maskedLayer([w, h], kit.quadrants[1]!, dirtMask), 0, 0);
  ctx.drawImage(maskedLayer([w, h], kit.quadrants[0]!, stoneMask), 0, 0);
  return out;
}

/** Room platforms and bridges over a dark drop, with a lit face under each platform edge. */
async function suspendedGround(map: ActMap, kit: Kit, distance: Float32Array): Promise<HTMLCanvasElement> {
  const w = map.columns * BAKE, h = map.rows * BAKE;
  const inRoom = (x: number, y: number) => map.rooms.some(r => Math.abs(x - r.x) <= r.radiusX && Math.abs(y - r.y) <= r.radiusY);
  const [roomMask, bridgeMask, faceMask] = await buildMasks(w, h, 3, (x, y, out) => {
    const i = y * w + x, floor = distance[i]! >= 0, face = !floor && y >= 10 && distance[i - w * 10]! >= 0;
    const room = floor && inRoom(Math.floor(x / BAKE), Math.floor(y / BAKE));
    out[0] = room ? 1 : 0;
    out[1] = floor && !room ? 1 : 0;
    out[2] = face ? 1 : 0;
  }) as [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement];
  const out = canvas(w, h), ctx = out.getContext('2d')!;
  ctx.fillStyle = ctx.createPattern(kit.quadrants[2]!, 'repeat')!;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgb(42, 56, 75)';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(maskedLayer([w, h], kit.quadrants[3]!, faceMask, 'rgb(133, 133, 133)'), 0, 0);
  ctx.drawImage(maskedLayer([w, h], kit.quadrants[0]!, bridgeMask), 0, 0);
  ctx.drawImage(maskedLayer([w, h], kit.quadrants[1]!, roomMask), 0, 0);
  return out;
}

function scenery(map: ActMap, profile: ActArtProfile): Placement[] {
  const walkable = (x: number, y: number) => isFloor(map, { x, y });
  if (profile.landmarkWidths) {
    const widths = profile.landmarkWidths, out: Placement[] = [];
    map.rooms.forEach((room, index) => {
      for (const side of [-1, 1]) {
        const x = room.x + side * (room.radiusX + 1), y = room.y + room.radiusY;
        if (walkable(x, y)) continue;
        const id = (index + (side === 1 ? 1 : 0)) % widths.length;
        out.push([id, x + 0.5, y + 0.9, widths[id]!]);
      }
    });
    return out;
  }
  if (profile.platformWidths) {
    const widths = profile.platformWidths;
    return map.rooms.filter(r => r.role !== 'boss').map((r, i) => [i % widths.length, r.x - r.radiusX + 0.65, r.y + r.radiusY + 0.6, widths[i % widths.length]!]);
  }
  const out: Placement[] = [];
  for (let y = 2; y < map.rows - 2; y += 3) for (let x = 2; x < map.columns - 2; x += 3) {
    if (walkable(x, y)) continue;
    if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => walkable(x + dx!, y + dy!))) continue;
    out.push([(x + y) % 2, x + 0.5, y + 0.9, 3.2]);
  }
  return out;
}

/** Bake the act's ground and plan its props. Yields between slices so the page keeps painting. */
export async function bakeTerrain(map: ActMap): Promise<Terrain> {
  const profile = profileFor(map.biome);
  const [kit, gateKit] = await Promise.all([loadKit(profile), loadKit(ACT_ART.root!)]);
  const distance = await groundDistances(map);
  const ground = profile.surface === 'suspended' ? await suspendedGround(map, kit, distance) : await openGround(map, kit, distance);
  return { ground, kit, gateKit, scenery: scenery(map, profile) };
}

/** Draw one prop with its ground shadow, in world art pixels (TILE per tile). */
export function drawProp(ctx: CanvasRenderingContext2D, kit: Kit, [id, x, y, tilesWide]: Placement): void {
  const bounds = kit.profile.propBounds[id];
  if (!bounds) return;
  const [sx, sy, sw, sh] = bounds, w = tilesWide * TILE, h = (w * sh) / sw, px = x * TILE, py = y * TILE;
  ctx.fillStyle = 'rgba(16, 44, 36, 0.38)';
  ctx.beginPath();
  ctx.ellipse(px + w * 0.13, py - 1.5, w * 0.36, Math.max(1.5, w * 0.11), -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.drawImage(kit.props, sx, sy, sw, sh, px - w / 2, py - h, w, h);
}

/** The boss threshold: a ruined arch, bricked up with a gold seam while sealed. */
export function drawGate(ctx: CanvasRenderingContext2D, gateKit: Kit, gate: { x: number; y: number }, sealed: boolean): void {
  const cx = (gate.x + 0.5) * TILE, base = (gate.y + 1) * TILE + 2;
  if (sealed) {
    const left = cx - 12, top = base - 29;
    ctx.fillStyle = '#27342f';
    ctx.fillRect(left, top, 24, 29);
    for (let row = 0; row < 5; row++) {
      ctx.fillStyle = row % 2 ? '#485247' : '#525a4c';
      ctx.fillRect(left + 1, top + 1 + row * 5.6, 22, 5);
      ctx.fillStyle = '#899079';
      ctx.fillRect(left + 1, top + 1 + row * 5.6, 22, 0.6);
    }
    ctx.strokeStyle = '#c5a46b';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx, top + 2);
    ctx.lineTo(cx, base - 2);
    ctx.stroke();
  }
  drawProp(ctx, gateKit, [2, gate.x + 0.5, (base + 4) / TILE, 2.4]);
}
