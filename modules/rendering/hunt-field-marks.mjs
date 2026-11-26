// The hunt traits' floor marks (사멸 파동 per element, 용암 발자국, 침식 고리), drawn in code under the actors with no cell square and no
// outline. A warned cell sinks into a soft shade of its element and glows from below, and the element's own effect builds on it toward
// the hit: ice shards pushing up, crackling arcs under a ball of static, flame tongues, a small violet rift, or glowing cracks with trembling
// stones. In the last stretch light is drawn into the middle. At the hit the cell flashes for a frame or two and the element's
// particles fly (ice shards, sparks, embers, violet shards, soil). Lava keeps a molten crust that bubbles and flares on every
// burn tick; the erosion ring is a real violet band two cells round its bearer that corrodes the hero standing in it. Cores
// snap to whole dots, light stays smooth. Reduced effects keep the shade, the glow and a still mark, without particles or motion.
// Paint only: cells, times and ticks come from the combat state (js/domain/hunt-fields.mjs).
import { RING_TICK_MS } from '../domain/hunt-fields.mjs';
import { emitter, fillDots, paintConverge, paintDebris, paintDust, paintEmbers, paintGlow, paintMotes, paintSparks, seededRandom } from './fx-particles.mjs';

/** Per element: tint (laid over the floor), shade (multiplied into the floor), glow (light added from below), flash, tones [hot, mid,
 * deep light], deep (dark accent), debris tones (dark to light) and dust. Muted toward the painted scenes, never pure. */
const LOOKS = /* @__PURE__ */ Object.freeze({
    cold: { tint: '#5aa6d6', shade: '#4a7090', glow: '#3a7fae', flash: '#a8def4', tones: ['#f4fcff', '#b4e2f4', '#6aaed0'], deep: '#2c5674',
        debris: ['#22405a', '#5a94b6', '#a6daef', '#effaff'], dust: '#cfe5ef' },
    light: { tint: '#d8ac3a', shade: '#7a6232', glow: '#b48a26', flash: '#ffe8a0', tones: ['#fffbe8', '#ffe07a', '#d0a23a'], deep: '#6a5420',
        debris: ['#5a4a22', '#a68a3e', '#e8d08a', '#fffbe8'], dust: '#e8dcb4' },
    fire: { tint: '#d8622a', shade: '#8a4430', glow: '#c0501a', flash: '#ffb860', tones: ['#ffe4a8', '#ffa648', '#e0662a'], deep: '#4a2418',
        debris: ['#3a1c14', '#8a3a1c', '#e0702c', '#ffd08a'], dust: '#b89a88' },
    chaos: { tint: '#9a5ad0', shade: '#4a3068', glow: '#7a48a8', flash: '#c890ec', tones: ['#f0d6ff', '#c890ec', '#8650b0'], deep: '#3a2450',
        debris: ['#2a1838', '#5a3478', '#9a60c8', '#e0c0f8'], dust: '#a898b4' },
    phys: { tint: '#b8925a', shade: '#6e5240', glow: '#9a7444', flash: '#f0d8a4', tones: ['#fff0cc', '#e2c088', '#a8804e'], deep: '#4a3424',
        debris: ['#2e1d1a', '#5c3e32', '#8a6650', '#c8a47a'], dust: '#b8a088' }
});
const BURST_MS = 350;
const LAVA_TICK_MS = 750;
const snap = (value, p) => Math.round(value / p) * p;
const clamp01 = value => Math.max(0, Math.min(1, value));

/** The drawing frame shared by every mark this frame: tile size, one art dot, seconds on the visual clock, reduced effects. */
export function huntMarkView(projection, { now, visualNow, reduced }) {
    return { now, time: visualNow / 1000, reduced: !!reduced, tileW: projection.tileW, tileH: projection.tileH,
        p: Math.max(1, Math.round(projection.tileH / 13)), squash: projection.tileH / projection.tileW };
}

/** Light from below a pulse that quickens toward the hit (still in reduced effects). */
function pulseOf(v, charge) {
    return v.reduced ? 1 : 0.74 + 0.26 * Math.cos(Math.PI * 2 * (v.time * (1.2 + 4 * charge * charge)));
}

/** The floor of a marked cell, readable on pale stone and dark soil alike: a soft round shade of the element (no edge), a tint of its
 * colour over it, and a smaller added light in the middle. */
function paintBed(ctx, at, look, v, { strength, glow }) {
    paintGlow(ctx, { x: at.x, y: at.y, rx: v.tileW * 0.6, ry: v.tileH * 0.68, colour: look.shade, alpha: strength, mode: 'multiply' });
    paintGlow(ctx, { x: at.x, y: at.y, rx: v.tileW * 0.5, ry: v.tileH * 0.58, colour: look.tint, alpha: 0.8 * glow, mode: 'source-over' });
    paintGlow(ctx, { x: at.x, y: at.y, rx: v.tileW * 0.32, ry: v.tileH * 0.36, colour: look.glow, alpha: glow });
}

