// Canvas rendering of the act: baked terrain, the boss seal, actors with their animations, effects,
// fog of war and the hero's light. Reads the scene and state; changes neither.
import { TILE, BAKE_SCALE } from './terrain.ts';
import { FACINGS } from '../data/characters.ts';
import { motionNow, player, type Actor, type Scene } from './scene.ts';
import { drawEffects, drawGroundEffects } from './fx.ts';
import type { Art, EnemyArt } from './art.ts';
import type { ActMap, GameState } from '../core/types.ts';

export interface View {
  ctx: CanvasRenderingContext2D;
  /** Screen pixels per art pixel. */
  zoom: number;
  width: number;
  height: number;
  camX: number;
  camY: number;
  terrain: HTMLCanvasElement;
  fog: HTMLCanvasElement;
  fogRevealed: number;
  tint: HTMLCanvasElement;
}

const FEET_OFFSET = 3;
/** Tile centre (feet position) in art pixels. */
export const feet = (x: number, y: number): [number, number] => [(x + 0.5) * TILE, (y + 0.5) * TILE + FEET_OFFSET];

export function createView(canvas: HTMLCanvasElement, terrain: HTMLCanvasElement, map: ActMap): View {
  const fog = document.createElement('canvas');
  fog.width = map.columns;
  fog.height = map.rows;
  return {
    ctx: canvas.getContext('2d')!, zoom: 3, width: canvas.width, height: canvas.height, camX: 0, camY: 0,
    terrain, fog, fogRevealed: -1, tint: document.createElement('canvas')
  };
}

/** Integer zoom: 3 on a 900px-tall desktop (about 19 tiles tall), 2 on phones. */
export function fitZoom(view: View, cssWidth: number, cssHeight: number, dpr: number): void {
  view.width = Math.round(cssWidth * dpr);
  view.height = Math.round(cssHeight * dpr);
  const shorter = Math.min(cssWidth, cssHeight);
  view.zoom = Math.max(2, Math.min(4, Math.round(shorter / 300))) * dpr;
}

function refreshFog(view: View, state: GameState): void {
  const fog = state.run!.fog, revealed = fog.reduce((a, b) => a + b, 0);
  if (revealed === view.fogRevealed) return;
  view.fogRevealed = revealed;
  const ctx = view.fog.getContext('2d')!, image = ctx.createImageData(view.fog.width, view.fog.height);
  fog.forEach((seen, i) => { image.data[i * 4 + 3] = seen ? 0 : 255; });
  ctx.putImageData(image, 0, 0);
}

/** The hero stays at the centre; beyond the map edge is dark void, like the unexplored fog. */
function followCamera(view: View, scene: Scene): void {
  const hero = player(scene), [fx, fy] = feet(hero.x, hero.y);
  const targetX = fx - view.width / view.zoom / 2, targetY = fy - view.height / view.zoom / 2;
  const far = Math.abs(targetX - view.camX) > TILE * 6 || Math.abs(targetY - view.camY) > TILE * 6;
  view.camX = far ? targetX : view.camX + (targetX - view.camX) * 0.15;
  view.camY = far ? targetY : view.camY + (targetY - view.camY) * 0.15;
}

