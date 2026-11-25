// Ground danger tiles for cell attacks (the Rootlet's waves, the chorus seed's aimed cell), drawn in whole dots into the painted
// ground and in its own colours. A cell that will be struck stays its own soil, a little darker, crossed by two to four long thin
// branching cracks; only their seams glow, one dot wide with a one-dot soft spill, brighter toward the hit, and a slight warm lift joins
// the cell in the last stretch. Its edge is a broken ember line of seam fragments one dot inside the open sides (corners open, no drawn
// rectangle or dark line). When the cell is struck those same cracks split open, dark below and ember above, and fade to dark scars. A
// wave that is not yet next keeps only a quiet cool edge. Whoever stands on a glowing cell gets a soft underglow on the ground around the
// feet (the sprites themselves are never tinted). The warned cells also come alive (paintDangerLife): light from below that pulses
// faster toward the hit, ember light flowing along the cracks, motes rising and, in the last stretch, motes drawn inward to the middle.
// Paint only: the cells come from the combat snapshot.
import { emitter, paintConverge, paintGlow, paintMotes, seededRandom } from './fx-particles.mjs';

/** Muted ramps of the soil (Rootlet) and of the chaos element on stone (the chorus seed): shade multiplies the ground a little, split is
 * the dark of an opened crack, ember steps 0 (first warning) … 3 (just before the hit), hot only on the hottest dots, light is the spill
 * on the ground and lift the warm lift of the last stretch, both drawn with glow: added onto dark soil, laid over as a tint on light
 * stone (where added light would only wash toward white). rim: a denser perimeter, quieter on the back edge the feet cover. */
const EARTH = /* @__PURE__ */ Object.freeze({
    shade: '#a87060', shadeAlpha: [0.24, 0.12], split: '#2a1814', cool: '#4a2e26', rim: false, glow: 'lighter', spill: [0.38, 0.3], liftAlpha: 0.18,
    ember: ['#b8643a', '#cc6e36', '#e07c3a', '#f49044'], hot: '#ffb36a', light: '#7c3c12', lift: '#6a3414', under: '#a04e1e', underAlpha: [0.24, 0.45], dusk: ''
});
const CHAOS = /* @__PURE__ */ Object.freeze({
    shade: '#9a8aa4', shadeAlpha: [0.1, 0.1], split: '#3a2840', cool: '#5a4468', rim: true, glow: 'source-over', spill: [0.1, 0.14], liftAlpha: 0,
    ember: ['#7a4c9c', '#8650b0', '#9256c2', '#a060d0'], hot: '#c890ec', light: '#7a48a8', lift: '#7a48a8', under: '#9058c8', underAlpha: [0.34, 0.42], dusk: '#5e4478'
});
const LATER = '#9aa0aa';
// Safe cells borrow the scene's own pale sand (the ground's and the hero's highlights).
const SAFE = /* @__PURE__ */ Object.freeze({ tick: '#dcc6a6', ink: '#2a1c1a' });
const SIDES = /* @__PURE__ */ Object.freeze([[0, -1], [1, 0], [0, 1], [-1, 0]]);
const cracks = new Map();
const edges = new Map();
const sprites = new Map();
const halos = new Map();
// The caches keep one entry per cell and size; a long session over many maps starts them afresh past these sizes.
const SPRITE_LIMIT = 240;
const SHAPE_LIMIT = 800;

/** One art dot for the warning tiles at this tile size (2 px on a 390 px phone, 3 px on a PC). */
export function dangerTileDot(footprint) {
    return Math.max(1, Math.round(footprint.tileH / 13));
}

/** The palette a struck or warned cell uses. */
function dangerTileTones(chaos) {
    return chaos ? CHAOS : EARTH;
}

/** A small seeded random source for one cell (the same numbers every time for this cell and salt). */
export const cellRandom = seededRandom;