/** Dots along a straight run from a to b, one art dot apart. */
function lineDots(list, a, b, p) {
    const steps = Math.max(1, Math.round(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) / p));
    for (let i = 0; i <= steps; i++) list.push([snap(a.x + (b.x - a.x) * i / steps, p), snap(a.y + (b.y - a.y) * i / steps, p), 1]);
}

/** One upright shard of whole dots: lit left column, deep right edge, bright tip, a dot of shadow on the floor. */
function shardDots(bands, { x, y, height, width }, p) {
    for (let row = 0; row < height; row++) {
        const span = Math.max(1, Math.round(width * (1 - row / (height + 1)))), top = row === height - 1;
        for (let col = 0; col < span; col++) bands[top ? 0 : col === 0 ? 1 : 2].push([x + col * p, y - row * p, 1]);
        bands[3].push([x + span * p, y - row * p, 1]);
    }
    bands[4].push([x - p, y + p, width + 1]);
}

/** Cold: ice shards push up out of the cell, taller toward the hit (one big shard in the middle), over spreading rime. */
function paintFrost(ctx, at, look, v, { charge, seed }) {
    const random = seededRandom(Math.round(seed * 1e6), 6, 23), bands = [[], [], [], [], []];
    paintRime(ctx, at, look, v, { charge, seed });
    for (let i = 0; i < 6; i++) {
        const angle = i * 1.25 + random() * 0.7, r = i === 0 ? 0 : 0.16 + 0.2 * random(), grow = clamp01((charge - i * 0.1) / 0.5);
        if (grow <= 0) continue;
        const tall = (i === 0 ? 7 : 3 + 2 * random()) * (0.35 + 0.65 * grow) * (v.reduced ? 1 : 0.94 + 0.06 * Math.sin(v.time * 5 + i));
        shardDots(bands, { x: snap(at.x + Math.cos(angle) * r * v.tileW, v.p), y: snap(at.y + Math.sin(angle) * r * v.tileH, v.p),
            height: Math.max(1, Math.round(tall)), width: i === 0 ? 3 : 2 }, v.p);
    }
    ctx.globalAlpha = 0.45;
    fillDots(ctx, bands[4], look.deep, v.p);
    ctx.globalAlpha = 1;
    fillDots(ctx, bands[3], look.deep, v.p);
    fillDots(ctx, bands[2], look.tones[2], v.p);
    fillDots(ctx, bands[1], look.tones[1], v.p);
    ctx.globalAlpha = v.reduced ? 1 : 0.7 + 0.3 * Math.sin(v.time * 9 + seed * 20);
    fillDots(ctx, bands[0], look.tones[0], v.p);
    ctx.globalAlpha = 1;
}

function paintRime(ctx, at, look, v, { charge, seed }) {
    const random = seededRandom(Math.round(seed * 1e6), 12, 5), dots = [], bright = [];
    for (let i = 0; i < 12; i++) {
        const angle = random() * 6.283, r = 0.18 + 0.26 * random(), due = random() * 0.9;
        if (charge < due) continue;
        const dot = [snap(at.x + Math.cos(angle) * r * v.tileW, v.p), snap(at.y + Math.sin(angle) * r * v.tileH, v.p), 1];
        (random() < 0.3 ? bright : dots).push(dot);
    }
    ctx.globalAlpha = 0.8;
    fillDots(ctx, dots, look.tones[2], v.p);
    fillDots(ctx, bright, look.tones[1], v.p);
    ctx.globalAlpha = 1;
}

/** A jagged bolt between two points (midpoint displacement), as dots. */
function boltDots(random, from, to, { p, sway }) {
    let points = [from, to];
    for (let depth = 0, amp = sway; depth < 3; depth++, amp *= 0.55) {
        const next = [points[0]];
        for (let i = 1; i < points.length; i++) {
            const a = points[i - 1], b = points[i], push = (random() - 0.5) * 2 * amp;
            const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
            next.push({ x: (a.x + b.x) / 2 - (b.y - a.y) / len * push, y: (a.y + b.y) / 2 + (b.x - a.x) / len * push * 0.6 }, b);
        }
        points = next;
    }
    const dots = [];
    for (let i = 1; i < points.length; i++) lineDots(dots, points[i - 1], points[i], p);
    return dots;
}

