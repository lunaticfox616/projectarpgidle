// The Act 9 chorus seed in layers, in muted chaos tones. The caster: light from the floor under the bulb with motes rising from it, and
// violet light gathering in the bud with motes drawn into it before the release, which flares and throws sparks (js/rendering/
// actor-cast-acting.mjs places it). The flight: a short trail of fading, drifting sparks behind the seed. The aimed cell glows from below
// with drifting motes (js/rendering/danger-tiles.mjs). The landing, on the floor under the actors: a two-frame flash of violet light on the
// stone, a shockwave ring inside the cell, the authored chaos crystals (assets/effects/enemy-chaos-contact-v1.webp, whole-number scale)
// rising behind whoever stands there, and crystal shards thrown in arcs over their shadows. Over the actors only sparks streaking out
// beside the body and embers rising at its sides; nothing is laid over the hero. Particles: js/rendering/fx-particles.mjs. Paint only.
import { easeOut, emitter, paintConverge, paintDebris, paintEmbers, paintGlow, paintMotes, paintRing, paintSparks } from './fx-particles.mjs';

const LILAC = '#e2cdee';
const VIOLET = '#a070c8';
const PALE = '#f2e8f6';
const POOL = '#8c5cc4';
const ADD = '#4a2a72';
const SHARDS = /* @__PURE__ */ Object.freeze(['#3e2458', '#7a4ca8', '#b088dc', '#e2cdee']);
const SPARK = /* @__PURE__ */ Object.freeze([PALE, '#c49ae8', '#7a4ca8']);
// Chaos contact frames [sheet frame, from ms] (3 x 2 frames of 128 x 64, ground at y 57). An empty cell skips the tallest two.
const CRYSTALS = /* @__PURE__ */ Object.freeze([[1, 0], [2, 30], [3, 95], [4, 145], [5, 185]]);
const LOW_CRYSTALS = /* @__PURE__ */ Object.freeze([[0, 0], [1, 40], [4, 110], [5, 170]]);
const CRYSTAL_MS = 220;

/** One dot of these marks at the current tile size. */
export function chorusDot(footprint) {
    return Math.max(2, Math.round(footprint.tileH / 13));
}

function frameAt(frames, age) {
    return frames.reduce((found, row) => (age >= row[1] ? row : found), frames[0])[0];
}

/** Two frames of violet light on the stone around the cell (a tint pool with a little added light at its heart). */
function paintLandingFlash(ctx, { x, y, tileW, tileH }, age, empty) {
    if (age >= 80) return;
    const fade = (1 - age / 80) ** 2 * (empty ? 0.75 : 1);
    paintGlow(ctx, { x, y, rx: tileW * 1.05, ry: tileH * 1.1, colour: POOL, alpha: 0.55 * fade, mode: 'source-over' });
    paintGlow(ctx, { x, y, rx: tileW * 0.55, ry: tileH * 0.6, colour: ADD, alpha: 0.9 * fade });
}

/** On a hit, a column of violet light rising behind the hero out of the cell (drawn under the actors, never over the sprite). */
function paintColumn(ctx, { x, y, tileW, tileH }, age) {
    if (age >= 200) return;
    const fade = (1 - age / 200) ** 1.4, rise = 0.8 + 0.6 * Math.min(1, age / 50);
    paintGlow(ctx, { x, y: y - tileH * rise, rx: tileW * 0.8, ry: tileH * (1.2 + rise), colour: POOL, alpha: 0.6 * fade, mode: 'source-over' });
    paintGlow(ctx, { x, y: y - tileH * rise, rx: tileW * 0.5, ry: tileH * (1 + rise), colour: ADD, alpha: 0.9 * fade });
}

function makeShard(random, { tileW, tileH }, empty) {
    const angle = random() * Math.PI * 2, speed = tileW * (0.8 + random() * 1.6);
    return { dx: (random() - 0.5) * tileW * 0.4, dy: (random() - 0.5) * tileH * 0.3, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed * 0.5,
        vz: tileH * ((empty ? 5 : 12) + random() * 8), size: random() < 0.55 ? 2 : 1, tone: 1 + Math.floor(random() * 3), delay: random() * 0.02 };
}

/**
 * Floor pass, under the actors and outside the cell clip: the landing flash, a shockwave ring inside the cell, the authored crystals rising
 * out of it (behind whoever stands there) and crystal shards thrown in arcs over their shadows.
 * @param {{image:HTMLImageElement|null, empty:boolean, key:string}} look image: the chaos contact sheet; empty: nobody stood on the cell
 */
