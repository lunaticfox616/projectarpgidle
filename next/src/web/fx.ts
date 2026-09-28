// Short-lived effects drawn in world space: swing arcs, orb bolts, impact bursts, drops with rarity
// beams, level-up pillar, gate break and floating numbers.
import { TILE } from './terrain.ts';
import { player, type Fx, type Scene } from './scene.ts';
import type { Art } from './art.ts';
import type { Facing } from '../data/characters.ts';

const center = (x: number, y: number): [number, number] => [(x + 0.5) * TILE, (y + 0.5) * TILE - 6];
const ANGLE: Record<Facing, number> = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
const RARITY_COLOR = { normal: '#e8e2d0', magic: '#6fa8ff', rare: '#ffd24a' } as const;

function slash(ctx: CanvasRenderingContext2D, f: Extract<Fx, { kind: 'slash' }>, t: number): void {
  if (t > 1) return;
  const [x, y] = center(f.x, f.y), base = ANGLE[f.facing], sweep = Math.PI * 1.1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const head = base - sweep / 2 + sweep * Math.min(1, t * 1.6) - i * 0.25;
    ctx.strokeStyle = `rgba(255, ${235 - i * 30}, ${190 - i * 60}, ${(1 - t) * (0.9 - i * 0.25)})`;
    ctx.lineWidth = 3 - i;
    ctx.beginPath();
    ctx.arc(x, y + 2, 13 + i * 2, head - 0.9, head);
    ctx.stroke();
  }
  ctx.restore();
}

function bolt(ctx: CanvasRenderingContext2D, f: Extract<Fx, { kind: 'bolt' }>, time: number): void {
  const t = (time - f.at) / f.ms;
  if (t < 0 || t > 1) return;
  const [ax, ay] = center(f.from[0], f.from[1]), [bx, by] = center(f.to[0], f.to[1]);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const k = Math.max(0, t - i * 0.06), x = ax + (bx - ax) * k, y = ay + (by - ay) * k - Math.sin(k * Math.PI) * 6;
    ctx.fillStyle = `rgba(${200 - i * 20}, ${150 - i * 20}, 255, ${1 - i * 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, 3.2 - i * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function burst(ctx: CanvasRenderingContext2D, f: Extract<Fx, { kind: 'burst' }>, t: number): void {
  if (t > 1) return;
  const [x, y] = center(f.x, f.y);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = f.color;
  ctx.globalAlpha = 1 - t;
  ctx.lineWidth = 2 * (1 - t) + 0.5;
  ctx.beginPath();
  ctx.arc(x, y, 3 + t * TILE * f.radius, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + f.at, r = 4 + t * TILE * f.radius * 1.2;
    ctx.fillStyle = f.color;
    ctx.fillRect(x + Math.cos(a) * r - 1, y + Math.sin(a) * r - 1, 2, 2);
  }
  ctx.restore();
}

/** Drops pop out of the corpse, lie glowing, then rise into the loot pouch. */
function drop(ctx: CanvasRenderingContext2D, f: Extract<Fx, { kind: 'drop' }>, since: number, art: Art): void {
  if (since < 0 || since > 2400) return;
  const [x0, y0] = center(f.x, f.y), land = Math.min(1, since / 420);
  const x = x0 + f.dx * TILE * land, hop = Math.sin(land * Math.PI) * 12;
  const rise = Math.max(0, (since - 1700) / 700);
  const y = y0 + 8 - hop - rise * 30;
  ctx.save();
  ctx.globalAlpha = 1 - rise;
  if (f.rarity) {
    const color = RARITY_COLOR[f.rarity];
    ctx.globalCompositeOperation = 'lighter';
    const beam = ctx.createLinearGradient(0, y - 40, 0, y);
    beam.addColorStop(0, 'rgba(0,0,0,0)');
    beam.addColorStop(1, color);
    ctx.fillStyle = beam;
    ctx.globalAlpha = (1 - rise) * (f.rarity === 'normal' ? 0.25 : 0.6) * land;
    ctx.fillRect(x - 2, y - 40, 4, 40);
    ctx.globalAlpha = 1 - rise;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#20160e';
    ctx.fillRect(x - 4, y - 4, 8, 8);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 3.5, y - 3.5, 7, 7);
  } else if (f.currency) {
    const icon = art.currencies[f.currency];
    if (icon) ctx.drawImage(icon, x - 5, y - 5, 10, 10);
    else {
      ctx.fillStyle = f.currency === 'bossCore' ? '#ff7a4a' : '#ffd24a';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function levelUp(ctx: CanvasRenderingContext2D, scene: Scene, t: number): void {
  if (t > 1) return;
  const hero = player(scene), [x, y] = center(hero.x, hero.y);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(0, y - 60, 0, y + 10);
  g.addColorStop(0, 'rgba(255, 220, 120, 0)');
  g.addColorStop(1, `rgba(255, 210, 110, ${0.7 * (1 - t)})`);
  ctx.fillStyle = g;
  ctx.fillRect(x - 9 - t * 4, y - 60, 18 + t * 8, 70);
  for (let i = 0; i < 14; i++) {
    const px = x + Math.sin(i * 12.9 + t * 6) * 10, py = y + 6 - ((t * 70 + i * 9) % 60);
    ctx.fillStyle = `rgba(255, 236, 170, ${1 - t})`;
    ctx.fillRect(px, py, 1.5, 1.5);
  }
  ctx.restore();
}

function number(ctx: CanvasRenderingContext2D, f: Extract<Fx, { kind: 'number' }>, t: number): void {
  if (t > 1) return;
  const [x, y] = center(f.x, f.y), pop = Math.min(1, t * 8);
  const size = f.tone === 'big' ? 11 : 7;
  ctx.save();
  ctx.font = `${size * (0.7 + 0.3 * pop)}px Galmuri14, monospace`;
  ctx.textAlign = 'center';
  ctx.globalAlpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
  const drift = f.tone === 'take' ? 6 : -6;
  const px = x + drift * t, py = y - 14 - t * 16;
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(10, 6, 4, 0.9)';
  ctx.strokeText(f.text, px, py);
  ctx.fillStyle = f.tone === 'take' ? '#ff6a5a' : f.tone === 'big' ? '#ffd24a' : f.tone === 'heal' ? '#7fe08a' : '#fff6e0';
  ctx.fillText(f.text, px, py);
  ctx.restore();
}

/** Effects that lie on the ground under the actors. */
export function drawGroundEffects(ctx: CanvasRenderingContext2D, scene: Scene, art: Art): void {
  for (const f of scene.fx) if (f.kind === 'drop') drop(ctx, f, scene.time - f.at, art);
}

export function drawEffects(ctx: CanvasRenderingContext2D, scene: Scene): void {
  for (const f of scene.fx) {
    const since = scene.time - f.at;
    if (since < 0) continue;
    switch (f.kind) {
      case 'slash': slash(ctx, f, since / 200); break;
      case 'bolt': bolt(ctx, f, scene.time); break;
      case 'burst': burst(ctx, f, since / 320); break;
      case 'levelUp': levelUp(ctx, scene, since / 1400); break;
      case 'number': number(ctx, f, since / 900); break;
      default: break;
    }
  }
}
