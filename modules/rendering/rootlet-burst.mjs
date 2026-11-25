// The Rootlet's ground hit in layers, around the cracks and the authored earth burst that js/rendering/rootlet-fault.mjs draws: a flash
// of one or two frames that lights the soil around the wave, a shockwave ring running out through the struck cells, debris thrown up from
// every struck cell in arcs over its shadow (bouncing once, settling), short ember sparks, dust puffs that grow and drift, and embers
// rising from the cracks after the hit. The second wave is heavier: more debris thrown higher, a wider and longer ring, longer dust.
// Particles are seeded per hit and cell (js/rendering/fx-particles.mjs). Paint only.
import { easeOut, emitter, paintDebris, paintDust, paintEmbers, paintGlow, paintRing, paintSparks } from './fx-particles.mjs';

const SOIL = /* @__PURE__ */ Object.freeze(['#2e1d1a', '#5c3e32', '#8a6650', '#b48a68']);
const SPARK = /* @__PURE__ */ Object.freeze(['#ffc272', '#e8803a', '#9a4426']);
const EMBER = /* @__PURE__ */ Object.freeze(['#ffb262', '#d8703a', '#7a3a24']);
const DUST = '#b09078';
const FLASH = /* @__PURE__ */ Object.freeze({ wave: '#b8622a', cell: '#d07a36' });
const RING = /* @__PURE__ */ Object.freeze({ core: '#f2a868', light: '#a8521e' });
// [first wave, second wave]: particle counts per cell, how high debris flies (tiles per second up), ring reach (tiles), ring and dust ms.
const WEIGHT = /* @__PURE__ */ Object.freeze([
    { debris: 8, sparks: 7, dust: 3, embers: 4, lift: 12, ring: 1.5, ringMs: 260, dustMs: 560, flash: 1, plume: 2, column: 160 },
    { debris: 13, sparks: 11, dust: 5, embers: 7, lift: 18, ring: 2.7, ringMs: 380, dustMs: 1000, flash: 1.3, plume: 3, column: 230 }
]);
export const ROOTLET_PARTICLE_MS = 1300;

const weightOf = look => WEIGHT[look.outer ? 1 : 0];

/** Under the actors: a column of warm light rising out of every struck cell, behind whoever stands there (never laid over a sprite). */
function paintColumns(ctx, footprint, look) {
    const span = weightOf(look).column;
    if (look.reduced || look.age >= span) return;
    const fade = (1 - look.age / span) ** 2, { tileW, tileH } = footprint, rise = 0.6 + 0.6 * Math.min(1, look.age / 60);
    for (const point of footprint.points) {
        paintGlow(ctx, { x: point.x, y: point.y - tileH * rise, rx: tileW * 0.42, ry: tileH * (0.9 + rise), colour: FLASH.wave, alpha: 0.6 * fade });
    }
}

/** Outside the cell clip, under the actors: a flash of light on the soil around the wave and on every struck cell (two frames, falling),
 * and the light columns. */
export function paintRootletFlash(ctx, footprint, look) {
    ctx.save();
    paintColumns(ctx, footprint, look);
    ctx.restore();
    if (look.age >= 90) return;
    const fade = (1 - look.age / 90) ** 2 * weightOf(look).flash * (look.reduced ? 0.6 : 1), { tileW, tileH } = footprint;
    ctx.save();
    paintGlow(ctx, { x: footprint.centerPoint.x, y: footprint.centerPoint.y, rx: footprint.width * 0.55, ry: footprint.height * 0.55,
        colour: FLASH.wave, alpha: 0.42 * fade });
    for (const point of footprint.points) paintGlow(ctx, { x: point.x, y: point.y, rx: tileW * 0.75, ry: tileH * 0.8, colour: FLASH.cell, alpha: 0.7 * fade });
    ctx.restore();
}

/** Inside the struck cells (the caller clips to them): a shockwave ring from the wave's middle, a second ring behind it on the heavy wave. */
export function paintRootletRing(ctx, footprint, look) {
    if (look.reduced) return;
    const weight = weightOf(look), p = Math.max(1, Math.round(footprint.tileH / 13)), { x, y } = footprint.centerPoint;
    ctx.save();
    for (const delay of look.outer ? [0, 70] : [0]) {
        const u = (look.age - delay) / weight.ringMs;
        if (u < 0 || u >= 1) continue;
        paintRing(ctx, { cx: x, cy: y, r: footprint.tileW * (0.35 + (weight.ring - 0.35) * easeOut(u)), squash: footprint.tileH / footprint.tileW,
            alpha: (1 - u) ** 1.3 * (delay ? 0.6 : 1), thick: u < 0.4 ? 2 : 1, core: RING.core, light: RING.light, p });
    }
    ctx.restore();
}

