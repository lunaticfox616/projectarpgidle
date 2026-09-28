// Monsters and bosses drawn in code, one animation strip per act. Normal enemies rotate through
// three wood species (root spider, sap slime, bark leech) recoloured by the act's element; elites are
// wood puppets in element cloth; each act's boss is built from a template that fits its story.
import { actText } from '../data/acts.ts';
import { blankCanvas, dot, line, outlined, paintBlob, type Disc } from './pixel.ts';
import type { Element, EnemyKind } from '../core/types.ts';

/** How one enemy kind of an act is cut from its strip. */
export interface EnemyArt {
  image: HTMLCanvasElement;
  /** Source rectangles of the animation frames. */
  frames: [number, number, number, number][];
  frameMs: number;
  /** Frame height in art pixels (the hero is about 21). */
  height: number;
  /** True when the drawing faces left, so facing right mirrors it. */
  facesLeft: boolean;
}

interface Colors { body: string[]; accent: [string, string] }

/** Body ramp (dark → light) and glow per element. */
const ELEMENT: Record<Element, Colors> = {
  phys: { body: ['#2e1f14', '#4a3322', '#6b4a2e', '#8e6a40'], accent: ['#9ad04a', '#e8f890'] },
  fire: { body: ['#3a120a', '#6e2210', '#a83c18', '#e0702a'], accent: ['#ffc040', '#fff4b0'] },
  cold: { body: ['#142438', '#23405e', '#3a6a8e', '#6aa0c0'], accent: ['#a8f0ff', '#ffffff'] },
  light: { body: ['#2a2210', '#54461c', '#8a7424', '#c8ac3a'], accent: ['#c8a0ff', '#fff6c0'] },
  chaos: { body: ['#1a0e24', '#321a44', '#50286a', '#763c94'], accent: ['#80ff60', '#e0ffc0'] }
};
const WOOD = ['#2a1a10', '#4a3020', '#6e4a2c', '#98703e'];
const BONE = ['#4a4238', '#7a6e5c', '#aea08a', '#ddd2bc'];
const OUTLINE = '#0b0806';

type Painter = (ctx: CanvasRenderingContext2D, frame: number, c: Colors) => void;

/** Draw `frames` frames of `w`×`h`, outline each, and lay them side by side. */
function strip(name: string, w: number, h: number, frames: number, c: Colors, paint: Painter): { canvas: HTMLCanvasElement; rects: [number, number, number, number][] } {
  const [out, octx] = blankCanvas((w + 2) * frames, h + 2);
  const rects: [number, number, number, number][] = [];
  for (let f = 0; f < frames; f++) {
    const [canvas, ctx] = blankCanvas(w, h);
    paint(ctx, f, c);
    const framed = outlined({ width: w, height: h, canvas }, OUTLINE, `${name}:${c.body[2]}:${f}`);
    octx.drawImage(framed.canvas, f * (w + 2), 0);
    rects.push([f * (w + 2), 0, w + 2, h + 2]);
  }
  return { canvas: out, rects };
}

const eyes = (ctx: CanvasRenderingContext2D, points: [number, number][], c: Colors) => points.forEach(([x, y]) => { dot(ctx, x, y, c.accent[0]); dot(ctx, x, y - 1, c.accent[1]); });

// ── Normal species ───────────────────────────────────────────────────────────────────────────────

const spider: Painter = (ctx, f, c) => {
  const lift = (i: number) => ((i + f) % 2 ? -1 : 1);
  for (let i = 0; i < 4; i++) {
    const kx = 5 + i * 3.5, ky = 4 + lift(i);
    line(ctx, 10, 9, kx, ky, c.body[0]!);
    line(ctx, kx, ky, kx - 2 + i, 13, c.body[0]!);
  }
  paintBlob(ctx, [[14.5, 7 + (f % 2) * 0.5, 5], [12, 5.5, 3]], c.body, 13, 3);
  paintBlob(ctx, [[7.5, 8.5, 3.5]], c.body, 13, 4);
  eyes(ctx, [[5, 8], [7, 8]], c);
  dot(ctx, 15, 4, c.accent[0]);
};

const slime: Painter = (ctx, f, c) => {
  const squash = [0, 1, 2, 1][f]!, cy = 8 + squash * 0.6, rx = 6 + squash * 0.5;
  paintBlob(ctx, [[8, cy, rx - 0.5], [5, cy + 1.5, 3.5 + squash * 0.3], [11, cy + 1.5, 3.5 + squash * 0.3], [8, cy - 3 + squash * 0.5, 3.5]], c.body, 13, 5);
  dot(ctx, 5, cy - 3 + squash * 0.3, c.accent[1], 2, 1);
  dot(ctx, 6, Math.round(cy), OUTLINE, 1, 2);
  dot(ctx, 10, Math.round(cy), OUTLINE, 1, 2);
  dot(ctx, 7, cy + 3, c.body[0]!, 2, 1);
};