function cellBox({ x, y }, { tileW, tileH }) {
    const left = Math.round(x - tileW / 2), top = Math.round(y - tileH / 2);
    return { left, top, right: Math.round(x + tileW / 2), bottom: Math.round(y + tileH / 2) };
}

function cellKeys(points) {
    return new Set(points.map(({ gx, gy }) => `${gx}:${gy}`));
}

function openSides(point, keys) {
    return SIDES.filter(([dx, dy]) => !keys.has(`${point.gx + dx}:${point.gy + dy}`));
}

function heatStep(charge) {
    if (charge >= 0.84) return 3;
    if (charge >= 0.55) return 2;
    return charge >= 0.2 ? 1 : 0;
}

/** One crack: dots stepping out from `from` along `angle` (squashed to the ground's perspective) until `length` or the cell's inner
 * bounds. A main crack queues short side branches in `forks`. */
function walkCrack(dots, random, { from, angle, length, half, depth, forks }) {
    let [x, y] = from, heading = angle;
    for (let step = 1; step <= length; step++) {
        heading += (random() - 0.5) * 0.32;
        x += Math.cos(heading);
        y += Math.sin(heading) * 0.62;
        const at = [Math.round(x), Math.round(y)];
        if (Math.abs(at[0]) > half.x || Math.abs(at[1]) > half.y) return;
        dots.set(`${at[0]}:${at[1]}`, [at[0], at[1], step, depth]);
        if (depth || step <= 3 || random() >= 0.09) continue;
        forks.push({ from: at, angle: heading + (random() < 0.5 ? -1 : 1) * (0.6 + random() * 0.5), length: 2 + Math.floor(random() * 4), half, depth: 1 });
    }
}

/**
 * This cell's own cracks, in dots from the cell middle: two to four long thin cracks that run across the cell, mostly along it, with
 * short side branches, kept two dots inside the edges. [x, y, order, depth] per dot (order counts from the crack's start, depth 1 on a
 * side branch). The same every time for this cell and size.
 */
function cellCrack(point, cols, rows) {
    const key = `${point.gx}:${point.gy}:${cols}:${rows}`;
    if (cracks.has(key)) return cracks.get(key);
    if (cracks.size >= SHAPE_LIMIT) cracks.clear();
    const random = cellRandom(point.gx, point.gy, 7), half = { x: Math.floor(cols / 2) - 2, y: Math.max(1, Math.floor(rows / 2) - 2) };
    const dots = new Map(), forks = [], count = 2 + Math.floor(random() * 3);
    for (let i = 0; i < count; i++) {
        const from = [Math.round((random() - 0.5) * half.x * 1.4), Math.round((random() - 0.5) * half.y * 1.6)];
        dots.set(`${from[0]}:${from[1]}`, [from[0], from[1], 0, 0]);
        const angle = (from[0] > 0 ? Math.PI : 0) + (random() - 0.5) * 1.1;
        walkCrack(dots, random, { from, angle, length: Math.round(half.x * (0.8 + random() * 0.9)), half, depth: 0, forks });
    }
    for (const fork of forks) walkCrack(dots, random, { ...fork, forks });
    const list = [...dots.values()];
    cracks.set(key, list);
    return list;
}

/** The next stretch of an edge: seam fragments of a few dots, gaps of a few (shorter gaps on a dense rim). */
function nextStretch(random, crack, dense) {
    if (crack) return (dense ? 3 : 2) + Math.floor(random() * (dense ? 4 : 3));
    return (dense ? 0 : 1) + Math.floor(random() * (dense ? 2 : 3));
}

/** One cell side's broken ember line as [along, depth] dots one dot inside the side (now and then two), with the corners left open so
 * it never reads as a frame or a bracket. */