function makeChunk(random, { tileW, tileH }, weight) {
    const angle = random() * Math.PI * 2, speed = tileW * (1 + random() * 2.2);
    return { dx: (random() - 0.5) * tileW * 0.6, dy: (random() - 0.5) * tileH * 0.5, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed * 0.55,
        vz: tileH * (weight.lift + random() * 7), size: 1 + (random() < 0.55 ? 1 : 0), tone: Math.floor(random() * 4), delay: random() * 0.03 };
}

function makeSpark(random, { tileW }) {
    const angle = -Math.PI / 2 + (random() - 0.5) * 2.6, speed = tileW * (3 + random() * 4);
    return { dx: (random() - 0.5) * tileW * 0.3, dy: 0, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, delay: random() * 0.03,
        life: 0.16 + random() * 0.16 };
}

function makePuff(random, { tileW, tileH }, weight) {
    return { dx: (random() - 0.5) * tileW * 0.6, dy: (random() - 0.5) * tileH * 0.3, vx: (random() - 0.5) * tileW * 0.9,
        vy: (random() - 0.65) * tileH * 0.35, r0: tileW * 0.18, r1: tileW * (weight.lift > 10 ? 0.75 : 0.55), delay: 0.02 + random() * 0.08,
        life: weight.dustMs / 1000 * (0.75 + random() * 0.25) };
}

/** Dust pushed up out of the cell: puffs that rise and spread, giving the hit its height. */
function makePlume(random, { tileW, tileH }, weight) {
    return { dx: (random() - 0.5) * tileW * 0.4, dy: -tileH * 0.2, vx: (random() - 0.5) * tileW * 0.5, vy: -tileH * (1.2 + random() * (weight.plume > 2 ? 1.4 : 0.8)),
        r0: tileW * 0.14, r1: tileW * (0.4 + random() * 0.25), delay: 0.03 + random() * 0.08, life: weight.dustMs / 1000 * (0.7 + random() * 0.3) };
}

function makeEmber(random, { tileW, tileH }) {
    return { dx: (random() - 0.5) * tileW * 0.7, dy: (random() - 0.5) * tileH * 0.4, rise: tileH * (0.9 + random() * 0.8), sway: 1 + random() * 3,
        freq: 1.5 + random() * 1.5, phase: random() * 6.28, delay: 0.08 + random() * 0.28, life: 0.6 + random() * 0.5 };
}

/** One struck cell's particles at `t` seconds after the hit. */
function paintCellBurst(ctx, { point, size, key }, look) {
    const weight = weightOf(look), p = look.p, at = { x: point.x, y: point.y, t: look.age / 1000, p };
    const made = kind => `${key}:${kind}:${point.gx}:${point.gy}:${size.tileW}`;
    paintDust(ctx, emitter(made('dust'), weight.dust, random => makePuff(random, size, weight)), { ...at, colour: DUST, alpha: 0.7, squash: 0.62 });
    paintDust(ctx, emitter(made('plume'), weight.plume, random => makePlume(random, size, weight)), { ...at, colour: DUST, alpha: 0.55, squash: 1.1 });
    paintDebris(ctx, emitter(made('debris'), weight.debris, random => makeChunk(random, size, weight)),
        { ...at, g: size.tileH * 80, drag: 3.5, life: weight.dustMs > 600 ? 0.85 : 0.6, tones: SOIL, shadow: SOIL[0], highlight: '#c8a07c' });
    paintSparks(ctx, emitter(made('sparks'), weight.sparks, random => makeSpark(random, size)), { ...at, drag: 7, gravity: size.tileH * 25, tones: SPARK });
    paintEmbers(ctx, emitter(made('embers'), weight.embers, random => makeEmber(random, size)), { ...at, tones: EMBER, glow: '#8a3c14' });
}

/**
 * Under the actors, after the cracks: what every struck cell throws out, from the hit until ROOTLET_PARTICLE_MS.
 * @param {{age:number, outer:boolean, reduced:boolean, key:string}} look age in visual ms since the hit; key: this hit (its start)
 */
export function paintRootletParticles(ctx, footprint, look) {
    if (look.reduced || look.age < 0 || look.age >= ROOTLET_PARTICLE_MS) return;
    const size = { tileW: footprint.tileW, tileH: footprint.tileH }, p = Math.max(1, Math.round(footprint.tileH / 13));
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const point of footprint.points) paintCellBurst(ctx, { point, size, key: look.key }, { ...look, p });
    ctx.restore();
}
