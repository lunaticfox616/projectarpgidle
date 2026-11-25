// Ground danger tiles for cell attacks (the Rootlet's waves, the chorus seed's aimed cell), drawn in whole dots into the painted
// ground. A cell that will be struck heats up instead of wearing a card: a thin warm tint over the soil, a scattered heat dither that
// closes from the cell edges toward its middle as the strike nears, an ember edge of crack dots along the wave's outer boundary and
// the cell's own crack scored into the soil, glowing brighter toward the hit. When the cell is struck that same crack opens white-hot
// and light washes over the soil around it, then it cools to a dark scar. A wave that is not yet next keeps only a cool broken edge.
// Paint only: the cells come from the combat snapshot.

/** Heat steps of the warm earth (Rootlet) and of the chaos element (the chorus seed): index 0 far from the hit … 3 just before it. */
const EARTH = /* @__PURE__ */ Object.freeze({
    ink: '#1c0d0b', tint: ['#b23c1a', '#cc4a1e', '#e45c24', '#ff7430'], heat: ['#6e2414', '#8e3018', '#b8461c', '#e06424'],
    ember: ['#c24e20', '#e05e28', '#ff8232', '#ffb04c'], core: ['#c8562a', '#ff9440', '#ffc25c', '#fff0b0'],
    seam: ['#2e120e', '#7a2c16', '#d8622a', '#ffc86a'], light: '#ff6a24', flash: '#fff2c4', tintAlpha: [0.2, 0.45], sparse: 0.12
});
const CHAOS = /* @__PURE__ */ Object.freeze({
    ink: '#3a1a58', tint: ['#5c2a8e', '#7034ac', '#8c42d2', '#a656f2'], heat: ['#5a2c86', '#6a34a0', '#8040c0', '#9a50dc'],
    ember: ['#6c3aa6', '#8a4cc8', '#c07cff', '#deb0ff'], core: ['#a868e8', '#c890ff', '#e6c0ff', '#fff2ff'],
    seam: ['#22102e', '#552684', '#a464e0', '#eecbff'], light: '#9440e0', flash: '#fff4ff', tintAlpha: [0.18, 0.6], sparse: 0.2
});
const LATER = '#a9b6c8';
const SAFE = /* @__PURE__ */ Object.freeze({ tick: '#b8ffd4', ink: '#0e1e16' });
const SIDES = /* @__PURE__ */ Object.freeze([[0, -1], [1, 0], [0, 1], [-1, 0]]);
const patterns = new Map();
const cracks = new Map();
const edges = new Map();
const sprites = new Map();
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
export function cellRandom(gx, gy, salt) {
    let state = Math.imul(gx ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(gy + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(salt + 1, 0x27d4eb2f);
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

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
    if (charge >= 0.62) return 2;
    return charge >= 0.34 ? 1 : 0;
}

/** A cached scatter of single dots (a fixed noise field thresholded at `density`), so denser scatters keep the sparser dots. */
function scatterPattern(ctx, density, colour, p) {
    const key = `${density}|${colour}|${p}`;
    if (patterns.has(key)) return patterns.get(key);
    const size = 12, tile = ctx.canvas.ownerDocument.createElement('canvas'), random = cellRandom(5, 11, 3);
    tile.width = tile.height = size * p;
    const paint = tile.getContext('2d');
    paint.fillStyle = colour;
    for (let i = 0; i < size * size; i++) if (random() < density) paint.fillRect((i % size) * p, Math.floor(i / size) * p, p, p);
    const pattern = ctx.createPattern(tile, 'repeat');
    patterns.set(key, pattern);
    return pattern;
}

/** Charge 0 → 1 over the whole warning; the heat band starts one dot thick and covers the cell when it lands. */
function bandOf(box, charge, p) {
    const ease = Math.min(1, Math.max(0, charge)) ** 1.5;
    const halfW = (box.right - box.left) / 2, halfH = (box.bottom - box.top) / 2;
    const bx = Math.max(p, Math.round(ease * halfW / p) * p), by = Math.max(p, Math.round(ease * halfH / p) * p);
    return { bx: Math.min(bx, Math.ceil(halfW)), by: Math.min(by, Math.ceil(halfH)) };
}

function fillBand(ctx, box, band) {
    const { left, top, right, bottom } = box, { bx, by } = band;
    ctx.beginPath();
    ctx.rect(left, top, right - left, by);
    ctx.rect(left, bottom - by, right - left, by);
    ctx.rect(left, top + by, bx, bottom - top - 2 * by);
    ctx.rect(right - bx, top + by, bx, bottom - top - 2 * by);
    ctx.fill();
}

/** One branch of a crack: dots stepping out from `from` along `angle` (squashed to the ground's perspective) until `length`. A main
 * branch queues short side branches in `forks`. */
function walkCrack(dots, random, { from, angle, length, half, depth, forks }) {
    let [x, y] = from, heading = angle;
    for (let step = 1; step <= length; step++) {
        heading += (random() - 0.5) * 0.55;
        x += Math.cos(heading);
        y += Math.sin(heading) * 0.62;
        const at = [Math.round(x), Math.round(y)];
        if (Math.abs(at[0]) > half.x || Math.abs(at[1]) > half.y) return;
        dots.set(`${at[0]}:${at[1]}`, [at[0], at[1], step + (depth ? length : 0), depth]);
        if (depth || step <= 2 || random() >= 0.16) continue;
        forks.push({ from: at, angle: heading + (random() < 0.5 ? -1 : 1) * (0.7 + random() * 0.5), length: 2 + Math.floor(random() * 3), half, depth: 1 });
    }
}

/**
 * This cell's own crack, in dots from the cell middle: three to five radial branches from a point near the middle, with short side
 * branches. [x, y, order, depth] per dot (order grows outward, depth 1 on a side branch). The same every time for this cell and size.
 */
function cellCrack(point, cols, rows) {
    const key = `${point.gx}:${point.gy}:${cols}:${rows}`;
    if (cracks.has(key)) return cracks.get(key);
    if (cracks.size >= SHAPE_LIMIT) cracks.clear();
    const random = cellRandom(point.gx, point.gy, 7), half = { x: Math.floor(cols / 2) - 2, y: Math.floor(rows / 2) - 1 };
    const from = [Math.round((random() - 0.5) * half.x * 0.7), Math.round((random() - 0.5) * half.y * 0.6)];
    const dots = new Map([[`${from[0]}:${from[1]}`, [from[0], from[1], 0, 0]]]), count = 3 + Math.floor(random() * 3);
    const base = random() * Math.PI * 2, forks = [];
    for (let i = 0; i < count; i++) {
        const angle = base + i * Math.PI * 2 / count + (random() - 0.5) * 0.8;
        const reach = Math.abs(Math.cos(angle)) * half.x + Math.abs(Math.sin(angle)) * half.y * 1.4;
        walkCrack(dots, random, { from, angle, length: Math.max(3, Math.round(reach * (0.55 + random() * 0.45))), half, depth: 0, forks });
    }
    for (const fork of forks) walkCrack(dots, random, { ...fork, forks });
    const list = [...dots.values()];
    cracks.set(key, list);
    return list;
}

/** One cell side's ember edge as [along, depth] dots: a crack line that wobbles one dot in and out, with dark breaks, hot spots and
 * short spurs into the cell. */
function edgeDots(point, side, length) {
    const key = `${point.gx}:${point.gy}:${side[0]}:${side[1]}:${length}`;
    if (edges.has(key)) return edges.get(key);
    if (edges.size >= SHAPE_LIMIT) edges.clear();
    const random = cellRandom(point.gx, point.gy, 20 + side[0] * 3 + side[1]), dots = { ink: [], ember: [], hot: [], spur: [] };
    let depth = 0;
    for (let along = 0; along < length; along++) {
        const end = along < 2 || along > length - 3;
        depth = end ? 0 : (random() < 0.22 ? 1 - depth : depth);
        edgeStep(dots, random, { along, depth, end });
    }
    edges.set(key, dots);
    return dots;
}

function edgeStep(dots, random, { along, depth, end }) {
    dots.ink.push([along, depth]);
    const roll = random();
    if (roll < 0.1) dots.ink.push([along, depth + 1]);
    else (roll < 0.24 ? dots.hot : dots.ember).push([along, depth + 1]);
    if (end || random() >= 0.07) return;
    const lean = Math.floor(random() * 3) - 1;
    dots.spur.push([along, depth + 2], [along + lean, depth + 3]);
}

/** A dot of a side's edge in sprite pixels (the sprite is the cell box). */
function edgeAt([along, depth], side, size, p) {
    const [dx, dy] = side;
    if (dy < 0) return [along * p, depth * p];
    if (dy > 0) return [along * p, size.h - (depth + 1) * p];
    if (dx < 0) return [depth * p, along * p];
    return [size.w - (depth + 1) * p, along * p];
}

function paintEdgeDots(paint, list, { side, size, p }) {
    paint.beginPath();
    for (const dot of list) {
        const [x, y] = edgeAt(dot, side, size, p);
        paint.rect(x, y, p, p);
    }
    paint.fill();
}

function paintCrackDots(paint, dots, { cx, cy, p }, grow = 0) {
    paint.beginPath();
    for (const [x, y] of dots) paint.rect(cx + x * p - grow, cy + y * p - grow, p + 2 * grow, p + 2 * grow);
    paint.fill();
}

/** The part of the cell's crack already scored at this heat step (it reaches out from the crack's start as the hit nears). */
function scoredCrack(crack, step) {
    if (step >= 3) return crack;
    const reach = [2, 5, 9][step];
    return crack.filter(dot => dot[2] <= reach && !dot[3]);
}

function crackOrigin(size, p) {
    return { cx: Math.floor(size.w / 2 / p) * p, cy: Math.floor(size.h / 2 / p) * p, p };
}

/** Edge, spurs and scored crack of one cell at one heat step, drawn once into a cell-sized sprite. */
function paintTileSprite(paint, { point, sides, size, p }, { tones, step }) {
    const crack = scoredCrack(cellCrack(point, Math.floor(size.w / p), Math.floor(size.h / p)), step);
    paint.fillStyle = tones.seam[step];
    paint.globalAlpha = step ? 1 : 0.7;
    paintCrackDots(paint, crack, crackOrigin(size, p));
    paint.globalAlpha = 1;
    for (const side of sides) {
        const dots = edgeDots(point, side, side[0] ? Math.floor(size.h / p) : Math.ceil(size.w / p)), at = { side, size, p };
        paint.fillStyle = tones.ink;
        paintEdgeDots(paint, dots.ink, at);
        paint.fillStyle = step >= 3 ? tones.core[2] : tones.ember[step];
        paintEdgeDots(paint, dots.ember, at);
        paint.fillStyle = step >= 2 ? tones.core[step] : tones.ember[step];
        paintEdgeDots(paint, dots.hot, at);
        paint.fillStyle = step >= 2 ? tones.ember[step] : tones.ink;
        paintEdgeDots(paint, dots.spur, at);
    }
}

function paintLaterSprite(paint, { point, sides, size, p }) {
    paint.fillStyle = LATER;
    for (const side of sides) {
        const dots = edgeDots(point, side, side[0] ? Math.floor(size.h / p) : Math.ceil(size.w / p));
        paintEdgeDots(paint, dots.ember.filter((_, index) => index % 3 !== 2), { side, size, p });
    }
}

function tileSprite(ctx, cell, look) {
    const { point, sides, size, p } = cell;
    const key = `${point.gx}:${point.gy}:${sides.map(side => side.join(',')).join('|')}:${size.w}x${size.h}:${p}:${look.later ? 'later' : look.tones.ink + look.step}`;
    if (sprites.has(key)) return sprites.get(key);
    if (sprites.size >= SPRITE_LIMIT) sprites.clear();
    const canvas = ctx.canvas.ownerDocument.createElement('canvas');
    canvas.width = size.w; canvas.height = size.h;
    const paint = canvas.getContext('2d');
    if (look.later) paintLaterSprite(paint, cell);
    else paintTileSprite(paint, cell, look);
    sprites.set(key, canvas);
    return canvas;
}

/** The soil heating up: a thin tint that keeps the ground's own texture, a scattered heat dither, denser in the closing band. */
function paintHeat(ctx, box, look) {
    const { tones, step, charge, p, fade } = look, w = box.right - box.left, h = box.bottom - box.top;
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = fade * (tones.tintAlpha[0] + tones.tintAlpha[1] * charge);
    ctx.fillStyle = tones.tint[step];
    ctx.fillRect(box.left, box.top, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade * 0.85;
    ctx.fillStyle = scatterPattern(ctx, tones.sparse, tones.heat[step], p);
    ctx.fillRect(box.left, box.top, w, h);
    ctx.fillStyle = scatterPattern(ctx, 0.36, tones.heat[step], p);
    fillBand(ctx, box, bandOf(box, charge, p));
    if (charge <= 0.6) return;
    // The last stretch before the hit: light gathers in the soil, added onto it so the ground keeps its texture.
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.32 * (charge - 0.6) / 0.4;
    ctx.fillStyle = tones.light;
    steppedOval(ctx, { cx: Math.round((box.left + box.right) / 2 / p) * p, cy: Math.round((box.top + box.bottom) / 2 / p) * p, rx: w * 0.42, ry: h * 0.4 }, p);
}

/**
 * Ground pass, under the actors (inside the caller's terrain clip).
 * @param {{points:Array<{gx:number,gy:number,x:number,y:number}>,tileW:number,tileH:number}} footprint
 * @param {{charge?:number, later?:boolean, chaos?:boolean}} warning charge 0 → 1 until this wave lands; later: a wave that is not yet
 * next; chaos: the chaos element's violet instead of the warm earth tones
 */
export function paintDangerTiles(ctx, footprint, warning) {
    const p = dangerTileDot(footprint), keys = cellKeys(footprint.points), fade = ctx.globalAlpha, charge = warning.charge || 0;
    const look = { later: !!warning.later, tones: dangerTileTones(warning.chaos), step: heatStep(charge), charge, p, fade };
    ctx.save();
    ctx.filter = 'none';
    ctx.imageSmoothingEnabled = false;
    for (const point of footprint.points) {
        const box = cellBox(point, footprint), size = { w: box.right - box.left, h: box.bottom - box.top };
        if (!look.later) paintHeat(ctx, box, look);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade * (look.later ? 0.65 : 1);
        ctx.drawImage(tileSprite(ctx, { point, sides: openSides(point, keys), size, p }, look), box.left, box.top);
    }
    ctx.restore();
}

/** Colours of a struck cell's crack over time: white-hot, yellow, orange, cooling red, then the scar's dark. */
function strikeColours(tones, age, heavy) {
    const t = age / (heavy ? 1.25 : 1);
    if (t < 55) return { core: tones.flash, rim: tones.ember[3] };
    if (t < 110) return { core: tones.core[3], rim: tones.ember[3] };
    if (t < 165) return { core: tones.ember[3], rim: tones.ink };
    if (t < 225) return { core: tones.seam[2], rim: tones.ink };
    return { core: t < 290 ? tones.seam[1] : tones.seam[0], rim: tones.ink };
}

/** Light on the soil around the opening crack: stepped ovals added onto the ground, so its texture stays and only brightens. */
function strikeLight(ctx, at, { tones, heat, heavy, size }) {
    // 'lighter' adds the glow onto the ground already drawn: the soil brightens and keeps its texture (no filled card).
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = tones.light;
    for (const [reach, alpha] of [[0.48, 0.12], [0.36, 0.13], [0.24, 0.15]]) {
        ctx.globalAlpha = alpha * heat * (heavy ? 1.2 : 1);
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

/** The opening crack: a one-pixel rim, light spilling a dot around it while it is hot (more on a heavy strike), and its core. */
function paintStrikeCrack(ctx, crack, at, look) {
    const { tones, age, heavy, heat } = look, colours = strikeColours(tones, age, heavy);
    ctx.globalAlpha = 1;
    ctx.fillStyle = colours.rim;
    paintCrackDots(ctx, crack, at, 1);
    if (heat > 0.35) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (heavy ? 0.26 : 0.18) * heat;
        ctx.fillStyle = tones.light;
        paintCrackDots(ctx, crack, at, 1 + at.p);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
    }
    ctx.fillStyle = colours.core;
    paintCrackDots(ctx, crack, at, 0);
}

function paintStrikeCell(ctx, { point, box }, look) {
    const { p, size, age, heavy, reduced } = look;
    const crack = cellCrack(point, Math.floor(size.w / p), Math.floor(size.h / p)), origin = crackOrigin(size, p);
    const at = { cx: box.left + origin.cx, cy: box.top + origin.cy, p };
    const heat = Math.max(0, 1 - age / (heavy ? 230 : 180)), light = reduced ? Math.min(0.7, heat) : heat;
    if (light > 0) strikeLight(ctx, { ...at, cx: at.cx + crack[0][0] * p, cy: at.cy + crack[0][1] * p }, { ...look, heat: light });
    paintStrikeCrack(ctx, crack, at, { ...look, heat });
}

/**
 * Inside the struck cells (the caller clips to them, so the safe cells between stay clear): each cell's own crack opens white-hot,
 * light washes over the soil around it, and the crack cools to a dark line.
 * @param {{age:number, heavy:boolean, reduced:boolean, chaos?:boolean}} strike age in visual ms since contact; heavy: more light
 * around the crack, for longer
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

/** The dark crack a strike leaves (its scar), at the caller's alpha. */
export function paintTileScar(ctx, footprint) {
    const p = dangerTileDot(footprint);
    ctx.fillStyle = EARTH.ink;
    for (const point of footprint.points) {
        const box = cellBox(point, footprint), size = { w: box.right - box.left, h: box.bottom - box.top };
        const origin = crackOrigin(size, p);
        paintCrackDots(ctx, cellCrack(point, Math.floor(size.w / p), Math.floor(size.h / p)), { cx: box.left + origin.cx, cy: box.top + origin.cy, p });
    }
}

/** @param {number[]} corner [x, y, x step, y step] of an L mark's corner dot */
function tick(ctx, corner, p, length = 2) {
    const [x, y, sx, sy] = corner, arm = length * p;
    ctx.fillRect(sx > 0 ? x : x - arm + p, y, arm, p);
    ctx.fillRect(x, sy > 0 ? y : y - arm + p, p, arm);
}

/**
 * Mint corner ticks and a sparse mint scatter on the open cells around the hero while a wave nears (ground pass, inside the caller's
 * terrain clip).
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
    ctx.globalAlpha = strength * 0.65;
    ctx.fillStyle = scatterPattern(ctx, 0.26, SAFE.tick, p);
    for (const point of footprint.points) {
        const { left, top, right, bottom } = cellBox(point, footprint);
        ctx.fillRect(left + inset, top + inset, right - left - 2 * inset, bottom - top - 2 * inset);
    }
    ctx.globalAlpha = strength;
    ctx.fillStyle = SAFE.ink;
    ctx.translate(p, p);
    for (const corner of corners) tick(ctx, corner, p, 4);
    ctx.translate(-p, -p);
    ctx.fillStyle = SAFE.tick;
    for (const corner of corners) tick(ctx, corner, p, 4);
    ctx.restore();
}