function edgeDots(point, side, length, dense) {
    const key = `${point.gx}:${point.gy}:${side[0]}:${side[1]}:${length}:${dense}`;
    if (edges.has(key)) return edges.get(key);
    if (edges.size >= SHAPE_LIMIT) edges.clear();
    const random = cellRandom(point.gx, point.gy, 20 + side[0] * 3 + side[1]), dots = [];
    let crack = random() < 0.5, left = nextStretch(random, crack, dense);
    for (let along = 2; along < length - 2; along++) {
        if (left-- <= 0) {
            crack = !crack;
            left = nextStretch(random, crack, dense) - 1;
        }
        if (crack) dots.push([along, random() < 0.12 ? 2 : 1]);
    }
    edges.set(key, dots);
    return dots;
}

/** A dot of a side's seam in sprite pixels (the sprite is the cell box). */
function edgeAt([along, depth], side, size, p) {
    const [dx, dy] = side;
    if (dy < 0) return [along * p, depth * p];
    if (dy > 0) return [along * p, size.h - (depth + 1) * p];
    if (dx < 0) return [depth * p, along * p];
    return [size.w - (depth + 1) * p, along * p];
}

function paintEdgeDots(paint, list, { side, size, p }, grow = 0) {
    paint.beginPath();
    for (const dot of list) {
        const [x, y] = edgeAt(dot, side, size, p);
        paint.rect(x - grow, y - grow, p + 2 * grow, p + 2 * grow);
    }
    paint.fill();
}

function paintCrackDots(paint, dots, { cx, cy, p }, grow = 0) {
    paint.beginPath();
    for (const [x, y] of dots) paint.rect(cx + x * p - grow, cy + y * p - grow, p + 2 * grow, p + 2 * grow);
    paint.fill();
}

function crackOrigin(size, p) {
    return { cx: Math.floor(size.w / 2 / p) * p, cy: Math.floor(size.h / 2 / p) * p, p };
}

/** The cracks showing at this heat step: the long cracks from the first warning, their side branches once it warms. */
function shownCracks(point, size, p, step) {
    const crack = cellCrack(point, Math.floor(size.w / p), Math.floor(size.h / p));
    return step ? crack : crack.filter(dot => !dot[3]);
}

function sideDots(point, side, size, p, dense) {
    return edgeDots(point, side, side[0] ? Math.floor(size.h / p) : Math.ceil(size.w / p), dense);
}

/** The seams of one cell at one heat step, one dot wide, drawn once into a cell-sized sprite. A rim cell's back edge stays quieter. */
function paintTileSprite(paint, { point, sides, size, p }, { tones, step }) {
    const crack = shownCracks(point, size, p, step), at = crackOrigin(size, p);
    paint.fillStyle = tones.ember[step];
    paintCrackDots(paint, crack, at);
    if (step >= 3) {
        paint.fillStyle = tones.hot;
        paintCrackDots(paint, crack.filter(dot => dot[2] % 5 === 2), at);
    }
    for (const side of sides) {
        paint.fillStyle = tones.rim && side[1] < 0 ? tones.ember[Math.max(0, step - 2)] : tones.ember[step];
        paintEdgeDots(paint, sideDots(point, side, size, p, tones.rim), { side, size, p });
    }
}

function paintLaterSprite(paint, { point, sides, size, p }) {
    paint.fillStyle = LATER;
    for (const side of sides) paintEdgeDots(paint, sideDots(point, side, size, p, false), { side, size, p });
}

/** The seams' soft spill on the soil: every seam dot grown by one dot, in the light colour (added onto the ground when drawn). */
function paintHaloSprite(paint, { point, sides, size, p }, { tones, step }) {
    paint.fillStyle = tones.light;
    paintCrackDots(paint, shownCracks(point, size, p, step), crackOrigin(size, p), p);
    for (const side of sides) paintEdgeDots(paint, sideDots(point, side, size, p, tones.rim), { side, size, p }, p);
}