/** Lightning: arcs crackle across the cell, re-drawn about every 70 ms, more and brighter toward the hit. */
function paintArcs(ctx, at, look, v, { charge, seed }) {
    const slot = v.reduced ? 0 : Math.floor(v.time * 1000 / 70), random = seededRandom(Math.round(seed * 1e6), slot, 7);
    const count = 1 + (charge > 0.4 ? 1 : 0) + (charge > 0.75 ? 1 : 0), core = [], halo = [];
    for (let i = 0; i < count; i++) {
        const angle = random() * 6.283, turn = Math.PI + (random() - 0.5) * 1.6, shown = random() < 0.55 + 0.45 * charge;
        const from = { x: at.x + Math.cos(angle) * v.tileW * 0.4, y: at.y + Math.sin(angle) * v.tileH * 0.4 };
        const to = { x: at.x + Math.cos(angle + turn) * v.tileW * 0.3, y: at.y + Math.sin(angle + turn) * v.tileH * 0.3 };
        if (!shown && !v.reduced) continue;
        const dots = boltDots(random, from, to, { p: v.p, sway: v.tileW * 0.16 });
        core.push(...dots);
        halo.push(...dots.map(([x, y]) => [x, y + v.p, 1]), ...dots.map(([x, y]) => [x + v.p, y, 1]));
        paintGlow(ctx, { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2, rx: v.tileW * 0.3, ry: v.tileH * 0.3, colour: look.glow, alpha: 0.35 + 0.35 * charge });
    }
    fillDots(ctx, halo, look.deep, v.p);
    fillDots(ctx, core, charge > 0.6 ? look.tones[0] : look.tones[1], v.p);
    paintOrb(ctx, at, look, v, charge);
}

/** A ball of static hovering over the middle of the cell, swelling and flickering toward the hit. */
function paintOrb(ctx, at, look, v, charge) {
    const bob = v.reduced ? 0 : Math.sin(v.time * 4) * v.p, y = snap(at.y - v.tileH * 0.32 + bob, v.p), x = snap(at.x, v.p);
    const flicker = v.reduced ? 1 : 0.75 + 0.25 * Math.sin(v.time * 31), reach = v.tileW * (0.14 + 0.1 * charge);
    paintGlow(ctx, { x, y, rx: reach, ry: reach, colour: look.glow, alpha: (0.4 + 0.5 * charge) * flicker });
    const size = charge > 0.5 ? 2 : 1;
    fillDots(ctx, [[x - v.p, y, 1], [x + size * v.p, y, 1], [x, y - v.p, 1], [x, y + size * v.p, 1]], look.tones[1], v.p);
    fillDots(ctx, [[x, y, size]], look.tones[0], v.p);
}

/** Fire: flame tongues lick up from the cell, taller toward the hit, with embers rising. */
function paintFlames(ctx, at, look, v, { charge, seed, key }) {
    const random = seededRandom(Math.round(seed * 1e6), 4, 9), bands = [[], [], []];
    for (let i = 0; i < 4; i++) {
        const dx = (random() - 0.5) * v.tileW * 0.56, dy = (random() - 0.5) * v.tileH * 0.46, phase = random() * 6.283;
        const wave = v.reduced ? 0.8 : 0.65 + 0.35 * Math.sin(v.time * (7 + 3 * random()) + phase);
        const height = Math.max(1, Math.round((1.5 + 3.5 * charge) * wave)), x0 = snap(at.x + dx, v.p), y0 = snap(at.y + dy, v.p);
        for (let row = 0; row < height; row++) {
            const u = row / height, band = u < 0.35 ? 2 : u < 0.7 ? 1 : 0, sway = row > height / 2 && Math.sin(v.time * 11 + phase) > 0 ? v.p : 0;
            bands[band].push([x0 + sway, y0 - row * v.p, 1]);
            if (u < 0.4) bands[band].push([x0 + v.p, y0 - row * v.p, 1]);
        }
    }
    bands.forEach((dots, band) => fillDots(ctx, dots, look.tones[band], v.p));
    if (!v.reduced) paintMotes(ctx, risingMotes(key, v), { x: at.x, y: at.y, time: v.time, p: v.p, strength: 0.4 + 0.6 * charge,
        tones: [look.tones[0], look.tones[2]], glow: look.glow });
}

function risingMotes(key, v) {
    return emitter(`hunt:rise:${key}:${v.tileW}`, 5, random => ({ dx: (random() - 0.5) * v.tileW * 0.6, dy: (random() - 0.3) * v.tileH * 0.4,
        rise: v.tileH * (0.6 + 0.6 * random()), sway: v.p * (1 + 2 * random()), period: 0.8 + 0.7 * random(), phase: random(), hot: random() < 0.4 }));
}