export function paintChorusFloor(ctx, footprint, age, look) {
    if (age < 0 || age >= CRYSTAL_MS) return;
    const p = chorusDot(footprint), { x, y, tileW, tileH } = footprint, u = age / 190;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (!look.empty) paintColumn(ctx, footprint, age);
    paintLandingFlash(ctx, footprint, age, look.empty);
    if (u < 1) paintRing(ctx, { cx: x, cy: y + tileH * 0.08, r: tileW * (0.14 + 0.32 * easeOut(u)), squash: tileH / tileW, alpha: (1 - u) ** 1.2,
        thick: u < 0.45 ? 2 : 1, core: LILAC, light: POOL, p, mode: 'source-over' });
    if (look.image) {
        const frame = frameAt(look.empty ? LOW_CRYSTALS : CRYSTALS, age), scale = Math.max(1, Math.round(tileW * 1.6 / 115));
        ctx.drawImage(look.image, (frame % 3) * 128, Math.floor(frame / 3) * 64, 128, 64,
            Math.round(x - 64 * scale), Math.round(y + tileH * 0.22 - 57 * scale), 128 * scale, 64 * scale);
    }
    const shards = emitter(`chorus-shards:${look.key}:${tileW}`, look.empty ? 7 : 13, random => makeShard(random, footprint, look.empty));
    paintDebris(ctx, shards, { x, y, t: age / 1000, p, g: tileH * 95, drag: 3, life: 0.22, tones: SHARDS, shadow: SHARDS[0], highlight: PALE });
    ctx.restore();
}

function makeSideSpark(random, { tileW }) {
    const side = random() < 0.5 ? -1 : 1, angle = -Math.PI / 2 + side * (0.5 + random() * 0.9), speed = tileW * (2.5 + random() * 3);
    return { dx: side * tileW * (0.36 + random() * 0.12), dy: -random() * tileW * 0.5, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        delay: random() * 0.04, life: 0.12 + random() * 0.1 };
}

function makeSideEmber(random, { tileW, tileH }) {
    const side = random() < 0.5 ? -1 : 1;
    return { dx: side * tileW * (0.34 + random() * 0.16), dy: -random() * tileH * 0.8, rise: tileH * (1.4 + random()), sway: 1 + random() * 2,
        freq: 2 + random() * 2, phase: random() * 6.28, delay: random() * 0.06, life: 0.14 + random() * 0.07 };
}

/**
 * Over the actors: sparks streaking out at the cell's sides and, on a hit, embers rising beside the hero's body (never over it).
 * @param {{reduced:boolean, empty:boolean, key:string}} look empty: nobody stood on the cell when the seed landed
 */
export function paintChorusBurst(ctx, footprint, age, look) {
    if (look.reduced) return;
    const p = chorusDot(footprint), { x, y } = footprint, at = { x, y, t: age / 1000, p };
    ctx.save();
    ctx.globalAlpha = 1;
    paintSparks(ctx, emitter(`chorus-sparks:${look.key}:${footprint.tileW}`, look.empty ? 5 : 9, random => makeSideSpark(random, footprint)),
        { ...at, drag: 6, gravity: footprint.tileH * 18, tones: SPARK });
    if (!look.empty) paintEmbers(ctx, emitter(`chorus-embers:${look.key}:${footprint.tileW}`, 6, random => makeSideEmber(random, footprint)),
        { ...at, tones: SPARK, glow: POOL, glowMode: 'source-over' });
    ctx.restore();
}

function trailJitter(index) {
    const a = Math.sin(index * 12.9898) * 43758.5453, b = Math.sin(index * 78.233) * 12543.123;
    return [a - Math.floor(a) - 0.5, b - Math.floor(b) - 0.5];
}

/**
 * The trail right behind the seed, newest first: sparks left on its arc that drift apart and sink a little as they age, pale, then lilac,
 * then violet, with a soft violet light around the newest.
 * @param {Array<{x:number,y:number}>} points
 */