/** One cell's cached picture at this heat step: its seams (or the later wave's cool edge), or with `halo` their spill. */
function tileSprite(ctx, cell, look, halo = false) {
    const { point, sides, size, p } = cell, cache = halo ? halos : sprites;
    const key = `${point.gx}:${point.gy}:${sides.map(side => side.join(',')).join('|')}:${size.w}x${size.h}:${p}:${look.later ? 'later' : look.tones.split + look.step}`;
    if (cache.has(key)) return cache.get(key);
    if (cache.size >= SPRITE_LIMIT) cache.clear();
    const canvas = ctx.canvas.ownerDocument.createElement('canvas');
    canvas.width = size.w; canvas.height = size.h;
    const paint = canvas.getContext('2d');
    if (halo) paintHaloSprite(paint, cell, look);
    else if (look.later) paintLaterSprite(paint, cell);
    else paintTileSprite(paint, cell, look);
    cache.set(key, canvas);
    return canvas;
}

/** The soil a little darker (multiplied, so its own texture stays), and over the last stretch a slight warm lift added onto it. */
function paintSoil(ctx, box, look) {
    const { tones, charge, fade } = look, w = box.right - box.left, h = box.bottom - box.top;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = tones.shade;
    ctx.globalAlpha = fade * (tones.shadeAlpha[0] + tones.shadeAlpha[1] * charge);
    ctx.fillRect(box.left, box.top, w, h);
    if (charge <= 0.7 || !tones.liftAlpha) return;
    ctx.globalCompositeOperation = tones.glow;
    ctx.fillStyle = tones.lift;
    ctx.globalAlpha = fade * tones.liftAlpha * (charge - 0.7) / 0.3;
    ctx.fillRect(box.left, box.top, w, h);
}

/**
 * Ground pass, under the actors (inside the caller's terrain clip).
 * @param {{points:Array<{gx:number,gy:number,x:number,y:number}>,tileW:number,tileH:number}} footprint
 * @param {{charge?:number, later?:boolean, chaos?:boolean}} warning charge 0 → 1 until this wave lands; later: a wave that is not yet
 * next; chaos: the chaos element's ramp instead of the soil's
 */