const leech: Painter = (ctx, f, c) => {
  const discs: Disc[] = [];
  for (let i = 0; i < 6; i++) discs.push([4 + i * 2.6, 6 + Math.sin(i * 0.9 + f * (Math.PI / 2)) * 1.4, 3.4 - i * 0.28]);
  paintBlob(ctx, discs, c.body, 10, 6);
  for (let i = 1; i < 6; i++) dot(ctx, 4 + i * 2.6, discs[i]![1] - 2, c.body[0]!);
  dot(ctx, 1, 6, c.accent[0], 1, 2);
  eyes(ctx, [[3, 4]], c);
};

// ── Elite: wood puppet in element cloth ───────────────────────────────────────────────────────────

const puppet: Painter = (ctx, f, c) => {
  const swing = [2, 0, -2, 0][f]!, bob = f % 2;
  line(ctx, 8, 17, 7 - swing, 25, WOOD[1]!);
  line(ctx, 11, 17, 12 + swing, 25, WOOD[1]!);
  line(ctx, 9, 17, 8 - swing, 25, WOOD[2]!);
  line(ctx, 12, 17, 13 + swing, 25, WOOD[2]!);
  paintBlob(ctx, [[10, 12 + bob, 5], [10, 16 + bob, 4]], c.body, 22, 7);
  line(ctx, 5, 10 + bob, 3 + swing, 17 + bob, WOOD[2]!);
  line(ctx, 15, 10 + bob, 17 - swing, 16 + bob, WOOD[2]!);
  line(ctx, 17 - swing, 16 + bob, 19 - swing, 7 + bob, WOOD[0]!);
  dot(ctx, 18 - swing, 6 + bob, WOOD[3]!, 2, 3);
  paintBlob(ctx, [[10, 5 + bob, 4]], WOOD, 12, 8);
  dot(ctx, 7, 1 + bob, c.body[3]!, 6, 1);
  eyes(ctx, [[9, 6 + bob], [12, 6 + bob]], c);
  dot(ctx, 8, 15 + bob, c.accent[0], 4, 1);
};

// ── Bosses ───────────────────────────────────────────────────────────────────────────────────────

const BW = 48, BH = 52;

/** Act 1: a knot of rotten roots with a mane of splinters. */
const rootHorror: Painter = (ctx, f, c) => {
  for (let i = 0; i < 7; i++) {
    const x = 8 + i * 5.5, sway = Math.sin(f * (Math.PI / 2) + i) * 2;
    line(ctx, x, 34, x + sway - 2 + (i % 3), 51, WOOD[i % 2]!);
    line(ctx, x + 1, 34, x + sway - 1 + (i % 3), 50, WOOD[1 + (i % 2)]!);
  }
  paintBlob(ctx, [[24, 30, 13], [14, 34, 8], [34, 34, 8], [24, 20, 10]], WOOD, 44, 11);
  for (let i = 0; i < 9; i++) line(ctx, 14 + i * 2.5, 16, 10 + i * 3.5, 4 + (i % 2) * 4 - (f % 2), c.body[1 + (i % 3)]!);
  paintBlob(ctx, [[24, 24, 6]], c.body, 44, 12);
  eyes(ctx, [[20, 22], [24, 21], [28, 22]], c);
  for (let i = 0; i < 5; i++) dot(ctx, 20 + i * 2, 27, BONE[3]!, 1, 2);
};

interface Robe { hood: string[]; trim: string; halo?: boolean; antlers?: boolean; staff?: boolean }

/** Acts 2, 4, 5, 8: a robed caster (deaconess, druid, pilgrim) floating a hand's width off the ground. */
const robed = (robe: Robe): Painter => (ctx, f, c) => {
  const bob = [0, 1, 2, 1][f]!;
  if (robe.halo) for (let a = 0; a < 40; a++) dot(ctx, 24 + Math.cos(a / 6.37) * 11, 9 + bob + Math.sin(a / 6.37) * 4, c.accent[a % 7 ? 0 : 1]);
  const bell: Disc[] = [];
  for (let i = 0; i < 6; i++) bell.push([24, 18 + i * 5 + bob, 6 + i * 1.8]);
  paintBlob(ctx, bell, c.body, 50, 13);
  for (let x = 12; x < 37; x++) if ((x + f) % 3) dot(ctx, x, 46 + bob + Math.sin(x + f) * 1.2, robe.trim);
  paintBlob(ctx, [[24, 13 + bob, 7]], robe.hood, 24, 14);
  dot(ctx, 21, 13 + bob, OUTLINE, 7, 5);
  eyes(ctx, [[23, 16 + bob], [26, 16 + bob]], c);
  paintBlob(ctx, [[13, 28 + bob, 3.5], [35, 28 + bob, 3.5]], robe.hood, 50, 15);
  if (robe.antlers) for (const s of [-1, 1]) {
    line(ctx, 24 + s * 5, 8 + bob, 24 + s * 13, bob, WOOD[3]!);
    line(ctx, 24 + s * 10, 3 + bob, 24 + s * 9, bob, WOOD[3]!);
  }
  if (robe.staff) {
    line(ctx, 38, 12 + bob, 38, 50, WOOD[2]!);
    paintBlob(ctx, [[38, 9 + bob, 3]], [c.accent[0], c.accent[0], c.accent[1], c.accent[1]], 12, 16);
  } else {
    paintBlob(ctx, [[24, 30 + bob, 3 + (f % 2) * 0.6]], [c.accent[0], c.accent[1], c.accent[1], '#ffffff'], 34, 17);
  }
};