function drawSeal(ctx: CanvasRenderingContext2D, map: ActMap, time: number): void {
  const [x, y] = feet(map.gate.x, map.gate.y), pulse = 0.6 + 0.4 * Math.sin(time / 260);
  ctx.save();
  ctx.translate(x, y - FEET_OFFSET);
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, TILE);
  glow.addColorStop(0, `rgba(255, 214, 120, ${0.55 * pulse})`);
  glow.addColorStop(1, 'rgba(255, 180, 60, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-TILE, -TILE, TILE * 2, TILE * 2);
  ctx.strokeStyle = `rgba(255, 222, 140, ${0.8 * pulse})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, TILE * 0.42, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = time / 900 + (i * Math.PI) / 3;
    ctx.fillStyle = `rgba(255, 236, 180, ${pulse})`;
    ctx.fillRect(Math.cos(a) * TILE * 0.42 - 1, Math.sin(a) * TILE * 0.42 - 1, 2, 2);
  }
  ctx.restore();
}

/** Draw `draw` into the shared tint canvas, then optionally wash it white (hit flash). */
function withFlash(view: View, w: number, h: number, flash: number, draw: (c: CanvasRenderingContext2D) => void, color = '255,255,255'): HTMLCanvasElement {
  const tint = view.tint;
  if (tint.width < w || tint.height < h) { tint.width = Math.max(tint.width, w); tint.height = Math.max(tint.height, h); }
  const c = tint.getContext('2d')!;
  c.clearRect(0, 0, tint.width, tint.height);
  c.imageSmoothingEnabled = false;
  draw(c);
  if (flash > 0) {
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = `rgba(${color},${flash})`;
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'source-over';
  }
  return tint;
}

/** Hit flash strength: full at the moment of impact, gone 110 ms later, none before it lands. */
function flashAmount(scene: Scene, actor: Actor): number {
  const since = scene.time - actor.flashAt;
  return since < 0 ? 0 : Math.max(0, 1 - since / 110) * 0.85;
}

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.beginPath();
  ctx.ellipse(x, y, radius, radius * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawHero(view: View, scene: Scene, art: Art, actor: Actor): void {
  const ctx = view.ctx, [x, y] = feet(actor.x, actor.y);
  shadow(ctx, x, y, 6);
  const character = art.character;
  if (!character) {
    ctx.fillStyle = flashAmount(scene, actor) > 0 ? '#fff' : '#d9ac6b';
    ctx.fillRect(x - 4, y - 16, 8, 16);
    ctx.fillStyle = '#e8cbac';
    ctx.fillRect(x - 3, y - 21, 6, 6);
    return;
  }
  const { sheet } = character;
  const { motion, ms } = motionNow(scene, actor, { attack: sheet.motions.attack.frameMs.reduce((a, b) => a + b, 0), hit: sheet.motions.hit.frameMs.reduce((a, b) => a + b, 0) });
  const m = sheet.motions[motion], total = m.frameMs.reduce((a, b) => a + b, 0);
  let t = motion === 'attack' || motion === 'hit' ? ms : ms % total, frame = 0;
  while (frame < m.frames - 1 && t >= m.frameMs[frame]!) t -= m.frameMs[frame++]!;
  const cell = sheet.cell, row = FACINGS.indexOf(actor.facing);
  const image = character.motions[motion];
  const alpha = actor.diedAt === null ? 1 : Math.max(0.25, 1 - (scene.time - actor.diedAt) / 600);
  const tinted = withFlash(view, cell, cell, flashAmount(scene, actor) * 0.6, c => c.drawImage(image, frame * cell, row * cell, cell, cell, 0, 0, cell, cell), '255,70,50');
  ctx.globalAlpha = alpha;
  ctx.drawImage(tinted, 0, 0, cell, cell, Math.round(x - 39), Math.round(y - 39 - FEET_OFFSET), cell, cell);
  ctx.globalAlpha = 1;
}

function enemyFrame(scene: Scene, e: EnemyArt, actor: Actor): [number, number, number, number] {
  const index = Math.floor((scene.time + actor.id * 97) / e.frameMs) % e.frames.length;
  return e.frames[index]!;
}

function drawAura(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, time: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.55 + 0.2 * Math.sin(time / 300);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, radius, radius * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function lungeOffset(scene: Scene, actor: Actor, hero: Actor): [number, number] {
  const t = (scene.time - actor.lungeAt) / 140;
  if (t < 0 || t > 1) return [0, 0];
  const push = Math.sin(t * Math.PI) * 5, dx = hero.x - actor.x, dy = hero.y - actor.y, len = Math.hypot(dx, dy) || 1;
  return [(dx / len) * push, (dy / len) * push];
}

function drawEnemy(view: View, scene: Scene, art: Art, actor: Actor): void {
  const ctx = view.ctx, kind = actor.kind as 'normal' | 'elite' | 'boss', e = art.enemies[kind];
  const [lx, ly] = lungeOffset(scene, actor, player(scene));
  const [x0, y0] = feet(actor.x, actor.y), x = x0 + lx, y = y0 + ly;
  const dying = actor.diedAt === null ? 0 : Math.min(1, Math.max(0, (scene.time - actor.diedAt) / 700));
  const size = e?.height ?? (kind === 'boss' ? 44 : kind === 'elite' ? 26 : 16);
  shadow(ctx, x, y, size * (kind === 'boss' ? 0.5 : 0.36));
  if (kind === 'elite') drawAura(ctx, x, y, 14, 'rgba(255, 196, 80, 0.9)', scene.time);
  if (kind === 'boss') drawAura(ctx, x, y, 30, 'rgba(220, 60, 40, 0.9)', scene.time);
  ctx.globalAlpha = 1 - dying;
  if (!e) {
    ctx.fillStyle = kind === 'boss' ? '#7a2a20' : kind === 'elite' ? '#8a6a2a' : '#5a4a3a';
    ctx.fillRect(x - size / 3, y - size, (size * 2) / 3, size);
  } else {
    const [sx, sy, sw, sh] = enemyFrame(scene, e, actor);
    const scale = (e.height / sh) * (kind === 'boss' ? 1 : 1.3) * (1 - dying * 0.2);
    const w = Math.round(sw * scale), h = Math.round(sh * scale);
    const mirror = e.facesLeft ? actor.facing === 'right' : actor.facing === 'left';
    const tinted = withFlash(view, w, h, flashAmount(scene, actor), c => {
      c.imageSmoothingEnabled = true;
      if (mirror) { c.save(); c.translate(w, 0); c.scale(-1, 1); }
      c.drawImage(e.image, sx, sy, sw, sh, 0, 0, w, h);
      if (mirror) c.restore();
    });
    const pad = kind === 'boss' ? 0.04 : 0.12;
    ctx.drawImage(tinted, 0, 0, w, h, Math.round(x - w / 2), Math.round(y - h * (1 - pad) + dying * 4), w, h);
  }
  ctx.globalAlpha = 1;
  if (actor.diedAt === null && kind !== 'boss' && (actor.hp < actor.maxHp || kind === 'elite')) drawBar(ctx, x, y - size - 4, kind === 'elite' ? 18 : 12, actor.hp / actor.maxHp, kind === 'elite');
}

function drawBar(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, ratio: number, gold: boolean): void {
  const left = Math.round(x - width / 2), top = Math.round(y);
  ctx.fillStyle = gold ? '#d9ac6b' : 'rgba(0,0,0,0.8)';
  ctx.fillRect(left - 1, top - 1, width + 2, 4);
  ctx.fillStyle = '#1a0c0a';
  ctx.fillRect(left, top, width, 2);
  ctx.fillStyle = gold ? '#e8a13a' : '#c8413a';
  ctx.fillRect(left, top, Math.max(0, Math.round(width * ratio)), 2);
}

function drawFogAndLight(view: View, scene: Scene, map: ActMap): void {
  const ctx = view.ctx;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(view.fog, 0, 0, map.columns, map.rows, -TILE * 0.5, -TILE * 0.5, map.columns * TILE + TILE, map.rows * TILE + TILE);
  ctx.imageSmoothingEnabled = false;
  const hero = player(scene), [x, y] = feet(hero.x, hero.y);
  const light = ctx.createRadialGradient(x, y - 8, TILE * 3, x, y - 8, TILE * 9);
  light.addColorStop(0, 'rgba(8, 6, 4, 0)');
  light.addColorStop(1, 'rgba(8, 6, 4, 0.45)');
  ctx.fillStyle = light;
  ctx.fillRect(view.camX - TILE, view.camY - TILE, view.width / view.zoom + TILE * 2, view.height / view.zoom + TILE * 2);
}

export function drawWorld(view: View, scene: Scene, state: GameState, art: Art, map: ActMap): void {
  const ctx = view.ctx, run = state.run!;
  refreshFog(view, state);
  followCamera(view, scene);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#060705';
  ctx.fillRect(0, 0, view.width, view.height);
  const shakeT = Math.max(0, 1 - (scene.time - scene.shakeAt) / 260);
  const shakeX = shakeT * scene.shakePower * Math.sin(scene.time * 0.09), shakeY = shakeT * scene.shakePower * Math.cos(scene.time * 0.11);
  ctx.setTransform(view.zoom, 0, 0, view.zoom, Math.round((-view.camX + shakeX) * view.zoom), Math.round((-view.camY + shakeY) * view.zoom));
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(view.terrain, 0, 0, view.terrain.width / BAKE_SCALE, view.terrain.height / BAKE_SCALE);
  if (!run.gateOpen) drawSeal(ctx, map, scene.time);
  drawGroundEffects(ctx, scene, art);
  const actors = [...scene.actors.values()].sort((a, b) => a.y - b.y || (a.kind === 'player' ? 1 : -1));
  for (const actor of actors) {
    if (actor.kind === 'player') drawHero(view, scene, art, actor);
    else drawEnemy(view, scene, art, actor);
  }
  drawEffects(ctx, scene);
  drawFogAndLight(view, scene, map);
}