export function paintDangerTiles(ctx, footprint, warning) {
    const p = dangerTileDot(footprint), keys = cellKeys(footprint.points), fade = ctx.globalAlpha, charge = warning.charge || 0;
    const look = { later: !!warning.later, tones: dangerTileTones(warning.chaos), step: heatStep(charge), charge, p, fade };
    ctx.save();
    ctx.filter = 'none';
    ctx.imageSmoothingEnabled = false;
    for (const point of footprint.points) {
        const box = cellBox(point, footprint), size = { w: box.right - box.left, h: box.bottom - box.top };
        const cell = { point, sides: openSides(point, keys), size, p };
        if (!look.later) {
            paintSoil(ctx, box, look);
            ctx.globalCompositeOperation = look.tones.glow;
            ctx.globalAlpha = fade * (look.tones.spill[0] + look.tones.spill[1] * charge);
            ctx.drawImage(tileSprite(ctx, cell, look, true), box.left, box.top);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade * (look.later ? 0.4 : 1);
        ctx.drawImage(tileSprite(ctx, cell, look), box.left, box.top);
    }
    ctx.restore();
}

/** Ember light running along each crack: bright bands that travel outward from the crack's start, faster as the hit nears. */
function paintCrackFlow(ctx, { point, box, size }, look) {
    const { tones, p, time, charge } = look, at = crackOrigin(size, p), speed = 0.6 + 2.6 * charge, hot = [], warm = [];
    for (const dot of shownCracks(point, size, p, heatStep(charge))) {
        const band = ((dot[2] / 9 - time * speed + (dot[3] ? 0.5 : 0)) % 1 + 1) % 1;
        if (band < 0.14) hot.push(dot);
        else if (band < 0.3) warm.push(dot);
    }
    const cell = { cx: box.left + at.cx, cy: box.top + at.cy, p };
    ctx.globalAlpha = 0.45 + 0.55 * charge;
    ctx.fillStyle = tones.ember[3];
    paintCrackDots(ctx, warm, cell);
    ctx.fillStyle = tones.hot;
    paintCrackDots(ctx, hot, cell);
    ctx.globalAlpha = 1;
}

/** Motes rising from the cell (more as the hit nears) and, past the middle of the warning, motes drawn inward to its middle. */
function paintCellMotes(ctx, { point, cx, cy, footprint }, look) {
    const { tones, p, time, charge } = look, { tileW, tileH } = footprint;
    const motes = emitter(`mote:${point.gx}:${point.gy}:${tileW}`, 8, random => ({ dx: (random() - 0.5) * tileW * 0.7,
        dy: (random() - 0.4) * tileH * 0.5, rise: tileH * (0.6 + random() * 0.6), sway: random() * 1.5 * p, period: 0.9 + random() * 0.7,
        phase: random(), hot: random() < 0.35 }));
    paintMotes(ctx, motes.slice(0, 3 + Math.round(5 * charge)), { x: cx, y: cy, time, p, strength: 0.75 + 0.25 * charge, tones: [tones.hot, tones.ember[2]] });
    if (charge <= 0.5) return;
    const inward = emitter(`inward:${point.gx}:${point.gy}:${tileW}`, 5, random => ({ angle: random() * Math.PI * 2,
        dist: tileW * (0.42 + random() * 0.16), period: 0.42 + random() * 0.2, phase: random() }));
    paintConverge(ctx, inward, { x: cx, y: cy, time, p, strength: (charge - 0.5) / 0.5, squash: tileH / tileW, tones: [tones.hot, tones.ember[1]] });
}

/**
 * The warned cells come alive, drawn after paintDangerTiles and outside any cell clip so motes can rise: light from below that pulses
 * faster toward the hit, ember light flowing along each crack, motes rising and, in the last stretch, motes drawn inward.
 * @param {{points:Array<{gx:number,gy:number,x:number,y:number}>,tileW:number,tileH:number}} footprint
 * @param {{charge?:number, later?:boolean, chaos?:boolean, time?:number, reduced?:boolean}} warning time in ms (any running clock)
 */
export function paintDangerLife(ctx, footprint, warning) {
    if (warning.later) return;
    const p = dangerTileDot(footprint), tones = dangerTileTones(warning.chaos), charge = warning.charge || 0;
    const look = { tones, p, charge, time: (warning.time ?? globalThis.performance.now()) / 1000 };
    const pulse = warning.reduced ? 1 : 0.7 + 0.3 * Math.cos(Math.PI * 2 * charge * charge * 6);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const point of footprint.points) {
        const box = cellBox(point, footprint), cx = (box.left + box.right) / 2, cy = (box.top + box.bottom) / 2;
        // On pale stone the cell first sinks into a soft violet shadow (round, no edge), so its glow reads against the floor.
        if (tones.dusk) paintGlow(ctx, { x: cx, y: cy, rx: footprint.tileW * 0.78, ry: footprint.tileH * 0.86, colour: tones.dusk,
            alpha: 0.55 + 0.35 * charge, mode: 'multiply' });
        paintGlow(ctx, { x: cx, y: cy, rx: footprint.tileW * 0.64, ry: footprint.tileH * 0.7, colour: tones.under,
            alpha: (tones.underAlpha[0] + tones.underAlpha[1] * charge) * pulse, mode: tones.glow });
        if (warning.reduced) continue;
        paintCrackFlow(ctx, { point, box, size: { w: box.right - box.left, h: box.bottom - box.top } }, look);
        paintCellMotes(ctx, { point, cx, cy, footprint }, look);
    }
    ctx.restore();
}