/** Act 3: the famine beast — a gaunt quadruped with a spined back. */
const beast: Painter = (ctx, f, c) => {
  const step = [2, 0, -2, 0][f]!;
  for (const [x, s] of [[12, 1], [18, -1], [30, 1], [36, -1]] as const) {
    line(ctx, x, 30, x + step * s, 46, c.body[0]!);
    line(ctx, x + 1, 30, x + 1 + step * s, 46, c.body[1]!);
    dot(ctx, x - 1 + step * s, 46, BONE[2]!, 3, 1);
  }
  paintBlob(ctx, [[24, 28, 11], [14, 30, 8], [34, 27, 8]], c.body, 42, 18);
  for (let i = 0; i < 8; i++) line(ctx, 14 + i * 3, 19 + Math.abs(i - 4) * 0.5, 13 + i * 3, 11 + (i % 2) * 3, BONE[2 + (i % 2)]!);
  paintBlob(ctx, [[8, 26 + (f % 2), 6], [4, 29 + (f % 2), 4]], c.body, 36, 19);
  for (let i = 0; i < 4; i++) dot(ctx, 2 + i * 2, 31 + (f % 2), BONE[3]!, 1, 2);
  eyes(ctx, [[6, 24 + (f % 2)], [9, 24 + (f % 2)]], c);
  for (let i = 0; i < 6; i++) dot(ctx, 18 + i * 2, 26, c.body[0]!, 1, 4);
};

/** Act 6: the gardener — a hulking figure with great shears. */
const gardener: Painter = (ctx, f, c) => {
  const open = f % 2 ? 4 : 1, bob = [0, 1, 1, 0][f]!;
  line(ctx, 18, 38, 16, 51, WOOD[1]!);
  line(ctx, 19, 38, 17, 51, WOOD[2]!);
  line(ctx, 29, 38, 31, 51, WOOD[1]!);
  line(ctx, 30, 38, 32, 51, WOOD[2]!);
  paintBlob(ctx, [[24, 28 + bob, 12], [24, 36 + bob, 8], [13, 22 + bob, 6], [35, 22 + bob, 6]], c.body, 46, 20);
  paintBlob(ctx, [[24, 12 + bob, 6]], BONE, 20, 21);
  dot(ctx, 17, 7 + bob, WOOD[1]!, 14, 2);
  dot(ctx, 20, 4 + bob, WOOD[2]!, 8, 3);
  eyes(ctx, [[22, 13 + bob], [26, 13 + bob]], c);
  line(ctx, 38, 28 + bob, 46, 2 + bob, BONE[3]!);
  line(ctx, 38, 28 + bob, 46 - open * 2, 3 + bob, BONE[2]!);
  paintBlob(ctx, [[38, 29 + bob, 3.5]], WOOD, 34, 22);
  paintBlob(ctx, [[10, 30 + bob, 3.5]], BONE, 34, 23);
};

/** Act 7: the herald — a hooded wraith trailing wisps, carrying twin lights. */
const herald: Painter = (ctx, f, c) => {
  const bob = [0, 1, 2, 1][f]!;
  for (let i = 0; i < 5; i++) line(ctx, 18 + i * 3, 36 + bob, 16 + i * 4 + Math.sin(f + i) * 3, 50, c.body[i % 2 ? 1 : 0]!);
  paintBlob(ctx, [[24, 26 + bob, 10], [24, 34 + bob, 8], [24, 16 + bob, 7]], c.body, 46, 24);
  dot(ctx, 21, 15 + bob, OUTLINE, 7, 5);
  eyes(ctx, [[23, 18 + bob], [26, 18 + bob]], c);
  for (const s of [-1, 1]) {
    line(ctx, 24 + s * 8, 24 + bob, 24 + s * 16, 30 - bob, c.body[2]!);
    paintBlob(ctx, [[24 + s * 17, 32 - bob, 3 + (f % 2) * 0.5]], [c.accent[0], c.accent[0], c.accent[1], '#ffffff'], 36, 25);
  }
};