/** Chaos: a small rift opens in the middle of the cell, its rim of violet dots turning, motes spiralling into it. */
function paintVortex(ctx, at, look, v, { charge, key }) {
    const motes = emitter('hunt:vortex:' + key, 10, random => ({ a0: random() * 6.283, period: 0.8 + 0.7 * random(), phase: random() }));
    const time = v.reduced ? 0 : v.time, open = 0.12 + 0.12 * charge, rim = [], lit = [], spiral = [];
    paintGlow(ctx, { x: at.x, y: at.y, rx: v.tileW * (open + 0.1), ry: v.tileH * (open + 0.12), colour: look.deep, alpha: 0.75 + 0.2 * charge, mode: 'multiply' });
    for (let i = 0; i < 14; i++) {
        const angle = time * 1.4 + i * 0.449, dot = [snap(at.x + Math.cos(angle) * open * v.tileW, v.p), snap(at.y + Math.sin(angle) * open * v.tileH, v.p), 1];
        (i % 3 === 0 ? lit : rim).push(dot);
    }
    for (let i = 0; i < Math.round(4 + 6 * charge); i++) {
        const mote = motes[i], u = ((time / mote.period + mote.phase) % 1 + 1) % 1, r = open + (0.44 - open) * (1 - u), angle = mote.a0 + u * 4;
        spiral.push([snap(at.x + Math.cos(angle) * r * v.tileW, v.p), snap(at.y + Math.sin(angle) * r * v.tileH, v.p), 1]);
    }
    fillDots(ctx, rim.map(([x, y]) => [x, y + v.p, 1]), look.deep, v.p);
    fillDots(ctx, rim, look.tones[2], v.p);
    fillDots(ctx, spiral, look.tones[1], v.p);
    ctx.globalAlpha = v.reduced ? 1 : 0.6 + 0.4 * Math.sin(v.time * 12);
    fillDots(ctx, lit, look.tones[0], v.p);
    ctx.globalAlpha = 1;
}

/** Physical: branching cracks open from the middle, their seams lighting outward with the charge; loose stones tremble late on. */
function paintRupture(ctx, at, look, v, { charge, seed }) {
    const random = seededRandom(Math.round(seed * 1e6), 3, 11), dark = [], seam = [], stones = [];
    for (let branch = 0; branch < 3; branch++) {
        let x = at.x, y = at.y, angle = branch * 2.09 + random() * 0.9;
        const steps = Math.round((0.24 + 0.14 * random()) * v.tileW / v.p);
        for (let i = 0; i < steps; i++) {
            angle += (random() - 0.5) * 0.9;
            x += Math.cos(angle) * v.p; y += Math.sin(angle) * v.p * v.squash;
            const dot = [snap(x, v.p), snap(y, v.p), i < steps * 0.4 ? 2 : 1];
            (i / steps < charge * 1.15 ? seam : dark).push(dot);
        }
    }
    const tremble = !v.reduced && charge > 0.6;
    for (let i = 0; i < 4; i++) {
        const angle = random() * 6.283, r = 0.22 + 0.18 * random(), hop = tremble && Math.sin(v.time * 40 + i * 2) > 0.3 ? v.p : 0;
        stones.push([snap(at.x + Math.cos(angle) * r * v.tileW, v.p), snap(at.y + Math.sin(angle) * r * v.tileH, v.p) - hop, 2]);
    }
    paintGlow(ctx, { x: at.x, y: at.y, rx: v.tileW * 0.3, ry: v.tileH * 0.3, colour: look.glow, alpha: 0.5 * charge });
    fillDots(ctx, dark.concat(seam.map(([x, y, size]) => [x, y + v.p, size])), look.deep, v.p);
    fillDots(ctx, seam, charge > 0.75 ? look.tones[0] : look.tones[1], v.p);
    fillDots(ctx, stones.map(([x, y]) => [x, y + v.p, 2]), look.deep, v.p);
    fillDots(ctx, stones, look.tones[2], v.p);
    fillDots(ctx, stones.map(([x, y]) => [x, y, 1]), look.tones[1], v.p);
}

const SIGILS = /* @__PURE__ */ Object.freeze({ cold: paintFrost, light: paintArcs, fire: paintFlames, chaos: paintVortex, phys: paintRupture });

/** Light drawn into the middle of a cell over the last stretch before its hit. */
function paintGather(ctx, at, look, v, { strength, key }) {
    if (v.reduced || !(strength > 0)) return;
    const motes = emitter(`hunt:gather:${key}:${v.tileW}`, 6, random => ({ angle: random() * 6.283, dist: v.tileW * (0.3 + 0.18 * random()),
        period: 0.42 + 0.3 * random(), phase: random() }));
    paintConverge(ctx, motes, { x: at.x, y: at.y, time: v.time, p: v.p, strength, squash: v.squash, tones: [look.tones[0], look.tones[2]] });
}