/** Colours of a struck cell's seam over time, down the ember ramp to the split's dark. */
function strikeSeam(tones, age, heavy) {
    const t = age / (heavy ? 1.25 : 1);
    if (t < 55) return tones.hot;
    if (t < 110) return tones.ember[3];
    if (t < 165) return tones.ember[2];
    if (t < 225) return tones.ember[1];
    return t < 290 ? tones.ember[0] : tones.cool;
}

/** Light on the soil of the struck cell: stepped ovals added onto the ground, so its texture stays and only warms. */
function strikeLight(ctx, at, { tones, heat, heavy, size, boost = 1 }) {
    ctx.globalCompositeOperation = tones.glow;
    ctx.fillStyle = tones.light;
    for (const [reach, alpha] of [[0.48, 0.2], [0.36, 0.24], [0.24, 0.28]]) {
        ctx.globalAlpha = Math.min(1, alpha * heat * (heavy ? 1.25 : 1.12) * boost);
        steppedOval(ctx, { cx: at.cx, cy: at.cy, rx: size.w * reach, ry: size.h * reach * 1.15 }, at.p);
    }
    ctx.globalCompositeOperation = 'source-over';
}

/** One stepped oval in whole dots. */
export function steppedOval(ctx, { cx, cy, rx, ry }, p) {
    const rows = Math.max(1, Math.round(ry / p));
    ctx.beginPath();
    for (let r = -rows; r <= rows; r++) {
        const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (r / (rows + 0.5)) ** 2)) / p) * p;
        ctx.rect(cx - half, cy + r * p, 2 * half, p);
    }
    ctx.fill();
}

/** The cracks split open: the dark of the opening a dot below each seam (two on a heavy strike), the seam's soft spill while hot, the
 * seam itself going from hot to the split's dark. */
