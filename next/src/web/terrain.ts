// Bakes one act map into a single canvas: textured floors (room ground, corridor path, paved boss
// and entry rooms), dark overgrown walls with a lit lip, and soft shadows where floor meets wall.
import { isFloor } from '../core/map.ts';
import type { ActMap, Cell, Room } from '../core/types.ts';

/** Art pixels per tile; characters are about 21 art pixels tall. */
export const TILE = 16;
/** Terrain is baked at this many screen pixels per art pixel and scaled at draw time. */
export const BAKE_SCALE = 3;
const PX = TILE * BAKE_SCALE;

type Quadrant = 0 | 1 | 2 | 3;
/** Material sheets hold four textures: paving, path, dense wall growth, open ground. */
const PAVING: Quadrant = 0, PATH: Quadrant = 1, WALL: Quadrant = 2, GROUND: Quadrant = 3;

function patterns(ctx: CanvasRenderingContext2D, material: HTMLImageElement | null): (CanvasPattern | string)[] {
  const fallback = ['#6d6453', '#5b4a36', '#1f2a1c', '#4b5a33'];
  if (!material) return fallback;
  const half = Math.floor(material.width / 2);
  // Texture pixels are ~5px in the source; 0.6 brings them close to the 3px sprite pixel.
  const size = Math.round(half * 0.6);
  return ([0, 1, 2, 3] as Quadrant[]).map(q => {
    const tile = document.createElement('canvas');
    tile.width = tile.height = size;
    const t = tile.getContext('2d')!;
    t.imageSmoothingEnabled = true;
    t.drawImage(material, (q % 2) * half, Math.floor(q / 2) * half, half, half, 0, 0, size, size);
    return ctx.createPattern(tile, 'repeat') ?? fallback[q]!;
  });
}

const inRoom = (room: Room, c: Cell) => Math.abs(c.x - room.x) <= room.radiusX && Math.abs(c.y - room.y) <= room.radiusY;

function floorKind(map: ActMap, c: Cell): Quadrant {
  const room = map.rooms.find(r => inRoom(r, c));
  if (!room) return PATH;
  return room.role === 'boss' || room.role === 'entry' ? PAVING : GROUND;
}

function paintFloors(ctx: CanvasRenderingContext2D, map: ActMap, fills: (CanvasPattern | string)[]): void {
  ctx.fillStyle = fills[WALL]!;
  ctx.fillRect(0, 0, map.columns * PX, map.rows * PX);
  ctx.fillStyle = 'rgba(6, 8, 6, 0.62)';
  ctx.fillRect(0, 0, map.columns * PX, map.rows * PX);
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.columns; x++) {
    if (!isFloor(map, { x, y })) continue;
    ctx.fillStyle = fills[floorKind(map, { x, y })]!;
    ctx.fillRect(x * PX, y * PX, PX, PX);
  }
}

/** Shadow falling onto floor from the wall above, and a faint rim along side walls. */
function paintEdges(ctx: CanvasRenderingContext2D, map: ActMap): void {
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.columns; x++) {
    const px = x * PX, py = y * PX;
    if (isFloor(map, { x, y })) {
      if (!isFloor(map, { x, y: y - 1 })) {
        const g = ctx.createLinearGradient(0, py, 0, py + PX * 0.55);
        g.addColorStop(0, 'rgba(0,0,0,0.55)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(px, py, PX, PX * 0.55);
      }
      for (const dx of [-1, 1]) {
        if (isFloor(map, { x: x + dx, y })) continue;
        const edge = dx < 0 ? px : px + PX;
        const g = ctx.createLinearGradient(edge, 0, edge - dx * PX * 0.35, 0);
        g.addColorStop(0, 'rgba(0,0,0,0.4)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(dx < 0 ? px : px + PX * 0.65, py, PX * 0.35, PX);
      }
    } else if (isFloor(map, { x, y: y + 1 })) {
      // Wall face seen from the south: a lit lip on top of a darker face.
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(px, py + PX * 0.45, PX, PX * 0.55);
      ctx.fillStyle = 'rgba(214, 196, 150, 0.16)';
      ctx.fillRect(px, py + PX * 0.4, PX, BAKE_SCALE * 2);
    }
  }
}

export function bakeTerrain(map: ActMap, material: HTMLImageElement | null): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = map.columns * PX;
  canvas.height = map.rows * PX;
  const ctx = canvas.getContext('2d')!;
  paintFloors(ctx, map, patterns(ctx, material));
  paintEdges(ctx, map);
  return canvas;
}