/** Act 9: the grafting mother — a great spider with a cocoon-heavy abdomen. */
const mother: Painter = (ctx, f, c) => {
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    const kx = 24 + s * (10 + i * 3), ky = 20 - i * 2 + ((i + f) % 2) * 2;
    line(ctx, 24, 30, kx, ky, WOOD[1]!);
    line(ctx, kx, ky, 24 + s * (14 + i * 4), 50, WOOD[0]!);
  }
  paintBlob(ctx, [[24, 38, 11], [24, 30, 8]], c.body, 50, 26);
  for (let i = 0; i < 5; i++) paintBlob(ctx, [[17 + i * 3.5, 40 + (i % 2) * 3, 2.4]], BONE, 50, 27 + i);
  paintBlob(ctx, [[24, 18 + (f % 2), 6], [24, 10 + (f % 2), 5]], BONE, 24, 32);
  for (let i = 0; i < 5; i++) line(ctx, 20 + i * 2, 6 + (f % 2), 18 + i * 3, i % 2 ? 0 : 2, c.body[2]!);
  eyes(ctx, [[22, 10 + (f % 2)], [26, 10 + (f % 2)]], c);
};

/** Act 10: the cocoon-born — a winged being in a split shell under a halo. */
const cocoonBorn: Painter = (ctx, f, c) => {
  const beat = [0, 2, 4, 2][f]!;
  for (const s of [-1, 1]) for (let i = 0; i < 5; i++) {
    line(ctx, 24 + s * 5, 22, 24 + s * (12 + i * 2.5), 6 + i * 6 + beat - i, i % 2 ? c.accent[0] : BONE[3]!);
  }
  paintBlob(ctx, [[24, 30, 9], [24, 38, 7]], BONE, 46, 33);
  paintBlob(ctx, [[24, 26, 5]], [c.body[1]!, c.body[2]!, c.accent[0], c.accent[1]], 32, 34);
  paintBlob(ctx, [[24, 14, 5]], BONE, 20, 35);
  for (let a = 0; a < 32; a++) dot(ctx, 24 + Math.cos(a / 5.1) * 8, 7 + Math.sin(a / 5.1) * 2.5, c.accent[a % 5 ? 0 : 1]);
  eyes(ctx, [[22, 15], [26, 15]], c);
  for (let i = 0; i < 6; i++) dot(ctx, 17 + i * 3, 44 + (i % 2), BONE[0]!, 2, 3);
};

const HOOD_PALE = ['#5a4a58', '#8a7890', '#b8a8c0', '#e8dcef'];
const HOOD_MOSS = ['#23321c', '#3a5028', '#587238', '#7c9a50'];
const HOOD_ASH = ['#2e2a28', '#4a4440', '#6e6660', '#968c84'];

const BOSSES: Record<number, Painter> = {
  1: rootHorror,
  2: robed({ hood: HOOD_PALE, trim: '#e8c060', halo: true }),
  3: beast,
  4: robed({ hood: HOOD_PALE, trim: '#ffe890', halo: true }),
  5: robed({ hood: HOOD_MOSS, trim: '#a0d060', antlers: true }),
  6: gardener,
  7: herald,
  8: robed({ hood: HOOD_ASH, trim: '#c090ff', staff: true }),
  9: mother,
  10: cocoonBorn
};

const made = new Map<string, EnemyArt>();

function build(key: string, w: number, h: number, frames: number, frameMs: number, facesLeft: boolean, c: Colors, paint: Painter): EnemyArt {
  const hit = made.get(key);
  if (hit) return hit;
  const { canvas, rects } = strip(key, w, h, frames, c, paint);
  const art = { image: canvas, frames: rects, frameMs, height: h + 2, facesLeft };
  made.set(key, art);
  return art;
}

/** The act's three enemy strips, recoloured by its element. */
export function actEnemies(act: number): Record<EnemyKind, EnemyArt> {
  const c = ELEMENT[actText(act).element], species = act % 3;
  const normal = species === 1 ? build(`spider:${act}`, 20, 14, 4, 90, true, c, spider)
    : species === 2 ? build(`slime:${act}`, 16, 13, 4, 130, false, c, slime)
    : build(`leech:${act}`, 20, 10, 4, 110, true, c, leech);
  return {
    normal,
    elite: build(`puppet:${act}`, 21, 26, 4, 150, false, c, puppet),
    boss: build(`boss:${act}`, BW, BH, 4, 200, true, c, BOSSES[act] ?? rootHorror)
  };
}