export function paintChorusPath(ctx, points, { p, seed = 0 }) {
    if (!points.length) return;
    ctx.save();
    paintGlow(ctx, { x: points[0].x, y: points[0].y, rx: p * 9, ry: p * 7, colour: ADD, alpha: 0.7 });
    points.forEach((point, index) => {
        const older = index / Math.max(1, points.length), [jx, jy] = trailJitter(index + seed), spread = older * p * 5;
        const x = Math.round((point.x + jx * spread) / p) * p, y = Math.round((point.y + jy * spread + older * p * 3) / p) * p;
        ctx.globalAlpha = older < 0.4 ? 1 : 1.5 - older * 1.25;
        ctx.fillStyle = older < 0.25 ? PALE : older < 0.6 ? LILAC : VIOLET;
        ctx.fillRect(x, y, older < 0.2 ? 2 * p : p, older < 0.2 ? 2 * p : p);
    });
    ctx.restore();
}

/** Light on the floor under the casting bulb from its wind-up until just after its seed lands: a violet pool laid over the stone with a
 * little added light at its heart, and motes rising from it toward the bud. No ring, no disc edge. */
export function paintChorusCasterGlow(ctx, footprint, strength, time = 0) {
    const p = chorusDot(footprint), { x, y, tileW, tileH } = footprint;
    ctx.save();
    paintGlow(ctx, { x, y, rx: tileW * 0.85, ry: tileH * 0.75, colour: POOL, alpha: 0.5 * strength, mode: 'source-over' });
    paintGlow(ctx, { x, y, rx: tileW * 0.42, ry: tileH * 0.36, colour: ADD, alpha: 0.75 * strength });
    const motes = emitter(`chorus-caster:${tileW}`, 6, random => ({ dx: (random() - 0.5) * tileW * 0.8, dy: (random() - 0.5) * tileH * 0.4,
        rise: tileH * (0.9 + random() * 0.8), sway: random() * 2 * p, period: 0.8 + random() * 0.6, phase: random(), hot: random() < 0.4 }));
    paintMotes(ctx, motes, { x, y, time, p, strength, tones: [PALE, '#b088dc'] });
    ctx.restore();
}

/**
 * The bud while the bulb casts: violet light gathering (it grows with the wind-up), a small bright core, motes drawn into it and, as the
 * seed leaves, a flare and a ring of sparks.
 * @param {{x:number,y:number,p:number,tile:number}} at the bud in screen px; p one dot
 * @param {{phase:string, share:number, time:number, strength:number, reduced:boolean}} look
 */
export function paintChorusBud(ctx, at, look) {
    const { x, y, p, tile } = at, { phase, share, strength } = look, gather = phase === 'wind' ? share : 1;
    const flare = phase === 'release' ? 1 - share : 0;
    const reach = tile * (0.4 + 0.4 * gather + 0.5 * flare);
    // On the pale bulb added light would wash out: a violet tint pool, then a little added light at the heart.
    paintGlow(ctx, { x, y, rx: reach, ry: reach, colour: POOL, alpha: (0.35 + 0.3 * gather + 0.3 * flare) * strength, mode: 'source-over' });
    paintGlow(ctx, { x, y, rx: reach * 0.5, ry: reach * 0.5, colour: ADD, alpha: (0.6 + 0.4 * flare) * strength });
    ctx.globalAlpha = strength;
    ctx.fillStyle = LILAC;
    ctx.fillRect(Math.round(x / p) * p - p, Math.round(y / p) * p - p, 2 * p, 2 * p);
    ctx.fillStyle = PALE;
    ctx.fillRect(Math.round(x / p) * p - p, Math.round(y / p) * p - p, p, p);
    ctx.globalAlpha = 1;
    if (look.reduced) return;
    if (phase === 'wind') {
        const motes = emitter(`chorus-bud:${tile}`, 8, random => ({ angle: random() * Math.PI * 2, dist: tile * (0.9 + random() * 0.6),
            period: 0.4 + random() * 0.25, phase: random() }));
        paintConverge(ctx, motes, { x, y, time: look.time, p, strength: (0.4 + 0.6 * share) * strength, squash: 0.8, tones: [PALE, VIOLET] });
    }
    if (phase === 'release') paintSparks(ctx, emitter(`chorus-release:${tile}`, 8, random => {
        const angle = random() * Math.PI * 2, speed = tile * (4 + random() * 3);
        return { dx: 0, dy: 0, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, delay: 0, life: 0.12 + random() * 0.08 };
    }), { x, y, t: share * 0.19, p, drag: 7, gravity: 0, tones: SPARK });
}