/** A seeded cell number in [0, 1) for this mark's cell. */
function cellSeed(gx, gy, salt) {
    return seededRandom(gx * 73 + 11, gy * 151 + 7, salt)();
}

/**
 * One cell of a 사멸 파동 while it builds up (age < 0) or bursts (age 0 … BURST_MS).
 * @param {{x:number,y:number}} at the cell's floor point
 * @param {{element:string,charge:number,age:number,gx:number,gy:number,key:string}} cell age in ms since the burst, or -1 before it
 */
export function paintNovaCell(ctx, at, v, cell) {
    const look = LOOKS[cell.element] || LOOKS.phys, seed = cellSeed(cell.gx, cell.gy, 3);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (cell.age < 0) {
        const charge = clamp01(cell.charge);
        paintBed(ctx, at, look, v, { strength: 0.45 + 0.55 * charge, glow: (0.16 + 0.4 * charge) * pulseOf(v, charge) });
        SIGILS[cell.element]?.(ctx, at, look, v, { charge, seed, key: cell.key });
        paintGather(ctx, at, look, v, { strength: (charge - 0.55) / 0.45, key: cell.element });
    } else paintBurst(ctx, at, look, v, cell);
    ctx.restore();
}

function paintBurst(ctx, at, look, v, cell) {
    const fade = 1 - cell.age / BURST_MS;
    if (fade <= 0) return;
    paintBed(ctx, at, look, v, { strength: fade, glow: 0.3 * fade });
    if (cell.age < 100) paintFlash(ctx, at, look, v, (v.reduced ? 0.55 : 1) * (1 - cell.age / 100) ** 2);
    if (!v.reduced) PARTS[cell.element]?.(ctx, at, look, v, { t: cell.age / 1000, key: cell.key });
}

/** A hit's flash: the element's tint over the floor and a smaller added light, smooth and round (no ring, no square). */
function paintFlash(ctx, at, look, v, strength) {
    paintGlow(ctx, { x: at.x, y: at.y, rx: v.tileW * 0.62, ry: v.tileH * 0.68, colour: look.tint, alpha: 0.6 * strength, mode: 'source-over' });
    paintGlow(ctx, { x: at.x, y: at.y, rx: v.tileW * 0.42, ry: v.tileH * 0.46, colour: look.flash, alpha: 0.75 * strength });
}

/** The lightning nova's strike: a bolt drops from above onto the cell for a frame or two (still under the actors). */
function paintStrikeBolt(ctx, at, look, v, key) {
    const random = seededRandom(key.length * 977 + Math.round(at.x), Math.round(at.y), 29);
    const dots = boltDots(random, { x: at.x + (random() - 0.5) * v.tileW * 0.4, y: at.y - v.tileH * 2.4 }, at, { p: v.p, sway: v.tileW * 0.22 });
    paintGlow(ctx, { x: at.x, y: at.y - v.tileH * 1.1, rx: v.tileW * 0.3, ry: v.tileH * 1.4, colour: look.glow, alpha: 0.6 });
    fillDots(ctx, dots.map(([x, y]) => [x - v.p, y, 1]).concat(dots.map(([x, y]) => [x + v.p * 2, y, 1])), look.deep, v.p);
    fillDots(ctx, dots.map(([x, y]) => [x + v.p, y, 1]), look.tones[1], v.p);
    fillDots(ctx, dots, look.tones[0], v.p);
}

/** Chunks (ice, stone, violet shards) thrown up from a burst. */
function burstDebris(ctx, at, look, v, { t, key, count, shadow }) {
    const chunks = emitter(`hunt:debris:${key}:${v.tileW}`, count, random => ({ dx: (random() - 0.5) * v.tileW * 0.3,
        dy: (random() - 0.5) * v.tileH * 0.3, vx: (random() - 0.5) * v.tileW * 3.2, vy: (random() - 0.5) * v.tileH * 2.6,
        vz: v.tileH * (3.5 + 3.5 * random()), size: random() < 0.35 ? 2 : 1, tone: 1 + Math.floor(random() * 3), delay: random() * 0.03 }));
    paintDebris(ctx, chunks, { x: at.x, y: at.y, t, p: v.p, g: v.tileH * 45, drag: 3, life: 0.34, tones: look.debris, shadow });
}

