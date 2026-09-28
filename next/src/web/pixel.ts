// Code-drawn pixel art. Sprites are text grids: each character is one art pixel looked up in a
// palette ('.' and ' ' are transparent). Everything outside the character kit and skill effects is
// drawn this way, at the same pixel density as the Hana characters (1 art pixel = 1 grid cell).

/** Palette key → CSS colour. */
export type Palette = Record<string, string>;

export interface Sprite { width: number; height: number; canvas: HTMLCanvasElement }

/** Parse a grid: rows are lines; leading/trailing blank lines and common indentation are ignored. */
export function parseGrid(grid: string): string[] {
  const rows = grid.split('\n');
  while (rows.length && !rows[0]!.trim()) rows.shift();
  while (rows.length && !rows.at(-1)!.trim()) rows.pop();
  const indent = Math.min(...rows.filter(r => r.trim()).map(r => r.length - r.trimStart().length));
  return rows.map(r => r.slice(indent).replace(/\s+$/, ''));
}

const cache = new Map<string, Sprite>();

/** Render a grid with a palette once; the same grid + palette returns the cached canvas. */
export function sprite(grid: string, palette: Palette, key?: string): Sprite {
  const id = key ?? `${grid}|${JSON.stringify(palette)}`;
  const hit = cache.get(id);
  if (hit) return hit;
  const rows = parseGrid(grid), width = Math.max(...rows.map(r => r.length)), height = rows.length;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]!;
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (!color) throw new Error(`pixel: no colour for '${ch}' in sprite ${key ?? ''}`);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  const made = { width, height, canvas };
  cache.set(id, made);
  return made;
}

/** A 1px dark outline around every opaque pixel, drawn behind the sprite. */
export function outlined(source: Sprite, color: string, key: string): Sprite {
  const hit = cache.get(key);
  if (hit) return hit;
  const width = source.width + 2, height = source.height + 2, canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const silhouette = document.createElement('canvas');
  silhouette.width = source.width;
  silhouette.height = source.height;
  const s = silhouette.getContext('2d')!;
  s.drawImage(source.canvas, 0, 0);
  s.globalCompositeOperation = 'source-in';
  s.fillStyle = color;
  s.fillRect(0, 0, source.width, source.height);
  for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) ctx.drawImage(silhouette, dx!, dy!);
  ctx.drawImage(source.canvas, 1, 1);
  const made = { width, height, canvas };
  cache.set(key, made);
  return made;
}

/** Deterministic hash noise in [0, 1) for procedural pixels. */
export function hash(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** 4×4 Bayer threshold in [0, 1): ordered dithering for soft pixel transitions. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x: number, y: number): number => (BAYER[(y & 3) * 4 + (x & 3)]! + 0.5) / 16;

/** Sprite as a data URL, for <img> icons in the HUD (our own canvas, so this works from file://). */
export function spriteUrl(s: Sprite): string {
  return s.canvas.toDataURL();
}

/** A disc of a blob: centre x, centre y, radius (art pixels). */
export type Disc = [number, number, number];

/**
 * Shade a union of discs into `ctx`: light from the top-left, dithered between the ramp steps
 * (dark → light). `h` is the height the shading darkens toward (the blob's ground line).
 */
export function paintBlob(ctx: CanvasRenderingContext2D, discs: Disc[], ramp: string[], h: number, seed: number): void {
  const x0 = Math.max(0, Math.floor(Math.min(...discs.map(d => d[0] - d[2])))), x1 = Math.min(ctx.canvas.width, Math.ceil(Math.max(...discs.map(d => d[0] + d[2]))));
  const y0 = Math.max(0, Math.floor(Math.min(...discs.map(d => d[1] - d[2])))), y1 = Math.min(ctx.canvas.height, Math.ceil(Math.max(...discs.map(d => d[1] + d[2]))));
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    let best: Disc | null = null, depth = -1;
    for (const d of discs) {
      const inside = 1 - Math.hypot(x + 0.5 - d[0], y + 0.5 - d[1]) / d[2];
      if (inside > 0 && inside > depth) { depth = inside; best = d; }
    }
    if (!best) continue;
    const nx = (x + 0.5 - best[0]) / best[2], ny = (y + 0.5 - best[1]) / best[2];
    // Brighter toward the upper-left of each lobe, darker at the rim and low on the blob.
    const light = 0.55 - 0.45 * (nx * 0.6 + ny * 0.8) + depth * 0.35 - (y / h) * 0.35 + (hash(x, y, seed) - 0.5) * 0.25;
    const level = Math.max(0, Math.min(ramp.length - 1, Math.floor(light * ramp.length + bayer(x, y) - 0.5)));
    ctx.fillStyle = ramp[level]!;
    ctx.fillRect(x, y, 1, 1);
  }
}

/** A 1px line (Bresenham), for legs, roots and outlines of thin parts. */
export function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string): void {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  ctx.fillStyle = color;
  for (;;) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) return;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

export function dot(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, w = 1, h = 1): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

export function blankCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}