function paintStrikeCrack(ctx, crack, at, look) {
    const { tones, age, heavy, heat } = look;
    // The opening reads as shadow in the soil, never a black stroke.
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = tones.split;
    paintCrackDots(ctx, crack, { ...at, cy: at.cy + at.p });
    if (heavy) paintCrackDots(ctx, crack, { ...at, cy: at.cy + 2 * at.p });
    if (heat > 0.3) {
        ctx.globalCompositeOperation = tones.glow;
        ctx.globalAlpha = (heavy ? 0.5 : 0.4) * heat;
        ctx.fillStyle = tones.light;
        paintCrackDots(ctx, crack, at, at.p);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = strikeSeam(tones, age, heavy);
    paintCrackDots(ctx, crack, at);
}

function paintStrikeCell(ctx, { point, box }, look) {
    const { p, size, age, heavy, reduced } = look, origin = crackOrigin(size, p);
    const at = { cx: box.left + origin.cx, cy: box.top + origin.cy, p };
    const heat = Math.max(0, 1 - age / (heavy ? 230 : 180)), light = reduced ? Math.min(0.7, heat) : heat;
    if (light > 0) strikeLight(ctx, at, { ...look, heat: light });
    paintStrikeCrack(ctx, cellCrack(point, Math.floor(size.w / p), Math.floor(size.h / p)), at, { ...look, heat });
}

/**
 * Inside the struck cells (the caller clips to them, so the safe cells between stay clear): each cell's own cracks split open, dark
 * below and ember above, with warm light on the soil, and cool to dark lines.
 * @param {{age:number, heavy:boolean, reduced:boolean, chaos?:boolean, boost?:number}} strike age in visual ms since contact; heavy: a
 * wider split and more light, for longer; boost: more light on the cell (a single struck cell)
 */
export function paintTileStrike(ctx, footprint, strike) {
    const p = dangerTileDot(footprint), tones = dangerTileTones(strike.chaos);
    ctx.save();
    ctx.filter = 'none';
    for (const point of footprint.points) {
        const box = cellBox(point, footprint);
        paintStrikeCell(ctx, { point, box }, { ...strike, p, tones, size: { w: box.right - box.left, h: box.bottom - box.top } });
    }
    ctx.restore();
}

/** The dark cracks a strike leaves (its scar: the seam and the opening below it), at the caller's alpha. */
export function paintTileScar(ctx, footprint) {
    const p = dangerTileDot(footprint);
    ctx.fillStyle = EARTH.split;
    for (const point of footprint.points) {
        const box = cellBox(point, footprint), size = { w: box.right - box.left, h: box.bottom - box.top };
        const origin = crackOrigin(size, p), crack = cellCrack(point, Math.floor(size.w / p), Math.floor(size.h / p));
        paintCrackDots(ctx, crack, { cx: box.left + origin.cx, cy: box.top + origin.cy, p });
        paintCrackDots(ctx, crack, { cx: box.left + origin.cx, cy: box.top + origin.cy + p, p });
    }
}

/**
 * Ground pass, under the sprites: a soft glow in the cell's colour on the ground around each foot standing on one of these cells, so the
 * light of a glowing cell reaches whoever stands on it (the sprites themselves are left as drawn).
 * @param {{points:Array<{gx:number,gy:number,x:number,y:number}>,tileW:number,tileH:number}} footprint the glowing cells
 * @param {Array<{x:number,y:number}>} feet ground points of the actors' feet
 * @param {{strength:number, chaos?:boolean}} glow strength 0 → 1
 */
export function paintFootGlow(ctx, footprint, feet, glow) {
    if (!(glow.strength > 0)) return;
    const p = dangerTileDot(footprint), { tileW, tileH } = footprint, tones = dangerTileTones(glow.chaos);
    const standing = feet.filter(foot => foot && footprint.points.some(cell => Math.abs(foot.x - cell.x) < tileW / 2 && Math.abs(foot.y - cell.y) < tileH / 2));
    if (!standing.length) return;
    ctx.save();
    ctx.globalCompositeOperation = tones.glow;
    ctx.fillStyle = tones.light;
    for (const foot of standing) {
        for (const [reach, alpha] of [[0.56, 0.22], [0.38, 0.26]]) {
            ctx.globalAlpha = alpha * Math.min(1, glow.strength);
            steppedOval(ctx, { cx: Math.round(foot.x / p) * p, cy: Math.round(foot.y / p) * p, rx: tileW * reach, ry: tileH * reach * 0.8 }, p);
        }
    }
    ctx.restore();
}

/** @param {number[]} corner [x, y, x step, y step] of an L mark's corner dot */
function tick(ctx, corner, p, length = 2) {
    const [x, y, sx, sy] = corner, arm = length * p;
    ctx.fillRect(sx > 0 ? x : x - arm + p, y, arm, p);
    ctx.fillRect(x, sy > 0 ? y : y - arm + p, p, arm);
}

/**
 * The open cells around the hero while a wave nears: four tiny sand corner ticks at a low alpha, nothing else (ground pass, inside the
 * caller's terrain clip).
 * @param {{points:Array<{gx:number,gy:number,x:number,y:number}>,tileW:number,tileH:number}} footprint the safe cells
 */
export function paintSafeTicks(ctx, footprint, strength) {
    const p = dangerTileDot(footprint), inset = 2 * p;
    const corners = footprint.points.flatMap(point => {
        const { left, top, right, bottom } = cellBox(point, footprint);
        return [[left + inset, top + inset, 1, 1], [right - inset - p, top + inset, -1, 1],
            [left + inset, bottom - inset - p, 1, -1], [right - inset - p, bottom - inset - p, -1, -1]];
    });
    ctx.save();
    ctx.globalAlpha = strength * 0.4;
    ctx.fillStyle = SAFE.ink;
    ctx.translate(p, p);
    for (const corner of corners) tick(ctx, corner, p, 2);
    ctx.translate(-p, -p);
    ctx.globalAlpha = strength * 0.55;
    ctx.fillStyle = SAFE.tick;
    for (const corner of corners) tick(ctx, corner, p, 2);
    ctx.restore();
}