function burstSparks(ctx, at, look, v, { t, key, count, speed = 1 }) {
    const sparks = emitter(`hunt:sparks:${key}:${v.tileW}`, count, random => {
        const angle = random() * 6.283, fast = v.tileW * (2.5 + 3 * random()) * speed;
        return { dx: 0, dy: 0, vx: Math.cos(angle) * fast, vy: Math.sin(angle) * fast * 0.7 - v.tileH, delay: random() * 0.04, life: 0.18 + 0.12 * random() };
    });
    paintSparks(ctx, sparks, { x: at.x, y: at.y, t, p: v.p, drag: 5, gravity: v.tileH * 6, tones: look.tones });
}

function burstDust(ctx, at, look, v, { t, key, count }) {
    const puffs = emitter(`hunt:dust:${key}:${v.tileW}`, count, random => ({ dx: (random() - 0.5) * v.tileW * 0.4, dy: (random() - 0.5) * v.tileH * 0.3,
        vx: (random() - 0.5) * v.tileW * 0.5, vy: -v.tileH * 0.2 * random(), r0: v.tileW * 0.12, r1: v.tileW * (0.3 + 0.15 * random()), delay: 0.02, life: 0.32 }));
    paintDust(ctx, puffs, { x: at.x, y: at.y, t, colour: look.dust, alpha: 0.45, squash: v.squash });
}

const PARTS = /* @__PURE__ */ Object.freeze({
    cold: (ctx, at, look, v, burst) => {
        burstDebris(ctx, at, look, v, { ...burst, count: 7, shadow: '#1a2630' });
        burstSparks(ctx, at, look, v, { ...burst, count: 6 });
        burstDust(ctx, at, look, v, { ...burst, count: 2 });
    },
    light: (ctx, at, look, v, burst) => {
        if (burst.t < 0.12) paintStrikeBolt(ctx, at, look, v, burst.key);
        burstSparks(ctx, at, look, v, { ...burst, count: 10, speed: 1.4 });
    },
    fire: (ctx, at, look, v, burst) => {
        const u = burst.t / 0.22;
        if (u < 1) paintGlow(ctx, { x: at.x, y: at.y - v.tileH * 0.6 * u, rx: v.tileW * 0.34, ry: v.tileH * (0.6 + 0.8 * u), colour: look.glow, alpha: 0.7 * (1 - u) ** 2 });
        burstSparks(ctx, at, look, v, { ...burst, count: 7 });
        paintEmbers(ctx, emitter(`hunt:embers:${burst.key}:${v.tileW}`, 6, random => ({ dx: (random() - 0.5) * v.tileW * 0.5,
            dy: (random() - 0.5) * v.tileH * 0.3, rise: v.tileH * (1.5 + random()), sway: v.p * 2, freq: 2 + random() * 2, phase: random() * 6.283,
            delay: random() * 0.05, life: 0.28 })), { x: at.x, y: at.y, t: burst.t, p: v.p, tones: look.tones });
    },
    chaos: (ctx, at, look, v, burst) => {
        if (burst.t < 0.07) paintGlow(ctx, { x: at.x, y: at.y, rx: v.tileW * 0.4 * (1 - burst.t / 0.07), ry: v.tileH * 0.42 * (1 - burst.t / 0.07),
            colour: look.deep, alpha: 0.7, mode: 'multiply' });
        burstSparks(ctx, at, look, v, { ...burst, count: 8 });
        burstDebris(ctx, at, look, v, { ...burst, count: 5, shadow: '#1c1226' });
    },
    phys: (ctx, at, look, v, burst) => {
        burstDebris(ctx, at, look, v, { ...burst, count: 9, shadow: '#1e1410' });
        burstDust(ctx, at, look, v, { ...burst, count: 3 });
        burstSparks(ctx, at, look, v, { ...burst, count: 4 });
    }
});

/** Ember seams over a crust that flow with light (the lava's glowing cracks). */
function paintSeams(ctx, at, look, v, { seed, heat }) {
    const random = seededRandom(Math.round(seed * 1e6), 4, 13), lit = [], warm = [], dim = [];
    for (let branch = 0; branch < 4; branch++) {
        let x = at.x, y = at.y, angle = branch * 1.57 + random() * 0.8;
        const steps = Math.round((0.28 + 0.14 * random()) * v.tileW / v.p);
        for (let i = 0; i < steps; i++) {
            angle += (random() - 0.5) * 0.8;
            x += Math.cos(angle) * v.p; y += Math.sin(angle) * v.p * v.squash;
            const flow = ((i / steps - (v.reduced ? 0 : v.time * 0.9) + branch * 0.3) % 1 + 1) % 1;
            (flow < 0.2 * heat ? lit : flow < 0.55 ? warm : dim).push([snap(x, v.p), snap(y, v.p), i < steps * 0.35 ? 2 : 1]);
        }
    }
    fillDots(ctx, dim, look.tones[2], v.p);
    fillDots(ctx, warm, look.tones[1], v.p);
    fillDots(ctx, lit, look.tones[0], v.p);
}

/** Bubbles that swell on the molten crust and pop into two sparks. */
function paintBubbles(ctx, at, look, v, seed) {
    const random = seededRandom(Math.round(seed * 1e6), 3, 17), body = [], shine = [];
    for (let i = 0; i < 3; i++) {
        const x = snap(at.x + (random() - 0.5) * v.tileW * 0.5, v.p), y = snap(at.y + (random() - 0.5) * v.tileH * 0.4, v.p);
        const u = ((v.time / (0.8 + 0.4 * random()) + random()) % 1 + 1) % 1;
        if (u < 0.45) body.push([x, y, 1]);
        else if (u < 0.7) { body.push([x, y, 2]); shine.push([x, y, 1]); }
        else if (u < 0.8) shine.push([x - v.p, y - v.p * 2, 1], [x + v.p * 2, y - v.p * 3, 1]);
    }
    fillDots(ctx, body, look.tones[1], v.p);
    fillDots(ctx, shine, look.tones[0], v.p);
}

/**
 * 용암 발자국: a scorch that heats up while it arms, then a molten crust with low flames that bubbles, sheds heat and flares on every
 * burn tick.
 * The combat tick moves field.at to the next burn (js/domain/hunt-fields.mjs tickField), so a field whose at is past its first
 * arming span has burned at least once.
 */
export function paintLavaField(ctx, at, v, field) {
    const look = LOOKS.fire, seed = cellSeed(field.gx, field.gy, 5), burning = field.at - field.start > 700;
    const charge = burning ? 1 : clamp01((v.now - field.start) / Math.max(1, field.at - field.start));
    const since = burning ? clamp01(1 - (field.at - v.now) / LAVA_TICK_MS) * LAVA_TICK_MS : Infinity;
    const fade = clamp01((field.end - v.now) / 300), flare = since < 170 ? (1 - since / 170) ** 2 : 0;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    paintGlow(ctx, { x: at.x, y: at.y, rx: v.tileW * 0.62, ry: v.tileH * 0.68, colour: look.deep, alpha: (0.35 + 0.45 * charge) * fade, mode: 'multiply' });
    paintBed(ctx, at, look, v, { strength: 0.6 * charge * fade, glow: ((0.4 + 0.45 * charge) * pulseOf(v, burning ? 0.3 : charge) + 0.5 * flare) * fade });
    paintSeams(ctx, at, look, v, { seed, heat: charge * fade });
    if (burning) paintBurning(ctx, at, v, { field, seed, flare, fade });
    else paintGather(ctx, at, look, v, { strength: (charge - 0.5) / 0.5, key: 'fire' });
    if (!v.reduced) paintMotes(ctx, risingMotes(`lava:${field.gx}:${field.gy}`, v), { x: at.x, y: at.y, time: v.time, p: v.p,
        strength: 0.5 * charge * fade, tones: [look.tones[0], look.tones[2]], glow: look.glow });
    if (flare > 0) paintTickFlare(ctx, at, look, v, { since, key: `lava:${field.gx}:${field.gy}:${Math.round(field.at)}` });
    ctx.restore();
}

/** A burning lava cell's low flames and bubbles. */
function paintBurning(ctx, at, v, { field, seed, flare, fade }) {
    if (fade > 0.3) paintFlames(ctx, at, LOOKS.fire, v, { charge: 0.35 + 0.4 * flare, seed, key: `lava:${field.gx}:${field.gy}:f` });
    if (!v.reduced) paintBubbles(ctx, at, LOOKS.fire, v, seed);
}

/** The flash and sparks of a burn or erosion tick on one cell. */
function paintTickFlare(ctx, at, look, v, { since, key }) {
    paintFlash(ctx, at, look, v, (v.reduced ? 0.5 : 0.8) * (1 - since / 170) ** 2);
    if (!v.reduced) burstSparks(ctx, at, look, v, { t: since / 1000, key, count: 5, speed: 0.7 });
}

/** #rrggbb at alpha a, for gradient stops. */
function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

/** A soft round band on the floor around `at` from `inner` to `outer` cells out, brightest in its middle, squashed to the floor's
 * perspective (one gradient, one fill). */
function paintBand(ctx, at, v, { colour, alpha, mode, inner, outer }) {
    if (!(alpha > 0.004)) return;
    const r0 = inner * v.tileW, r1 = outer * v.tileW, gradient = ctx.createRadialGradient(0, 0, r0, 0, 0, r1);
    gradient.addColorStop(0, rgba(colour, 0));
    gradient.addColorStop(0.5, rgba(colour, 1));
    gradient.addColorStop(1, rgba(colour, 0));
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.scale(1, v.tileH / v.tileW);
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, r1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

/** Decay specks turning slowly along the ring, and three brighter runs chasing round it, in whole dots. */
function paintRingDecay(ctx, at, look, v, seed) {
    const random = seededRandom(seed, 28, 23), turn = v.reduced ? 0 : v.time * 0.22, deep = [], mid = [], lit = [];
    const put = (list, angle, r, size) => list.push([snap(at.x + Math.cos(angle) * r * v.tileW, v.p), snap(at.y + Math.sin(angle) * r * v.tileH, v.p), size]);
    for (let i = 0; i < 28; i++) {
        const angle = random() * 6.283 + turn * (i % 2 ? 1 : -0.6), r = 2 + (random() - 0.5) * 0.7;
        put(i % 4 === 0 ? mid : deep, angle, r, random() < 0.3 ? 2 : 1);
    }
    for (let run = 0; run < 3 && !v.reduced; run++) {
        const head = v.time * 0.9 + run * 2.094;
        for (let j = 0; j < 7; j++) put(j < 2 ? lit : mid, head - j * 0.07, 2 + Math.sin(head * 3 + j) * 0.08, 1);
    }
    ctx.globalAlpha = 0.85;
    fillDots(ctx, deep, look.deep, v.p);
    fillDots(ctx, mid, look.tones[2], v.p);
    ctx.globalAlpha = 1;
    fillDots(ctx, lit, look.tones[1], v.p);
}

/** The hero standing in the ring: violet light pooling under the feet that pulses on every corrosion tick, and motes rising off them. */
function paintCorrosion(ctx, hero, look, v, bearer) {
    const tick = Number.isFinite(bearer.huntRingAt) ? clamp01(1 - (bearer.huntRingAt - v.now) / RING_TICK_MS) : 0;
    const beat = v.reduced ? 0.5 : (1 - tick) ** 2;
    paintGlow(ctx, { x: hero.x, y: hero.y, rx: v.tileW * 0.5, ry: v.tileH * 0.5, colour: look.shade, alpha: 0.5, mode: 'multiply' });
    paintGlow(ctx, { x: hero.x, y: hero.y, rx: v.tileW * 0.42, ry: v.tileH * 0.46, colour: look.glow, alpha: 0.35 + 0.45 * beat });
    if (!v.reduced) paintMotes(ctx, risingMotes(`ring-hero:${bearer.id}`, v), { x: hero.x, y: hero.y, time: v.time, p: v.p, strength: 0.9,
        tones: [look.tones[0], look.tones[1]] });
}

/**
 * 침식 고리 around a living bearer: a real ring two cells out with a safe core (js/domain/hunt-fields.mjs patterns.ring). The floor
 * under it corrodes in a soft violet band with a thin light in its middle, decay specks turn slowly round it and three brighter runs
 * chase along it, and motes rise from it. While the hero stands in it the corrosion shows on them, pulsing on each damage tick.
 * Reduced effects keep the still band and specks.
 * @param {{x:number,y:number}} at the bearer's floor point
 * @param {{bearer:Object, hero:{x:number,y:number}|null}} parts hero: the hero's floor point while they stand in the ring
 */
export function paintErosionRing(ctx, at, v, parts) {
    const { bearer, hero } = parts;
    const look = LOOKS.chaos, pulse = pulseOf(v, 0.35);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    paintBand(ctx, at, v, { colour: look.shade, alpha: 0.6, mode: 'multiply', inner: 1.45, outer: 2.55 });
    paintBand(ctx, at, v, { colour: look.tint, alpha: 0.32, mode: 'source-over', inner: 1.6, outer: 2.4 });
    paintBand(ctx, at, v, { colour: look.glow, alpha: 0.3 + 0.18 * pulse, mode: 'lighter', inner: 1.82, outer: 2.18 });
    paintRingDecay(ctx, at, look, v, Math.round(cellSeed(bearer.gx, bearer.gy, 7) * 1e6));
    if (!v.reduced) for (let i = 0; i < 8; i++) {
        const angle = i * 0.785 + v.time * 0.22, spot = { x: at.x + Math.cos(angle) * 2 * v.tileW, y: at.y + Math.sin(angle) * 2 * v.tileH };
        paintMotes(ctx, risingMotes(`ring:${bearer.id}:${i}`, v), { x: spot.x, y: spot.y, time: v.time, p: v.p, strength: 0.5, tones: [look.tones[1], look.tones[2]] });
    }
    if (hero) paintCorrosion(ctx, hero, look, v, bearer);
    ctx.restore();
}
